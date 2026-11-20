// The ARSO parsers, on the real files recorded on 20 November 2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  areaOf,
  decode,
  forecastDays,
  parseCondition,
  parseForecast,
  parseObservations,
  parseUtc,
  parseWarnings,
  warningLevels,
} from '../src/arso/model.js';
import { conditionName } from '../src/i18n.js';
import { FIXTURES, NOW, TIME_ZONE } from './helpers/fakeArso.js';

test('observations: every station, its position and its converted readings', () => {
  const stations = parseObservations(FIXTURES.observations);
  assert.equal(stations.length, 9);
  const ljubljana = stations.find((station) => station.id === 'LJUBL-ANA_BEZIGRAD');
  assert.deepEqual(
    { ...ljubljana, time: new Date(ljubljana.time).toISOString() },
    {
      id: 'LJUBL-ANA_BEZIGRAD',
      name: 'Ljubljana',
      lat: 46.0655,
      lon: 14.5124,
      altitude: 299,
      time: '2026-11-20T21:10:00.000Z',
      values: {
        temperature: 5.4,
        dew_point: 4.7,
        humidity: 95,
        pressure: 1011.3,
        wind_speed: 2.8,
        wind_gust: 4.8,
        wind_direction: 75,
        rain_rate: 0,
        snow_depth: 0,
      },
    },
  );
  // A station without wind nor pressure: those readings are left out, not zero.
  const babno = stations.find((station) => station.id === 'BABNO-POL');
  assert.deepEqual(Object.keys(babno.values), [
    'temperature',
    'dew_point',
    'humidity',
    'rain_rate',
    'snow_depth',
  ]);
  // Names with Slovenian letters (encoded as entities in the file).
  assert.ok(stations.some((station) => station.name === 'Rateče'));
});

test('the rain of the interval becomes an hourly rate, whatever the interval', () => {
  const block = (start, end, rain) =>
    `<data><metData><domain_meteosiId>X_</domain_meteosiId><domain_lat>46</domain_lat><domain_lon>14</domain_lon><validStart>${start}</validStart><validEnd>${end}</validEnd><rr_val>${rain}</rr_val></metData></data>`;
  const [ten] = parseObservations(block('20.11.2026 21:00 UTC', '20.11.2026 21:10 UTC', '0.4'));
  assert.equal(ten.values.rain_rate, 2.4);
  const [half] = parseObservations(block('20.11.2026 21:00 UTC', '20.11.2026 21:30 UTC', '0.4'));
  assert.equal(half.values.rain_rate, 0.8);
  assert.equal(parseUtc('1.2.2026 7:05 UTC'), Date.UTC(2026, 1, 1, 7, 5));
});

test('a file that is not an observation file is refused', () => {
  assert.throws(() => parseObservations('<data></data>'), /without any station/);
  assert.throws(() => parseForecast(''), /without any region/);
  assert.throws(() => parseWarnings('<html></html>'), /not a CAP alert/);
});

test('forecast: one entry per region, its days with min, max, weather and gusts', () => {
  const regions = parseForecast(FIXTURES.forecast);
  assert.deepEqual(
    regions.map((region) => region.name),
    ['Coastal region', 'Gorenjska region', 'Ljubljana region', 'Maribor region'],
  );
  const coast = regions.find((region) => region.id === 'SI_OBALNO-KRASKA');
  assert.equal(coast.days.length, 6);
  assert.deepEqual(coast.days[2], {
    date: '2026-11-22',
    min: 7,
    max: 13,
    condition: { sky: 'overcast', intensity: 'mod', weather: 'RA' },
    wind: coast.days[2].wind,
    gust: coast.days[2].gust,
  });
  const { today, tomorrow } = forecastDays(coast, NOW, TIME_ZONE);
  assert.deepEqual([today.date, tomorrow.date], ['2026-11-20', '2026-11-21']);
  // After midnight in Ljubljana, "today" moves on.
  const later = forecastDays(coast, Date.parse('2026-11-20T23:30:00Z'), TIME_ZONE);
  assert.equal(later.today.date, '2026-11-21');
});

test('the weather in words: the phenomenon with its intensity, the sky otherwise', () => {
  assert.equal(conditionName(parseCondition('partCloudy_lightSHRA'), 'en'), 'Showers (light)');
  assert.equal(conditionName(parseCondition('overcast_modRA'), 'fr'), 'Pluie');
  assert.equal(
    conditionName(parseCondition('overcast_heavyTSRA'), 'de'),
    'Gewitter mit Regen (stark)',
  );
  assert.equal(conditionName(parseCondition('prevCloudy'), 'es'), 'Muy nuboso');
  assert.equal(conditionName(parseCondition('unknownSky'), 'en'), null);
  assert.equal(conditionName(parseCondition(null), 'en'), null);
});

test('warnings: the English infos, green left out, levels 1 to 3, the area and its polygon', () => {
  const south = parseWarnings(FIXTURES.warnings['SOUTH-WEST']);
  assert.deepEqual(south.area.id, 'SLOVENIA_SOUTH-WEST');
  assert.equal(south.area.name, 'Slovenia / South-West');
  assert.equal(south.area.polygons.length, 1);
  assert.deepEqual(
    south.warnings.map((w) => [w.type, w.level, new Date(w.start).toISOString()]),
    [
      ['rain', 1, '2026-11-22T07:00:00.000Z'],
      ['wind', 1, '2026-11-22T20:00:00.000Z'],
    ],
  );
  assert.match(south.warnings[1].text, /^Maximum wind speed : from 70 to 85 km\/h\./);
  assert.equal(south.warnings[0].event, 'Moderate Rain Warning');
  assert.deepEqual(parseWarnings(FIXTURES.warnings.MIDDLE).warnings, []);

  const levels = warningLevels(south.warnings, Date.parse('2026-11-22T21:00:00Z'));
  assert.equal(levels.overall, 1);
  assert.equal(levels.byType.wind, 1);
  assert.equal(levels.byType.rain, 0, 'the rain warning is over');
});

test('the area of a place: the polygon that holds it, or the nearest one near the border', () => {
  const areas = Object.entries(FIXTURES.warnings).map(([key, xml]) => ({
    key,
    polygons: parseWarnings(xml).area.polygons,
  }));
  const at = (lat, lon) => areaOf(areas, lat, lon);
  assert.deepEqual(at(46.05, 14.506), { key: 'MIDDLE', distance: 0 });
  assert.deepEqual(at(45.548, 13.73), { key: 'SOUTH-WEST', distance: 0 });
  assert.deepEqual(at(46.557, 15.646), { key: 'NORTH-EAST', distance: 0 });
  assert.deepEqual(at(45.8, 15.17), { key: 'SOUTH-EAST', distance: 0 });
  assert.deepEqual(at(46.37, 14.11), { key: 'NORTH-WEST', distance: 0 });
  // Trieste, across the border: the South-West, a few km away.
  const trieste = at(45.65, 13.78);
  assert.equal(trieste.key, 'SOUTH-WEST');
  assert.ok(trieste.distance > 0 && trieste.distance < 25);
  // Graz: far away.
  assert.ok(at(47.07, 15.44).distance > 25);
});

test('XML entities are decoded', () => {
  assert.equal(decode('Dež &amp; sneg &#382; &#x17E; &lt;'), 'Dež & sneg ž ž <');
});

test('tomorrow is the next calendar day, even on a DST night', () => {
  const region = {
    days: ['2026-10-24', '2026-10-25', '2026-10-26'].map((date) => ({ date })),
  };
  // 00:30 on 25 October in Ljubljana (summer time ends that night): now + 24 h is still the 25th.
  const night = Date.parse('2026-10-24T22:30:00Z');
  const { today, tomorrow } = forecastDays(region, night, TIME_ZONE);
  assert.deepEqual([today.date, tomorrow.date], ['2026-10-25', '2026-10-26']);
});

test('a warning id names its area; duplicates keep the highest level', () => {
  const xml = FIXTURES.warnings['SOUTH-WEST'];
  const [rain] = parseWarnings(xml).warnings;
  assert.equal(rain.id, 'SLOVENIA_SOUTH-WEST:rain@2026-11-22T07:00:00.000Z');
  // The same English info twice, the second one orange.
  const info = xml
    .match(/<info><language>en-GB<\/language>(?:(?!<\/info>)[\s\S])*?10; rain[\s\S]*?<\/info>/g)
    .find((block) => block.includes('2; yellow'));
  const doubled = xml.replace(
    '</alert>',
    `${info.replace('2; yellow; Moderate', '3; orange; Severe')}</alert>`,
  );
  const rains = parseWarnings(doubled).warnings.filter((w) => w.type === 'rain');
  assert.deepEqual(
    rains.map((w) => w.level),
    [2],
  );
});
