// The "ARSO weather" widget: within the core budget (the SDK's own
// validator), localized, in metric and US units, honest when data is missing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { WIDGET_KEY, buildWeatherContent } from '../src/widgets.js';
import { NOW, RAIN_WARNING_TIME, quietWarnings } from './helpers/fakeArso.js';
import { createWorld } from './helpers/world.js';

const get = async (world, language = 'en', units = 'metric') => {
  const ack = await world.gladys.fake.widgetGet(WIDGET_KEY, { language, units });
  assert.equal(ack.success, true);
  return ack.data.content;
};
const ofType = (content, type) => content.components.filter((c) => c.type === type);

test('the full content fits the budget and renders exactly as sent', async () => {
  const world = await createWorld();
  for (const language of ['en', 'fr', 'de', 'es']) {
    for (const units of ['metric', 'us']) {
      const content = await get(world, language, units);
      assert.deepEqual(validateWidgetContent(content), [], `${language}/${units}`);
      assert.equal(content.components.length, 8);
    }
  }
  const content = await get(world, 'fr');
  assert.equal(ofType(content, 'text')[0].text, 'Maison');
  assert.deepEqual(
    ofType(content, 'value').map((tile) => [tile.label, tile.value, tile.unit]),
    [
      ['Température', 10.8, '°C'],
      ['Humidité', 86, '%'],
      ['Vent', 7.9, 'km/h'],
      ['Rafales', 10.1, 'km/h'],
    ],
  );
  const [chart] = ofType(content, 'chart');
  assert.deepEqual(
    chart.series.map((series) => [series.name, series.points.length]),
    [
      ['Maximale', 6],
      ['Minimale', 6],
    ],
  );
  assert.deepEqual(chart.series[0].points[0], { t: '2026-11-20T12:00:00.000Z', v: 15 });
  const [status] = ofType(content, 'status');
  assert.deepEqual(
    status.items.map((item) => [item.label, item.value]),
    [
      ['Jaune · Pluie', 'à partir de dim. 08:00'],
      ['Jaune · Vent', 'à partir de dim. 21:00'],
      ["Aujourd'hui", 'Peu nuageux · 9 – 15 °C'],
      ['Demain', 'Peu nuageux · 9 – 16 °C'],
    ],
  );
  assert.equal(status.items[0].color, 'warning');
  assert.match(ofType(content, 'text').at(-1).text, /^Source : ARSO · 22:10$/);
  await world.app.stop();
});

test('a warning in force: "until", and the rainy day in words', async () => {
  const world = await createWorld({ start: RAIN_WARNING_TIME });
  const [status] = ofType(await get(world, 'en'), 'status');
  assert.deepEqual(status.items[0], {
    label: 'Yellow · Rain',
    value: 'until 09:59 PM',
    color: 'warning',
    icon: 'alert-triangle',
  });
  assert.equal(status.items.find((item) => item.label === 'Today').value, 'Rain · 7 – 13 °C');
  await world.app.stop();
});

test('US units: Fahrenheit and mph', async () => {
  const world = await createWorld();
  const content = await get(world, 'en', 'us');
  assert.deepEqual(
    ofType(content, 'value').map((tile) => [tile.value, tile.unit]),
    [
      [51.4, '°F'],
      [86, '%'],
      [4.9, 'mph'],
      [6.3, 'mph'],
    ],
  );
  assert.equal(ofType(content, 'status')[0].items.at(-1).value, 'Mostly clear · 48.2 – 60.8 °F');
  await world.app.stop();
});

test('no warning: one green line', async () => {
  const world = await createWorld({ connect: false });
  world.arso.answers.warnings['SOUTH-WEST'] = quietWarnings('SOUTH-WEST');
  await world.gladys.connect();
  await world.app.ready;
  const [status] = ofType(await get(world, 'de'), 'status');
  assert.deepEqual(status.items[0], {
    label: 'Warnungen',
    value: 'Keine',
    color: 'success',
    icon: 'check-circle',
  });
  await world.app.stop();
});

test('the heading is the name given in Gladys, once the device is added', async () => {
  const world = await createWorld();
  const place = world.gladys.fake.discoveredDevices[1];
  await world.gladys.fake.deviceCreated({ ...place, name: 'Météo Koper' });
  assert.equal(ofType(await get(world, 'fr'), 'text')[0].text, 'Météo Koper');
  await world.app.stop();
});

test('not configured, or nothing read yet: a sentence instead of an empty card', async () => {
  const world = await createWorld({ houses: [] });
  const content = await get(world, 'es');
  assert.deepEqual(validateWidgetContent(content), []);
  assert.match(content.components[0].text, /Ningún lugar/);
  await world.app.stop();

  const waiting = buildWeatherContent(
    {
      title: 'X',
      target: { station: null, place: { name: 'X', lat: 46, lon: 14.5 } },
      observation: null,
      region: null,
      warnings: null,
    },
    { language: 'fr', units: 'metric', now: NOW },
  );
  assert.match(waiting.components[0].text, /En attente/);
});

test('a refresh that changes what the widget shows nudges it; an identical one does not', async () => {
  const world = await createWorld();
  const nudges = () => world.gladys.fake.widgetRefreshes.length;
  const [station] = world.gladys.fake.discoveredDevices;
  // The core's onPoll runs a cycle when the timer has not (same path as the timer).
  const before = nudges();
  world.clock.now += 10 * 60 * 1000;
  await world.gladys.fake.poll(station);
  const after = nudges();
  assert.equal(after, before + 1, 'a new observation time');
  world.clock.now += 10 * 60 * 1000 - 60 * 1000;
  await world.gladys.fake.poll(station);
  assert.equal(nudges(), after, 'same step: nothing new');
  await world.app.stop();
});
