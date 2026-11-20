// -----------------------------------------------------------------------------
// The ARSO service: where the data is read (location, station, region, warning
// area), when it is read (each source at its own pace), and what Gladys
// receives (devices, states, "new warning" scene events, connection status).
//
// Pace of the sources, all public and without key (see docs, "Limits"):
//   - observations of every station (one file): every cycle (10 min default);
//   - warnings of the area of the house (one file): every cycle;
//   - the polygons of the five warning areas: at setup, then once a day;
//   - regional forecast (one file): once an hour (ARSO updates it twice a day).
// About 13 requests an hour at the default pace.
// -----------------------------------------------------------------------------

import { WARNING_AREAS } from './arso/client.js';
import {
  WARNING_LEVELS,
  areaOf,
  nearest,
  parseForecast,
  parseObservations,
  parseWarnings,
} from './arso/model.js';
import { buildDevices, featureKeysOf, placeStates, stationStates } from './devices.js';
import { TEXT, WARNING_LEVEL_NAMES, WARNING_TYPE_NAMES, formatWhen } from './i18n.js';
import { createIssueLog } from './issues.js';

/** Scene trigger key: forever. */
export const WARNING_TRIGGER = 'warning_issued';

const HOUR = 3600 * 1000;
export const AREAS_MAX_AGE = 24 * HOUR;
export const FORECAST_MAX_AGE = 55 * 60 * 1000;
// A station silent for this long is down: its last values are not re-sent.
export const OBSERVATION_MAX_AGE = 3 * HOUR;
// An unchanged value is re-sent this often, so Gladys never shows it as stale.
export const HEARTBEAT = 6 * HOUR;
// Warnings remembered after their end, so a late echo does not fire again.
const SEEN_RETENTION = 48 * HOUR;
// Farther than this from every warning area, the place is not in Slovenia.
export const MAX_DISTANCE_KM = 25;

const formatCoordinates = (lat, lon) => `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

/**
 * @param {object} options
 * @param {object} options.gladys GladysIntegration (or the SDK's fake Gladys)
 * @param {ReturnType<import('./arso/client.js').createArsoClient>} options.client
 * @param {{ load: Function, save: Function }} options.store
 * @param {object} options.logger
 * @param {() => object} options.getConfig the current normalized config
 * @param {() => number} options.now
 * @param {string} [options.timeZone] IANA zone of Gladys (TZ), system zone if unset
 */
export function createService({ gladys, client, store, logger, getConfig, now, timeZone }) {
  const issues = createIssueLog(logger);
  let stations = null; // { list, at }: the last observation file
  let areas = null; // { list: [{ key, polygons }], at }
  let target = null; // { station, place, area, problem }
  let forecast = null; // { region, at }
  let warnings = null; // { data, at }
  let seen; // { [warning id]: { level, end } }, undefined until loaded
  let lastStatus = null;
  // The last error of each failing source, for the check action.
  const lastErrors = new Map();

  async function readStations() {
    stations = { list: parseObservations(await client.observations()), at: now() };
    return stations.list;
  }

  /** The polygons of the five areas; the warnings of each come with them. */
  async function loadAreas() {
    if (areas && now() - areas.at < AREAS_MAX_AGE) {
      return areas;
    }
    try {
      const list = [];
      const data = {};
      for (const key of WARNING_AREAS) {
        data[key] = parseWarnings(await client.warnings(key));
        list.push({ key, polygons: data[key].area.polygons });
      }
      areas = { list, data, at: now() };
      issues.ok('areas', 'Warning areas: ARSO answers again');
    } catch (err) {
      issues.fail('areas', `Warning areas unavailable (${err.message})`);
      // Stale polygons stay better than none.
      if (!areas) {
        throw err;
      }
    }
    return areas;
  }

  /** The location from the config or a Gladys house, or a configuration problem. */
  async function resolveLocation(config) {
    if (config.coordinatesInvalid) {
      return { problem: 'coordinatesInvalid' };
    }
    if (config.latitude !== null) {
      return {
        place: {
          lat: config.latitude,
          lon: config.longitude,
          name: formatCoordinates(config.latitude, config.longitude),
          source: 'coordinates',
        },
      };
    }
    const houses = await gladys.getHouses();
    const located = houses.filter((house) => house.latitude !== null && house.longitude !== null);
    if (config.house) {
      const house = located.find((candidate) => candidate.selector === config.house);
      if (!house) {
        return { problem: 'houseNotFound' };
      }
      return {
        place: { lat: house.latitude, lon: house.longitude, name: house.name, source: 'house' },
      };
    }
    const house = located[0];
    return house
      ? { place: { lat: house.latitude, lon: house.longitude, name: house.name, source: 'house' } }
      : { place: null };
  }

  /** The feature keys a station device publishes: measured now, or already added. */
  function stationFeatureKeys(station) {
    const ids = gladys.externalIds('station', station.id.toLowerCase());
    const created = (gladys.devices ?? []).find((device) => device.external_id === ids.device);
    return [...new Set([...Object.keys(station.values), ...featureKeysOf(created)])];
  }

  /**
   * Work out the station, the place and its warning area from the config,
   * then publish the devices. Throws when ARSO or Gladys does not answer
   * (retried at the next cycle); a configuration problem is in `target.problem`.
   */
  async function setup() {
    const config = getConfig();
    if (config.stationIdInvalid) {
      target = { station: null, place: null, area: null, problem: 'stationIdInvalid' };
      return target;
    }
    const location = await resolveLocation(config);
    if (location.problem) {
      target = { station: null, place: null, area: null, problem: location.problem };
      return target;
    }
    let place = location.place;
    if (!place && !config.stationId) {
      target = { station: null, place: null, area: null, problem: 'notConfigured' };
      return target;
    }
    const list = await readStations();
    let station;
    let problem = null;
    if (config.stationId) {
      station = list.find((candidate) => candidate.id === config.stationId) ?? null;
      if (!station) {
        problem = 'stationUnknown';
      }
    } else {
      [station] = nearest(list, place.lat, place.lon, 1);
    }
    if (!place && station) {
      // No house located, no coordinates: the forecast is the station's.
      place = { lat: station.lat, lon: station.lon, name: station.name, source: 'station' };
    }
    let area = null;
    if (place) {
      const { list: areaList } = await loadAreas();
      const found = areaOf(areaList, place.lat, place.lon);
      if (!found || found.distance > MAX_DISTANCE_KM) {
        problem = 'outsideArea';
        place = null;
        if (!config.stationId) {
          station = null;
        }
      } else {
        area = found.key;
        warnings = { data: areas.data[area], at: areas.at };
      }
    }
    if (station) {
      station = {
        id: station.id,
        name: station.name,
        lat: station.lat,
        lon: station.lon,
        altitude: station.altitude,
        features: stationFeatureKeys(station),
      };
    }
    target = { station, place, area, problem };
    logger.info(
      `Ready: ${station ? `station ${station.id}` : 'no station'}, ` +
        `${place ? `forecast and warnings (area ${area}) for ${place.source === 'house' ? `house "${place.name}"` : `the ${place.source}`}` : 'no forecast'}` +
        `${problem ? ` (${problem})` : ''}`,
    );
    await gladys.publishDiscoveredDevices(
      buildDevices(gladys, { ...target, language: config.language }),
    );
    return target;
  }

  /** The current reading of the target station, from the last observation file. */
  function observation() {
    if (!target?.station || !stations) {
      return null;
    }
    const found = stations.list.find((candidate) => candidate.id === target.station.id);
    return found ? { time: found.time, values: found.values } : null;
  }

  async function readForecast() {
    const regions = parseForecast(await client.forecast());
    const [region] = nearest(regions, target.place.lat, target.place.lon, 1);
    forecast = { region, at: now() };
    return region;
  }

  async function readWarnings() {
    warnings = { data: parseWarnings(await client.warnings(target.area)), at: now() };
    return warnings.data;
  }

  /** Run one source, logging a lasting failure once; resolves true on success. */
  async function attempt(key, label, read) {
    try {
      await read();
      lastErrors.delete(key);
      issues.ok(key, `${label}: ARSO answers again`);
      return true;
    } catch (err) {
      lastErrors.set(key, err.message);
      issues.fail(key, `${label} unavailable (${err.message})`);
      return false;
    }
  }

  async function reportStatus(connected, message) {
    const next = JSON.stringify({ connected, message });
    if (next === lastStatus) {
      return;
    }
    lastStatus = next;
    await gladys.setConnectionStatus(connected, message);
  }

  /** The states of the devices the user added to Gladys. */
  function currentStates() {
    if (!target) {
      return [];
    }
    const config = getConfig();
    const created = new Set((gladys.devices ?? []).map((device) => device.external_id));
    const states = [];
    const { station, place } = target;
    const reading = observation();
    if (
      station &&
      reading &&
      created.has(gladys.externalIds('station', station.id.toLowerCase()).device) &&
      reading.time !== null &&
      now() - reading.time < OBSERVATION_MAX_AGE
    ) {
      states.push(...stationStates(gladys, station, reading));
    }
    if (place) {
      const ids = buildDevices(gladys, { station: null, place, language: config.language })[0];
      if (created.has(ids.external_id)) {
        states.push(
          ...placeStates(
            gladys,
            place,
            { region: forecast?.region, warnings: warnings?.data },
            { now: now(), language: config.language, timeZone },
          ),
        );
      }
    }
    return states;
  }

  async function publishStates() {
    const states = currentStates();
    if (states.length === 0) {
      return;
    }
    const result = await gladys.publishChangedStates(states, { heartbeat: HEARTBEAT });
    logger.debug(`${result.count} state(s) published`);
  }

  /**
   * Fire the scene trigger for every warning not announced yet, or whose
   * level rose. The very first run only takes note of the warnings: a fresh
   * install does not fire for warnings issued before it.
   */
  async function announceWarnings() {
    if (!warnings || !target?.place) {
      return;
    }
    if (seen === undefined) {
      const saved = await store.load();
      seen = saved?.seen ?? null;
    }
    const baseline = seen === null;
    const next = { ...(seen ?? {}) };
    const fresh = [];
    for (const warning of warnings.data.warnings) {
      if (warning.end <= now()) {
        continue;
      }
      const previous = next[warning.id];
      if (!previous || warning.level > previous.level) {
        fresh.push({ warning, update: Boolean(previous) });
      }
      next[warning.id] = { level: Math.max(warning.level, previous?.level ?? 0), end: warning.end };
    }
    for (const [id, entry] of Object.entries(next)) {
      if (entry.end < now() - SEEN_RETENTION) {
        delete next[id];
      }
    }
    const changed = JSON.stringify(next) !== JSON.stringify(seen);
    seen = next;
    if (changed) {
      await store
        .save({ seen })
        .catch((err) => issues.fail('store', `Cannot write /data (${err.message})`));
    }
    if (baseline) {
      logger.debug(`${fresh.length} warning(s) noted, first run: no scene event`);
      return;
    }
    const language = getConfig().language;
    for (const { warning, update } of fresh) {
      const levelKey = WARNING_LEVELS[warning.level];
      logger.info(`New warning: ${levelKey} ${warning.type}${update ? ' (level raised)' : ''}`);
      await gladys
        .publishSceneEvent(WARNING_TRIGGER, {
          warning_type: warning.type,
          level: levelKey,
          level_number: warning.level,
          type_label:
            WARNING_TYPE_NAMES[language][warning.type] ?? WARNING_TYPE_NAMES[language].other,
          level_label: WARNING_LEVEL_NAMES[language][levelKey],
          starts_at: formatWhen(warning.start, language, timeZone, now()),
          ends_at: formatWhen(warning.end, language, timeZone, now()),
          in_force: warning.start <= now(),
          is_update: update,
          description: (warning.text || warning.event).slice(0, 1000),
          area: warnings.data.area.name,
        })
        .catch((err) => logger.error(`Scene event refused (${err.message})`));
    }
  }

  return {
    /** Forget everything read: the config changed. */
    reset() {
      target = null;
      forecast = null;
      warnings = null;
      lastStatus = null;
    },

    /**
     * One refresh: setup if needed, read the sources that are due, publish
     * the states, announce the new warnings, report the status.
     * @returns {Promise<boolean>} whether a source answered
     */
    async cycle({ forceForecast = false } = {}) {
      let fresh = false;
      if (!target) {
        try {
          await setup();
          fresh = true;
        } catch (err) {
          lastErrors.set('setup', err.message);
          issues.fail('setup', `Setup failed (${err.message})`);
          await reportStatus(false, TEXT.unreachable);
          return false;
        }
        lastErrors.delete('setup');
        issues.ok('setup', 'Setup done: ARSO answers again');
      } else if (target.place && areas && now() - areas.at >= AREAS_MAX_AGE) {
        await loadAreas().catch(() => {});
      }
      const { station, place, problem } = target;
      if (!station && !place) {
        await reportStatus(false, TEXT[problem ?? 'notConfigured']);
        return false;
      }
      const results = [];
      if (station) {
        // Setup has just read the observation file.
        results.push(fresh ? true : await attempt('observation', 'Observations', readStations));
        if (fresh) {
          lastErrors.delete('observation');
        }
      }
      if (place) {
        if (forceForecast || !forecast || now() - forecast.at >= FORECAST_MAX_AGE) {
          results.push(await attempt('forecast', 'Forecast', readForecast));
        }
        // Setup has just read the warnings of every area.
        results.push(fresh ? true : await attempt('warnings', 'Warnings', readWarnings));
      }
      await publishStates();
      await announceWarnings();
      const anyOk = results.some(Boolean);
      if (problem) {
        await reportStatus(false, TEXT[problem]);
      } else {
        await reportStatus(anyOk, anyOk ? undefined : TEXT.unreachable);
      }
      return anyOk;
    },

    publishStates,

    /** Publish the devices again (a scan request). */
    async publishDevices() {
      if (target) {
        await gladys.publishDiscoveredDevices(
          buildDevices(gladys, { ...target, language: getConfig().language }),
        );
      }
    },

    /** Whether a device belongs to the current target. */
    owns(externalId) {
      if (!target) {
        return false;
      }
      return buildDevices(gladys, { ...target, language: getConfig().language }).some(
        (device) => device.external_id === externalId,
      );
    },

    /** Everything the widget shows; `title` is the name the user gave in Gladys. */
    snapshot() {
      let title = target?.place?.name ?? target?.station?.name ?? null;
      if (target) {
        const own = buildDevices(gladys, { ...target, language: getConfig().language });
        const named = own
          .map((device) => (gladys.devices ?? []).find((d) => d.external_id === device.external_id))
          .find((device) => device?.name);
        title = named?.name ?? title;
      }
      return {
        title,
        target,
        observation: observation(),
        region: forecast?.region ?? null,
        warnings: warnings?.data ?? null,
      };
    },

    /** The `count` stations nearest to the location. */
    async nearest(count) {
      const config = getConfig();
      const location = await resolveLocation(config);
      if (location.problem || !location.place) {
        return { problem: location.problem ?? 'notConfigured' };
      }
      const list = await readStations();
      return {
        place: location.place,
        stations: nearest(list, location.place.lat, location.place.lon, count).map((station) => ({
          ...station,
          distance: Math.round(station.distance * 10) / 10,
          altitude: station.altitude === null ? '?' : Math.round(station.altitude),
        })),
      };
    },

    /** Read every source now (configuration action). */
    async check() {
      target = null;
      forecast = null;
      areas = null;
      lastStatus = null;
      lastErrors.clear();
      await this.cycle({ forceForecast: true });
      return { ...this.snapshot(), errors: Object.fromEntries(lastErrors) };
    },
  };
}
