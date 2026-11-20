// -----------------------------------------------------------------------------
// The integration end to end: the SDK's fake Gladys, a simulated ARSO (the
// real files recorded on 20 November 2026), a controllable clock. Devices,
// states, the container's own refresh timer, the onPoll fallback, the "new
// warning" trigger, the actions, the logs.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MemoryStore } from '../src/store.js';
import { HEARTBEAT, WARNING_TRIGGER } from '../src/service.js';
import { FIXTURES, NOW, RAIN_WARNING_TIME, quietWarnings } from './helpers/fakeArso.js';
import { HOUSE, createWorld, featureId } from './helpers/world.js';

const PLACE = '4555_1373'; // HOUSE rounded to 0.01°
const STATION = 'koper_kapet-ija'; // Koper Kapitanija, 0.4 km from HOUSE

const stationFeature = (world, key) => featureId(world.gladys, 'station', STATION, key);
const placeFeature = (world, key) => featureId(world.gladys, 'place', PLACE, key);
const statesOf = (world, featureExternalId) =>
  world.gladys.fake.states.filter(
    (state) => state.device_feature_external_id === featureExternalId,
  );

/** The recorded observations with another temperature in Koper. */
function withTemperature(world, temperature) {
  const recorded = world.arso.answers.observations;
  world.arso.answers.observations = (url) =>
    recorded(url).replace(
      /(<domain_meteosiId>KOPER_KAPET-IJA_<[\s\S]*?<t>)[^<]*</,
      `$1${temperature}<`,
    );
}

/** The South-West warnings with every yellow warning raised to orange. */
const raisedWarnings = () =>
  FIXTURES.warnings['SOUTH-WEST'].replaceAll('2; yellow; Moderate', '3; orange; Severe');

test('the house gives two devices: the nearest station, and the place for forecast and warnings', async () => {
  const world = await createWorld();
  const devices = world.gladys.fake.discoveredDevices;
  assert.deepEqual(
    devices.map((device) => [device.name, device.external_id]),
    [
      ['ARSO Koper Kapitanija', world.gladys.externalIds('station', STATION).device],
      ['ARSO Maison', world.gladys.externalIds('place', PLACE).device],
    ],
  );
  assert.deepEqual(world.gladys.fake.connectionStatus, { connected: true });
  // Nothing is published for devices the user has not added.
  assert.equal(world.gladys.fake.states.length, 0);
  await world.app.stop();
});

test('a station only gets the features of what it measures (Koper: no rain gauge, no snow)', async () => {
  const world = await createWorld();
  const [station] = world.gladys.fake.discoveredDevices;
  assert.deepEqual(
    station.features.map((feature) => feature.external_id.split(':').at(-1)),
    [
      'temperature',
      'dew_point',
      'humidity',
      'pressure',
      'wind_speed',
      'wind_gust',
      'wind_direction',
    ],
  );
  await world.app.stop();
});

test('a station without wind nor pressure (Babno Polje) keeps the features already added', async () => {
  const fresh = await createWorld({ config: { station_id: 'BABNO-POL' } });
  const [station] = fresh.gladys.fake.discoveredDevices;
  assert.deepEqual(
    station.features.map((feature) => feature.external_id.split(':').at(-1)),
    ['temperature', 'dew_point', 'humidity', 'rain_rate', 'snow_depth'],
  );
  await fresh.app.stop();

  // Added when the station still sent its wind: the feature stays.
  const ids = fresh.gladys.externalIds('station', 'babno-pol');
  const added = {
    ...station,
    features: [
      ...station.features,
      { ...station.features[0], external_id: ids.feature('wind_speed') },
    ],
  };
  const world = await createWorld({ config: { station_id: 'BABNO-POL' }, devices: [added] });
  const keys = world.gladys.fake.discoveredDevices[0].features.map((feature) =>
    feature.external_id.split(':').at(-1),
  );
  assert.ok(keys.includes('wind_speed'));
  await world.app.stop();
});

test('adding the devices publishes their states at once, from what was already read', async () => {
  const world = await createWorld();
  const requests = world.arso.requests.length;
  await world.createAll();
  assert.equal(world.arso.requests.length, requests, 'no new request');
  const last = (key) => world.gladys.fake.lastState(key);
  assert.equal(last(stationFeature(world, 'temperature')), 10.8);
  assert.equal(last(stationFeature(world, 'wind_gust')), 10.1);
  assert.equal(last(stationFeature(world, 'wind_direction')), 123);
  assert.equal(last(placeFeature(world, 'today_min')), 9);
  assert.equal(last(placeFeature(world, 'today_max')), 15);
  assert.equal(last(placeFeature(world, 'tomorrow_max')), 16);
  assert.equal(last(placeFeature(world, 'tomorrow_gust')), 28.8);
  assert.equal(last(placeFeature(world, 'warning_level')), 0);
  assert.equal(statesOf(world, placeFeature(world, 'condition')).at(-1).text, 'Peu nuageux');
  // Two yellow warnings announced for Sunday, none in force yet.
  assert.match(
    statesOf(world, placeFeature(world, 'warnings')).at(-1).text,
    /^Jaune · Pluie dim\. 08:00 → dim\. 21:59 \| Jaune · Vent dim\. 21:00 → lun\. 06:59$/,
  );
  assert.ok(world.gladys.fake.widgetRefreshes.includes('weather'));
  await world.app.stop();
});

test('the warnings in force set the levels, per type', async () => {
  const world = await createWorld({ start: RAIN_WARNING_TIME });
  await world.createAll();
  const last = (key) => world.gladys.fake.lastState(placeFeature(world, key));
  assert.equal(last('warning_level'), 1);
  assert.equal(last('warning_rain'), 1);
  assert.equal(last('warning_wind'), 0);
  assert.equal(statesOf(world, placeFeature(world, 'condition')).at(-1).text, 'Pluie');
  await world.app.stop();
});

test('the states refresh on the container timer, without any onPoll from the core', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const world = await createWorld({ timers: true });
  await world.createAll();
  withTemperature(world, 9.4);
  const before = world.arso.count('observations');

  world.clock.now += 10 * 60 * 1000;
  t.mock.timers.tick(10 * 60 * 1000);
  await world.app.poller.idle;

  assert.equal(world.arso.count('observations'), before + 1);
  assert.equal(world.gladys.fake.lastState(stationFeature(world, 'temperature')), 9.4);
  const polls = world.gladys.fake.wsMessages.filter((message) => /poll/i.test(message.type));
  assert.equal(polls.length, 0, 'the core never polled');
  await world.app.stop();
});

test("the core's onPoll is a fallback: skipped after a recent refresh, used when the timer stalls", async () => {
  const world = await createWorld();
  await world.createAll();
  const [station] = world.gladys.fake.discoveredDevices;
  const before = world.arso.count('observations');

  assert.deepEqual(await world.gladys.fake.poll(station), { success: true });
  assert.equal(world.arso.count('observations'), before, 'refreshed recently: skipped');

  world.clock.now += 10 * 60 * 1000;
  withTemperature(world, 7.1);
  await world.gladys.fake.poll(station);
  assert.equal(world.arso.count('observations'), before + 1);
  assert.equal(world.gladys.fake.lastState(stationFeature(world, 'temperature')), 7.1);

  // A device of another integration (or a stale one) is ignored.
  await world.gladys.fake.poll({ external_id: 'ext:test-integration:station:1' });
  assert.equal(world.arso.count('observations'), before + 1);
  await world.app.stop();
});

test('only the changes are published, and an unchanged value is re-sent every 6 hours', async (t) => {
  // The SDK dates its heartbeat with the system clock.
  t.mock.timers.enable({ apis: ['Date'], now: NOW });
  const world = await createWorld();
  await world.createAll();
  const temperature = stationFeature(world, 'temperature');
  assert.equal(statesOf(world, temperature).length, 1);
  t.mock.timers.setTime(NOW + 10 * 60 * 1000);
  await world.refresh(10);
  assert.equal(statesOf(world, temperature).length, 1, 'unchanged: not sent again');
  t.mock.timers.setTime(NOW + HEARTBEAT + 20 * 60 * 1000);
  world.clock.now += HEARTBEAT;
  await world.refresh(10);
  assert.equal(statesOf(world, temperature).length, 2, 'heartbeat');
  await world.app.stop();
});

test('the forecast is read once an hour, the observations and the warnings every cycle', async () => {
  const world = await createWorld();
  // Setup: the observations and the five areas (their polygons).
  assert.equal(world.arso.count('observations'), 1);
  assert.equal(world.arso.count('warnings'), 5);
  for (let i = 0; i < 6; i += 1) {
    await world.refresh(10);
  }
  assert.equal(world.arso.count('observations'), 7);
  assert.equal(world.arso.count('warnings'), 11);
  assert.ok(
    world.arso.requests.slice(6).every((r) => r.endpoint !== 'warnings' || r.area === 'SOUTH-WEST'),
  );
  assert.equal(world.arso.count('forecast'), 2);
  // About 13 requests an hour.
  assert.equal(world.arso.requests.length - 6, 14);
  await world.app.stop();
});

test('a station silent for hours: its last values are not re-sent as current', async () => {
  const world = await createWorld();
  await world.createAll();
  const recorded = world.arso.answers.observations;
  world.arso.answers.observations = (url) =>
    recorded(url)
      .replace(
        /<tsValid_issued_RFC822>[^<]*</g,
        '<tsValid_issued_RFC822>20 Nov 2026 12:00:00 +0000<',
      )
      .replace(/(<domain_meteosiId>KOPER_KAPET-IJA_<[\s\S]*?<t>)[^<]*</, '$11.5<');
  await world.refresh(10);
  assert.equal(world.gladys.fake.lastState(stationFeature(world, 'temperature')), 10.8);
  await world.app.stop();
});

test('the first run only takes note of the warnings announced: no scene event', async () => {
  const world = await createWorld();
  assert.equal(world.gladys.fake.sceneEvents.length, 0);
  assert.equal(Object.keys((await world.store.load()).seen).length, 2);
  await world.app.stop();
});

test('a new warning fires the trigger with its details, once; a raised level fires again', async () => {
  const world = await createWorld({ connect: false });
  world.arso.answers.warnings['SOUTH-WEST'] = quietWarnings('SOUTH-WEST');
  await world.gladys.connect();
  await world.app.ready;
  await world.createAll();
  assert.equal(world.gladys.fake.sceneEvents.length, 0);

  world.arso.answers.warnings['SOUTH-WEST'] = FIXTURES.warnings['SOUTH-WEST'];
  await world.refresh(10);
  const events = world.gladys.fake.sceneEvents;
  assert.equal(events.length, 2);
  assert.ok(events.every((event) => event.key === WARNING_TRIGGER));
  const rain = events.find((event) => event.data.warning_type === 'rain').data;
  assert.equal(rain.level, 'yellow');
  assert.equal(rain.level_number, 1);
  assert.equal(rain.type_label, 'Pluie');
  assert.equal(rain.level_label, 'Jaune');
  assert.equal(rain.in_force, false);
  assert.equal(rain.is_update, false);
  assert.equal(rain.area, 'Slovenia / South-West');
  assert.equal(rain.starts_at, 'dim. 08:00');
  assert.match(rain.description, /^Rainfall : from 25 to 50 mm\/24h\./);

  // Same warnings: nothing more.
  await world.refresh(10);
  assert.equal(world.gladys.fake.sceneEvents.length, 2);

  // Both go orange: fired again, as updates.
  world.arso.answers.warnings['SOUTH-WEST'] = raisedWarnings();
  await world.refresh(10);
  assert.equal(world.gladys.fake.sceneEvents.length, 4);
  const raised = world.gladys.fake.sceneEvents.at(-1).data;
  assert.deepEqual([raised.level, raised.is_update], ['orange', true]);
  await world.app.stop();
});

test('a restart does not fire again for the warnings already announced', async () => {
  const store = new MemoryStore();
  const first = await createWorld({ store, connect: false });
  first.arso.answers.warnings['SOUTH-WEST'] = quietWarnings('SOUTH-WEST');
  await first.gladys.connect();
  await first.app.ready;
  first.arso.answers.warnings['SOUTH-WEST'] = FIXTURES.warnings['SOUTH-WEST'];
  await first.refresh(10);
  assert.equal(first.gladys.fake.sceneEvents.length, 2);
  await first.app.stop();

  const second = await createWorld({ store });
  await second.refresh(10);
  assert.equal(second.gladys.fake.sceneEvents.length, 0);
  await second.app.stop();
});

test('the trigger data match the filters and variables declared in the manifest', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
  );
  const trigger = manifest.scene_triggers.find((entry) => entry.key === WARNING_TRIGGER);
  const world = await createWorld({ connect: false });
  world.arso.answers.warnings['SOUTH-WEST'] = quietWarnings('SOUTH-WEST');
  await world.gladys.connect();
  await world.app.ready;
  world.arso.answers.warnings['SOUTH-WEST'] = raisedWarnings();
  await world.refresh(10);
  assert.equal(world.gladys.fake.sceneEvents.length, 2);
  for (const { data } of world.gladys.fake.sceneEvents) {
    for (const field of trigger.fields) {
      const values = field.options.map((option) => option.value);
      assert.ok(values.includes(data[field.key]), `${field.key}=${data[field.key]}`);
    }
    for (const variable of trigger.variables) {
      assert.ok(variable.key in data, `variable ${variable.key} missing`);
      assert.equal(typeof data[variable.key], variable.type, variable.key);
    }
  }
  await world.app.stop();
});

test('a normal refresh cycle writes nothing at info level, and never the home coordinates', async () => {
  const world = await createWorld();
  await world.createAll();
  const start = world.logs.lines.length;
  for (let i = 0; i < 3; i += 1) {
    withTemperature(world, 8 + i);
    await world.refresh(10);
  }
  const cycle = world.logs.lines.slice(start);
  assert.ok(cycle.length > 0, 'the cycle logs at debug level');
  assert.deepEqual(
    cycle.filter((line) => line.level !== 'debug'),
    [],
  );
  const coordinates = [String(HOUSE.latitude), String(HOUSE.longitude), '45.55', '13.73'];
  for (const line of world.logs.lines) {
    for (const value of coordinates) {
      assert.ok(!line.text.includes(value), `"${line.text}" shows a coordinate`);
    }
  }
  await world.app.stop();
});

test('an ARSO outage is logged once, its recovery once, and shown in the status', async () => {
  const world = await createWorld();
  const outage = new TypeError('fetch failed');
  const saved = { ...world.arso.answers };
  world.arso.answers.observations = outage;
  world.arso.answers.forecast = outage;
  world.arso.answers.warnings = outage;
  world.clock.now += 3600 * 1000;
  await world.refresh(10);
  await world.refresh(10);
  await world.refresh(10);
  const warns = world.logs.at('warn');
  assert.equal(warns.length, 3, 'one line per source, not one per attempt');
  assert.ok(warns.every((line) => /unavailable \(.*fetch failed\)/.test(line.text)));
  assert.equal(world.gladys.fake.connectionStatus.connected, false);
  assert.match(world.gladys.fake.connectionStatus.message.en, /does not answer/);
  assert.match(world.gladys.fake.connectionStatus.message.de, /antwortet nicht/);

  Object.assign(world.arso.answers, saved);
  await world.refresh(10);
  const infos = world.logs.at('info').filter((line) => /answers again/.test(line.text));
  assert.equal(infos.length, 3);
  assert.deepEqual(world.gladys.fake.connectionStatus, { connected: true });
  await world.app.stop();
});

test('ARSO down at startup: retried at the next cycle, then the devices appear', async () => {
  const world = await createWorld({ connect: false });
  const observations = world.arso.answers.observations;
  world.arso.answers.observations = { status: 503 };
  await world.gladys.connect();
  await world.app.ready;
  assert.equal(world.gladys.fake.discoveredDevices.length, 0);
  assert.equal(world.gladys.fake.connectionStatus.connected, false);
  world.arso.answers.observations = observations;
  await world.refresh(10);
  assert.equal(world.gladys.fake.discoveredDevices.length, 2);
  assert.deepEqual(world.gladys.fake.connectionStatus, { connected: true });
  await world.app.stop();
});

test('an answer that is not ARSO XML (a captive portal page) is an error, not a crash', async () => {
  const world = await createWorld({ connect: false });
  world.arso.answers.observations = '<!DOCTYPE html><html><body>Login</body></html>';
  await world.gladys.connect();
  await world.app.ready;
  assert.equal(world.gladys.fake.connectionStatus.connected, false);
  assert.match(world.logs.at('warn')[0].text, /not ARSO XML/);
  await world.app.stop();
});

test('no house located and nothing configured: no device, the status says what to do', async () => {
  const world = await createWorld({ houses: [{ ...HOUSE, latitude: null, longitude: null }] });
  assert.equal(world.gladys.fake.discoveredDevices.length, 0);
  assert.equal(world.gladys.fake.connectionStatus.connected, false);
  assert.match(world.gladys.fake.connectionStatus.message.fr, /Aucun lieu/);
  assert.equal(world.arso.requests.length, 0, 'nothing to read');
  await world.app.stop();
});

test('typed coordinates take precedence over the house: Ljubljana, Central area', async () => {
  const world = await createWorld({ config: { latitude: '46,05', longitude: '14,51' } });
  const [station, place] = world.gladys.fake.discoveredDevices;
  assert.equal(
    station.external_id,
    world.gladys.externalIds('station', 'ljubl-ana_bezigrad').device,
  );
  assert.equal(place.external_id, world.gladys.externalIds('place', '4605_1451').device);
  assert.equal(place.name, 'ARSO 46.05, 14.51');
  await world.refresh(10);
  assert.equal(world.arso.requests.at(-1).area, 'MIDDLE');
  await world.app.stop();
});

test('a station alone: the forecast and warnings are read at the station', async () => {
  const world = await createWorld({ houses: [], config: { station_id: 'kreda-ica' } });
  const [station, place] = world.gladys.fake.discoveredDevices;
  assert.equal(station.name, 'ARSO Kredarica');
  assert.equal(place.name, 'ARSO Kredarica');
  assert.equal(place.external_id, world.gladys.externalIds('place', '4638_1385').device);
  await world.app.stop();
});

test('configuration problems are reported in the status', async () => {
  const cases = [
    [{ house: 'gone' }, /no longer exists/],
    [{ latitude: '47.07', longitude: '15.44' }, /outside Slovenia/],
    [{ latitude: 'north', longitude: '15' }, /not readable/],
    [{ station_id: 'Ljubljana Bežigrad' }, /looks like LJUBL-ANA_BEZIGRAD/],
    [{ station_id: 'NOWHERE' }, /not among the ARSO automatic stations/],
  ];
  for (const [config, message] of cases) {
    const world = await createWorld({ config });
    assert.equal(world.gladys.fake.connectionStatus.connected, false, JSON.stringify(config));
    assert.match(world.gladys.fake.connectionStatus.message.en, message);
    assert.ok(world.gladys.fake.connectionStatus.message.es, 'a four-language object');
    await world.app.stop();
  }
  // An unknown station keeps the forecast and warnings of the house.
  const world = await createWorld({ config: { station_id: 'NOWHERE' } });
  assert.deepEqual(
    world.gladys.fake.discoveredDevices.map((device) => device.external_id),
    [world.gladys.externalIds('place', PLACE).device],
  );
  await world.app.stop();
});

test('a configuration change re-reads everything for the new place', async () => {
  const world = await createWorld();
  await world.gladys.fake.configUpdated({ station_id: 'LJUBL-ANA_BEZIGRAD' });
  assert.equal(
    world.gladys.fake.discoveredDevices[0].external_id,
    world.gladys.externalIds('station', 'ljubl-ana_bezigrad').device,
  );
  assert.equal(
    world.logs.at('info').filter((line) => /Configuration updated/.test(line.text)).length,
    1,
  );
  await world.app.stop();
});

test('a configuration change reuses the area polygons but re-reads the warnings', async () => {
  const world = await createWorld();
  const before = world.arso.count('warnings');
  world.clock.now += 2 * 60 * 1000;
  await world.gladys.fake.configUpdated({ language: 'en' });
  assert.equal(world.arso.count('warnings'), before + 1, 'one area, not five');
  assert.equal(world.arso.requests.at(-1).area, 'SOUTH-WEST');
  await world.app.stop();
});

test('a scan request publishes the devices again', async () => {
  const world = await createWorld();
  const before = world.gladys.fake.requests.filter((r) => r.path === '/discovered_device').length;
  await world.gladys.fake.scanRequest();
  const after = world.gladys.fake.requests.filter((r) => r.path === '/discovered_device').length;
  assert.equal(after, before + 1);
  await world.app.stop();
});

test('the "list the nearest stations" action: green with distances, red without a place', async () => {
  const world = await createWorld();
  const ack = await world.gladys.fake.action('list_stations', {});
  assert.equal(ack.success, true);
  const lines = ack.data.message.fr.split('\n');
  assert.match(lines[0], /maison « Maison »/);
  assert.match(lines[1], /^KOPER_KAPET-IJA Koper Kapitanija \(\d+ m\) — 0,4 km$/);
  assert.equal(lines.length, 10);
  assert.match(ack.data.message.de, /Kopiere eine ID/);
  await world.app.stop();

  const lost = await createWorld({ houses: [] });
  const failed = await lost.gladys.fake.action('list_stations', {});
  assert.equal(failed.success, false);
  assert.match(failed.error.fr, /Aucun lieu/);
  await lost.app.stop();

  const offline = await createWorld();
  offline.arso.answers.observations = new TypeError('fetch failed');
  const down = await offline.gladys.fake.action('list_stations', {});
  assert.equal(down.success, false);
  assert.match(down.error.fr, /ARSO : échec/);
  await offline.app.stop();
});

test('the "check the connection" action reads every source now; a failure shows in red', async () => {
  const world = await createWorld();
  const before = world.arso.count('forecast');
  const ack = await world.gladys.fake.action('check_connection', {});
  assert.equal(ack.success, true);
  assert.equal(world.arso.count('forecast'), before + 1);
  assert.match(
    ack.data.message.en,
    /^ARSO answers\. Koper Kapitanija: 10\.8 °C at .*Forecast: Coastal region\. Slovenia \/ South-West: 2 warning/,
  );
  assert.match(ack.data.message.fr, /10,8 °C/);

  world.arso.answers.warnings = { status: 500 };
  const failed = await world.gladys.fake.action('check_connection', {});
  assert.equal(failed.success, false);
  assert.match(failed.error.en, /HTTP 500/);
  assert.match(failed.error.fr, /échec/);

  world.arso.answers.observations = { status: 404 };
  const setup = await world.gladys.fake.action('check_connection', {});
  assert.equal(setup.success, false);
  assert.match(setup.error.es, /ARSO: error/);
  const infos = world.logs.at('info').filter((line) => /Action: check/.test(line.text));
  assert.equal(infos.length, 3, 'one line per user action');
  await world.app.stop();

  const lost = await createWorld({ houses: [] });
  const none = await lost.gladys.fake.action('check_connection', {});
  assert.equal(none.success, false);
  assert.match(none.error.en, /No location/);
  await lost.app.stop();
});

test('feature names follow the configured language', async () => {
  for (const [language, name] of [
    ['en', 'Temperature'],
    ['fr', 'Température'],
    ['de', 'Temperatur'],
    ['es', 'Temperatura'],
  ]) {
    const world = await createWorld({ config: { language } });
    assert.equal(world.gladys.fake.discoveredDevices[0].features[0].name, name);
    await world.app.stop();
  }
});
