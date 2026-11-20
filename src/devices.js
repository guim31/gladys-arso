// -----------------------------------------------------------------------------
// The two devices of the integration, and the states they publish.
//
//   - station: the last reading of one ARSO automatic station (external id
//     from the ARSO station id, lowercased, e.g. ljubl-ana_bezigrad); only the
//     measures the station takes, plus the features already added in Gladys,
//     so that a missing reading never removes a feature;
//   - place: the regional forecast and the warnings of the area at the house
//     (external id from the coordinates rounded to 0.01°, about 1 km).
//
// Feature keys are forever (Gladys keys history, scenes and dashboards on
// them). Everything is read-only: ARSO is a data source, nothing to drive.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as C,
  DEVICE_FEATURE_UNITS as U,
} from '@gladysassistant/integration-sdk';
import { FEATURE_NAMES, TEXT, conditionName, formatWhen, warningLabel } from './i18n.js';
import { forecastDays, warningLevels, warningsAhead } from './arso/model.js';

/** Device types (first part of the external ids): forever. */
export const DEVICE_TYPES = { STATION: 'station', PLACE: 'place' };

const sensor = (category, type, unit, min, max) => ({ category, type, unit, min, max });

/** Features of the station device, by key: forever. */
export const STATION_FEATURES = {
  temperature: sensor(C.TEMPERATURE_SENSOR, 'decimal', U.CELSIUS, -50, 50),
  dew_point: sensor(C.TEMPERATURE_SENSOR, 'decimal', U.CELSIUS, -50, 50),
  humidity: sensor(C.HUMIDITY_SENSOR, 'decimal', U.PERCENT, 0, 100),
  pressure: sensor(C.PRESSURE_SENSOR, 'decimal', U.HECTO_PASCAL, 900, 1100),
  wind_speed: sensor(C.SPEED_SENSOR, 'decimal', U.KILOMETER_PER_HOUR, 0, 250),
  wind_gust: sensor(C.SPEED_SENSOR, 'decimal', U.KILOMETER_PER_HOUR, 0, 250),
  wind_direction: sensor(C.ANGLE_SENSOR, 'integer', U.DEGREE, 0, 360),
  rain_rate: sensor(C.PRECIPITATION_SENSOR, 'decimal', U.MILLIMETER_PER_HOUR, 0, 200),
  snow_depth: sensor(C.DISTANCE_SENSOR, 'decimal', U.CM, 0, 1000),
};

const level = () => ({ category: C.RISK, type: 'integer', min: 0, max: 3 });
const textFeature = () => ({ category: C.TEXT, type: 'text', min: 0, max: 0 });

/** Warning types with their own feature (the others count in warning_level). */
export const FEATURE_WARNING_TYPES = [
  'wind',
  'rain',
  'thunderstorm',
  'snow_ice',
  'ice',
  'heat',
  'cold',
  'forest_fire',
];

/** Features of the place device, by key: forever. */
export const PLACE_FEATURES = {
  condition: textFeature(),
  today_min: sensor(C.TEMPERATURE_SENSOR, 'min', U.CELSIUS, -50, 50),
  today_max: sensor(C.TEMPERATURE_SENSOR, 'max', U.CELSIUS, -50, 50),
  tomorrow_condition: textFeature(),
  tomorrow_min: sensor(C.TEMPERATURE_SENSOR, 'min', U.CELSIUS, -50, 50),
  tomorrow_max: sensor(C.TEMPERATURE_SENSOR, 'max', U.CELSIUS, -50, 50),
  tomorrow_gust: sensor(C.SPEED_SENSOR, 'decimal', U.KILOMETER_PER_HOUR, 0, 250),
  warning_level: level(),
  ...Object.fromEntries(FEATURE_WARNING_TYPES.map((type) => [`warning_${type}`, level()])),
  warnings: textFeature(),
};

/** Platform id of the place device: the coordinates in hundredths of a degree. */
export const placePlatformId = (lat, lon) => `${Math.round(lat * 100)}_${Math.round(lon * 100)}`;

/** Platform id of a station device. */
export const stationPlatformId = (station) => station.id.toLowerCase();

/** The feature keys of a device created in Gladys (empty when none). */
export function featureKeysOf(device) {
  return (device?.features ?? [])
    .map((feature) => String(feature.external_id ?? '').slice(device.external_id.length + 1))
    .filter((key) => key in STATION_FEATURES);
}

function buildFeatures(ids, definitions, keys, language) {
  return keys.map((key) => {
    const definition = definitions[key];
    return {
      name: FEATURE_NAMES[language][key],
      external_id: ids.feature(key),
      category: definition.category,
      type: definition.type,
      ...(definition.unit ? { unit: definition.unit } : {}),
      // Display bounds of the gauges; the core never clamps a state on them.
      min: definition.min,
      max: definition.max,
      read_only: true,
      has_feedback: false,
      keep_history: true,
    };
  });
}

/**
 * The devices to publish. Polling: the container refreshes the data itself
 * (src/poller.js); the core's onPoll, once a minute, is only a fallback.
 * @param {object} gladys
 * @param {{ station: object | null, place: { lat: number, lon: number, name: string } | null, language: string }} target
 */
export function buildDevices(gladys, { station, place, language }) {
  const devices = [];
  if (station) {
    const ids = gladys.externalIds(DEVICE_TYPES.STATION, stationPlatformId(station));
    // Measured keys, in the order of STATION_FEATURES.
    const keys = Object.keys(STATION_FEATURES).filter((key) =>
      (station.features ?? Object.keys(STATION_FEATURES)).includes(key),
    );
    devices.push({
      name: `ARSO ${station.name}`,
      external_id: ids.device,
      model: 'Automatic station',
      should_poll: true,
      poll_frequency: 60000,
      features: buildFeatures(ids, STATION_FEATURES, keys, language),
      params: [
        { name: 'station_id', value: station.id },
        { name: 'altitude', value: String(station.altitude ?? '') },
      ],
    });
  }
  if (place) {
    const ids = gladys.externalIds(DEVICE_TYPES.PLACE, placePlatformId(place.lat, place.lon));
    devices.push({
      name: `ARSO ${place.name}`,
      external_id: ids.device,
      model: 'Forecast & warnings',
      should_poll: true,
      poll_frequency: 60000,
      features: buildFeatures(ids, PLACE_FEATURES, Object.keys(PLACE_FEATURES), language),
    });
  }
  return devices;
}

const state = (ids, key, value) =>
  value === null || value === undefined
    ? null
    : { device_feature_external_id: ids.feature(key), state: value };

const text = (ids, key, value) =>
  typeof value === 'string' && value.trim() !== ''
    ? { device_feature_external_id: ids.feature(key), text: value.slice(0, 250) }
    : null;

/** States of the station device from its reading (values already converted). */
export function stationStates(gladys, station, reading) {
  const ids = gladys.externalIds(DEVICE_TYPES.STATION, stationPlatformId(station));
  const keys = station.features ?? Object.keys(STATION_FEATURES);
  return keys.map((key) => state(ids, key, reading.values[key])).filter(Boolean);
}

/** One line per warning not over yet, soonest first. */
export function warningsSummary(warnings, now, language, timeZone) {
  const ahead = warningsAhead(warnings, now);
  if (ahead.length === 0) {
    return null;
  }
  return ahead
    .map((warning) => {
      const inForce = warning.start <= now;
      const when = inForce
        ? `→ ${formatWhen(warning.end, language, timeZone, now)}`
        : `${formatWhen(warning.start, language, timeZone, now)} → ${formatWhen(warning.end, language, timeZone, now)}`;
      return `${warningLabel(warning, language)} ${when}`;
    })
    .join(' | ');
}

/**
 * States of the place device.
 * @param {object} data `{ region?, warnings? }`, each the last parsed answer
 */
export function placeStates(gladys, place, { region, warnings }, { now, language, timeZone }) {
  const ids = gladys.externalIds(DEVICE_TYPES.PLACE, placePlatformId(place.lat, place.lon));
  const states = [];
  if (region) {
    const { today, tomorrow } = forecastDays(region, now, timeZone);
    states.push(
      text(ids, 'condition', today && conditionName(today.condition, language)),
      state(ids, 'today_min', today?.min),
      state(ids, 'today_max', today?.max),
      text(ids, 'tomorrow_condition', tomorrow && conditionName(tomorrow.condition, language)),
      state(ids, 'tomorrow_min', tomorrow?.min),
      state(ids, 'tomorrow_max', tomorrow?.max),
      state(ids, 'tomorrow_gust', tomorrow?.gust),
    );
  }
  if (warnings) {
    const levels = warningLevels(warnings.warnings, now);
    states.push(state(ids, 'warning_level', levels.overall));
    for (const type of FEATURE_WARNING_TYPES) {
      states.push(state(ids, `warning_${type}`, levels.byType[type]));
    }
    states.push(
      text(
        ids,
        'warnings',
        warningsSummary(warnings.warnings, now, language, timeZone) ?? TEXT.noWarning[language],
      ),
    );
  }
  return states.filter(Boolean);
}
