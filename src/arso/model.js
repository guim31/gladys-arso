// -----------------------------------------------------------------------------
// ARSO XML payloads → plain values. Pure functions, no I/O: the formats are
// pinned by the real files of test/fixtures (recorded on 20 November 2026).
//
// The ARSO files are flat (one <metData> per station or region and day, one
// <info> per CAP warning): a few regular expressions read them, no XML
// dependency needed in a 256 MB sandbox.
// -----------------------------------------------------------------------------

const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decode the XML entities ARSO uses (&#382; for ž, &amp;...). */
export function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === '#') {
      const code =
        name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name] ?? whole;
  });
}

const escapeTag = (tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The inner XML of every `<tag>…</tag>` (self-closed tags are skipped). */
export function blocks(xml, tag) {
  const pattern = new RegExp(
    `<${escapeTag(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeTag(tag)}>`,
    'g',
  );
  return [...xml.matchAll(pattern)].map((match) => match[1]);
}

/** The decoded, trimmed text of the first `<tag>`, null when absent or empty. */
export function field(xml, tag) {
  const match = xml.match(new RegExp(`<${escapeTag(tag)}>([^<]*)</${escapeTag(tag)}>`));
  if (!match) {
    return null;
  }
  const text = decode(match[1]).trim();
  return text === '' ? null : text;
}

/** A number field, null when absent, empty or unreadable. */
export function numberField(xml, tag) {
  const text = field(xml, tag);
  if (text === null) {
    return null;
  }
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/** "20.11.2026 21:00 UTC" → epoch ms; null when unreadable. */
export function parseUtc(text) {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4}) (\d{1,2}):(\d{2}) UTC$/.exec(text ?? '');
  if (!match) {
    return null;
  }
  const [, day, month, year, hour, minute] = match.map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

/** "20.11.2026 13:00 CET" → "2026-11-20" (the local Slovenian date). */
export function parseLocalDate(text) {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(text ?? '');
  if (!match) {
    return null;
  }
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

/** "LJUBL-ANA_BEZIGRAD_" or "ljubl-ana_bezigrad" → "LJUBL-ANA_BEZIGRAD". */
export const stationKey = (raw) =>
  String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/_+$/, '');

/** What a typed station id may look like (ARSO ids: letters, digits, - and _). */
export const STATION_ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,39}$/;

const kmh = (ms) => (ms === null ? null : round(ms * 3.6));

/**
 * Every automatic station of observationAms_si_latest.xml with its last
 * reading. Values in the units the features publish; a measure the station
 * does not take (or did not send) is left out.
 * @returns {Array<{ id: string, name: string, lat: number, lon: number, altitude: number | null, time: number | null, values: Record<string, number> }>}
 */
export function parseObservations(xml) {
  if (typeof xml !== 'string' || !xml.includes('<metData>')) {
    throw new Error('observations without any station');
  }
  const stations = [];
  for (const block of blocks(xml, 'metData')) {
    const id = stationKey(field(block, 'domain_meteosiId'));
    const lat = numberField(block, 'domain_lat');
    const lon = numberField(block, 'domain_lon');
    if (!id || lat === null || lon === null) {
      continue;
    }
    // Sum of the interval (10 min, sometimes 30 or 60) → an intensity in mm/h.
    const start = parseUtc(field(block, 'validStart'));
    const end = parseUtc(field(block, 'validEnd'));
    const rain = numberField(block, 'rr_val');
    const hours = start !== null && end !== null && end > start ? (end - start) / 3600000 : null;
    const direction = numberField(block, 'dd_val') ?? numberField(block, 'ddavg_val');
    const candidates = {
      temperature: numberField(block, 't'),
      dew_point: numberField(block, 'td'),
      humidity: numberField(block, 'rh'),
      pressure: numberField(block, 'msl'),
      wind_speed: kmh(numberField(block, 'ff_val') ?? numberField(block, 'ffavg_val')),
      wind_gust: kmh(numberField(block, 'ffmax_val')),
      wind_direction: direction === null ? null : Math.round(direction) % 360,
      rain_rate: rain !== null && hours ? round(rain / hours) : null,
      snow_depth: numberField(block, 'snow'),
    };
    const values = Object.fromEntries(
      Object.entries(candidates).filter(([, value]) => value !== null),
    );
    const issued = Date.parse(field(block, 'tsValid_issued_RFC822') ?? '');
    stations.push({
      id,
      name: field(block, 'domain_longTitle') ?? field(block, 'domain_title') ?? id,
      lat,
      lon,
      altitude: numberField(block, 'domain_altitude'),
      time: Number.isFinite(issued) ? issued : end,
      values,
    });
  }
  if (stations.length === 0) {
    throw new Error('observations without any station');
  }
  return stations;
}

/** Great-circle distance in km. */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** The `count` places nearest to a point, each with its `distance` in km. */
export function nearest(places, lat, lon, count = 1) {
  return places
    .map((place) => ({ ...place, distance: distanceKm(lat, lon, place.lat, place.lon) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

/** "overcast_modRA" → { sky: 'overcast', intensity: 'mod', weather: 'RA' }. */
export function parseCondition(icon) {
  if (!icon) {
    return { sky: null, intensity: null, weather: null };
  }
  const [sky, phenomenon] = icon.split('_');
  const match = /^(light|mod|heavy)?([A-Z]+)$/.exec(phenomenon ?? '');
  return {
    sky: sky || null,
    intensity: match?.[1] ?? null,
    weather: match?.[2] ?? null,
  };
}

/**
 * The regional daily forecast (forecast_si_latest.xml, English): one entry per
 * region, its days sorted. `min`/`max` are the forecaster's when given
 * (METEO_FCAST: tn/tx), the model's otherwise (METEO_MODEL: tnsyn/txsyn).
 * @returns {Array<{ id: string, name: string, lat: number, lon: number, days: Array<{ date: string, min: number | null, max: number | null, condition: object, wind: number | null, gust: number | null }> }>}
 */
export function parseForecast(xml) {
  if (typeof xml !== 'string' || !xml.includes('<metData>')) {
    throw new Error('forecast without any region');
  }
  const regions = new Map();
  for (const block of blocks(xml, 'metData')) {
    const id = stationKey(field(block, 'domain_meteosiId'));
    const lat = numberField(block, 'domain_lat');
    const lon = numberField(block, 'domain_lon');
    const date = parseLocalDate(field(block, 'valid'));
    if (!id || lat === null || lon === null || !date) {
      continue;
    }
    if (!regions.has(id)) {
      regions.set(id, {
        id,
        name: field(block, 'domain_shortTitle') ?? field(block, 'domain_title') ?? id,
        lat,
        lon,
        days: [],
      });
    }
    regions.get(id).days.push({
      date,
      min: numberField(block, 'tn') ?? numberField(block, 'tnsyn'),
      max: numberField(block, 'tx') ?? numberField(block, 'txsyn'),
      condition: parseCondition(field(block, 'nn_icon-wwsyn_icon') ?? field(block, 'nn_icon')),
      wind: kmh(numberField(block, 'ff_val')),
      gust: kmh(numberField(block, 'ffmax_val')),
    });
  }
  if (regions.size === 0) {
    throw new Error('forecast without any region');
  }
  const list = [...regions.values()];
  for (const region of list) {
    region.days.sort((a, b) => a.date.localeCompare(b.date));
  }
  return list;
}

/** Local calendar day (YYYY-MM-DD) of an instant, in the Gladys time zone. */
export function localDay(time, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(time));
}

/** Today's and tomorrow's forecast of a region, null when not published. */
export function forecastDays(region, now, timeZone) {
  const today = localDay(now, timeZone);
  // The next calendar day, not now + 24 h: a DST night has 23 or 25 hours.
  const [year, month, date] = today.split('-').map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
  const day = (date) => region?.days.find((entry) => entry.date === date) ?? null;
  return { today: day(today), tomorrow: day(tomorrow), all: region?.days ?? [] };
}

/**
 * Warning types of the CAP files (`awareness_type`, Meteoalarm vocabulary)
 * with stable English keys. Their order is the order of the scene filter.
 */
export const WARNING_TYPES = {
  wind: 'wind',
  rain: 'rain',
  thunderstorm: 'thunderstorm',
  'snow-ice': 'snow_ice',
  ice: 'ice',
  'high-temperature': 'heat',
  'low-temperature': 'cold',
  'forest-fire': 'forest_fire',
  fog: 'fog',
  avalanches: 'avalanche',
  coastalevent: 'coastal',
  flooding: 'flood',
  'rain-flood': 'flood',
};
export const WARNING_TYPE_KEYS = [...new Set(Object.values(WARNING_TYPES))];

/** Warning levels: CAP awareness 2 yellow, 3 orange, 4 red (1 green = none). */
export const WARNING_LEVELS = { 1: 'yellow', 2: 'orange', 3: 'red' };
export const WARNING_LEVEL_KEYS = Object.values(WARNING_LEVELS);

function parsePolygons(xml) {
  return blocks(xml, 'polygon')
    .map((text) =>
      text
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map(Number))
        .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon)),
    )
    .filter((points) => points.length >= 3);
}

/**
 * One CAP file of a warning area. The English infos are read (ARSO writes
 * each warning in Slovenian and English); level 1 (green) means "no warning"
 * and is left out.
 * @returns {{ area: { id: string, name: string, polygons: number[][][] }, sent: number | null, warnings: Array<{ id: string, type: string, level: number, start: number, end: number, event: string, text: string }> }}
 */
export function parseWarnings(xml) {
  if (typeof xml !== 'string' || !/<alert[\s>]/.test(xml)) {
    throw new Error('not a CAP alert');
  }
  const infos = blocks(xml, 'info');
  const english = infos.filter((info) => /^en/i.test(field(info, 'language') ?? ''));
  const chosen = english.length > 0 ? english : infos;
  const firstArea = blocks(chosen[0] ?? '', 'area')[0] ?? '';
  let areaId = null;
  for (const geocode of blocks(firstArea, 'geocode')) {
    if (field(geocode, 'valueName') === 'meteosiId') {
      areaId = stationKey(field(geocode, 'value'));
    }
  }
  const warnings = [];
  for (const info of chosen) {
    const parameters = Object.fromEntries(
      blocks(info, 'parameter').map((parameter) => [
        field(parameter, 'valueName'),
        field(parameter, 'value') ?? '',
      ]),
    );
    const awareness = parseInt(parameters.awareness_level, 10);
    const level = awareness - 1;
    const typeName = (parameters.awareness_type ?? '').split(';')[1]?.trim();
    const start = Date.parse(field(info, 'onset') ?? field(info, 'effective') ?? '');
    const end = Date.parse(field(info, 'expires') ?? '');
    if (!WARNING_LEVELS[level] || !Number.isFinite(start) || !Number.isFinite(end)) {
      continue;
    }
    const type = WARNING_TYPES[typeName] ?? 'other';
    warnings.push({
      id: `${areaId ?? 'UNKNOWN'}:${type}@${new Date(start).toISOString()}`,
      type,
      level,
      start,
      end,
      event: field(info, 'event') ?? '',
      text: (field(info, 'description') ?? '').replace(/\s+/g, ' '),
    });
  }
  // One entry per id (two ARSO types can share a key, e.g. both floods): the highest level.
  const unique = new Map();
  for (const warning of warnings) {
    if (!unique.has(warning.id) || unique.get(warning.id).level < warning.level) {
      unique.set(warning.id, warning);
    }
  }
  warnings.length = 0;
  warnings.push(...unique.values());
  warnings.sort((a, b) => a.start - b.start || b.level - a.level);
  const sent = Date.parse(field(xml, 'sent') ?? '');
  return {
    area: {
      id: areaId ?? 'UNKNOWN',
      name: field(firstArea, 'areaDesc') ?? areaId ?? '',
      polygons: parsePolygons(firstArea),
    },
    sent: Number.isFinite(sent) ? sent : null,
    warnings,
  };
}

/** Ray casting: whether a point lies in a polygon of [lat, lon] points. */
export function inPolygon(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [latI, lonI] = polygon[i];
    const [latJ, lonJ] = polygon[j];
    if (latI > lat !== latJ > lat && lon < ((lonJ - lonI) * (lat - latI)) / (latJ - latI) + lonI) {
      inside = !inside;
    }
  }
  return inside;
}

/** Distance in km from a point to a segment (local flat projection, fine at this scale). */
function segmentDistanceKm(lat, lon, [lat1, lon1], [lat2, lon2]) {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 110.57;
  const [ax, ay] = [(lon1 - lon) * kx, (lat1 - lat) * ky];
  const [bx, by] = [(lon2 - lon) * kx, (lat2 - lat) * ky];
  const [dx, dy] = [bx - ax, by - ay];
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/**
 * The warning area of a point: the one whose polygon holds it, otherwise the
 * one with the nearest border (a house just across the border).
 * @param {Array<{ key: string, polygons: number[][][] }>} areas
 * @returns {{ key: string, distance: number } | null} distance 0 when inside
 */
export function areaOf(areas, lat, lon) {
  let best = null;
  for (const area of areas) {
    if (area.polygons.some((polygon) => inPolygon(lat, lon, polygon))) {
      return { key: area.key, distance: 0 };
    }
    for (const polygon of area.polygons) {
      for (let i = 0; i < polygon.length; i += 1) {
        const distance = segmentDistanceKm(lat, lon, polygon[i], polygon[(i + 1) % polygon.length]);
        if (!best || distance < best.distance) {
          best = { key: area.key, distance };
        }
      }
    }
  }
  return best;
}

/** The warnings in force at `now`. */
export const warningsInForce = (warnings, now) =>
  warnings.filter((warning) => warning.start <= now && now < warning.end);

/** The warnings not over at `now` (in force or announced), soonest first. */
export const warningsAhead = (warnings, now) => warnings.filter((warning) => now < warning.end);

/** The highest level in force, overall and per type (0 = none). */
export function warningLevels(warnings, now) {
  const byType = Object.fromEntries(WARNING_TYPE_KEYS.map((type) => [type, 0]));
  let overall = 0;
  for (const warning of warningsInForce(warnings, now)) {
    overall = Math.max(overall, warning.level);
    if (warning.type in byType) {
      byType[warning.type] = Math.max(byType[warning.type], warning.level);
    }
  }
  return { overall, byType };
}
