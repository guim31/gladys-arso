// -----------------------------------------------------------------------------
// A simulated ARSO: a `fetch` that answers the files the integration reads
// with the real files recorded in test/fixtures on 20 November 2026. No
// network.
//
// The observation time is re-dated to the last 10-minute step before the test
// clock, so a test that moves the clock still sees fresh readings.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { WARNING_AREAS } from '../../src/arso/client.js';

export const fixture = (name) =>
  readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');

export const FIXTURES = {
  observations: fixture('observations.xml'),
  forecast: fixture('forecast.xml'),
  warnings: Object.fromEntries(
    WARNING_AREAS.map((area) => [area, fixture(`warnings-${area}.xml`)]),
  ),
};

/** Test clock: Friday 20 November 2026, 22:15 in Ljubljana (21:15 UTC), when the files were read. */
export const NOW = Date.parse('2026-11-20T21:15:00Z');
export const TIME_ZONE = 'Europe/Ljubljana';

/** The yellow rain warning of the South-West area, in force on 22 November. */
export const RAIN_WARNING_TIME = Date.parse('2026-11-22T10:00:00Z');

/** The CAP file of an area with every warning turned green (= no warning). */
export const quietWarnings = (area) =>
  FIXTURES.warnings[area].replace(
    /<value>[234]; \w+; \w+<\/value>/g,
    '<value>1; green; Minor</value>',
  );

const rfc822 = (time) => new Date(time).toUTCString().replace('GMT', '+0000');

/**
 * @param {object} [options]
 * @param {() => number} [options.now]
 */
export function createFakeArso({ now = () => NOW } = {}) {
  const requests = [];
  // Answers by endpoint: an XML text, a function of the URL, an Error, or { status }.
  const answers = {
    observations: () => {
      const step = Math.floor((now() - 5 * 60 * 1000) / (10 * 60 * 1000)) * 10 * 60 * 1000;
      return FIXTURES.observations.replace(
        /<tsValid_issued_RFC822>[^<]*</g,
        `<tsValid_issued_RFC822>${rfc822(step)}<`,
      );
    },
    forecast: FIXTURES.forecast,
    warnings: { ...FIXTURES.warnings },
  };

  const endpointOf = (url) => {
    if (url.pathname.endsWith('/observationAms_si_latest.xml')) return ['observations'];
    if (url.pathname.endsWith('/forecast_si_latest.xml')) return ['forecast'];
    const match = /warning_SLOVENIA_(.+)_latest_CAP\.xml$/.exec(url.pathname);
    return match ? ['warnings', match[1]] : [null];
  };

  async function fetch(input) {
    const url = new URL(String(input));
    const [endpoint, area] = endpointOf(url);
    requests.push({ endpoint, area, url });
    let answer = answers[endpoint];
    if (endpoint === 'warnings') {
      answer = answer instanceof Error || answer?.status ? answer : answer[area];
    }
    if (answer instanceof Error) {
      throw answer;
    }
    if (answer && typeof answer === 'object' && answer.status) {
      return new Response(answer.body ?? 'error', { status: answer.status });
    }
    const body = typeof answer === 'function' ? answer(url) : answer;
    if (body === undefined) {
      return new Response('not found', { status: 404 });
    }
    return new Response(body, { status: 200, headers: { 'content-type': 'text/xml' } });
  }

  return {
    fetch,
    requests,
    answers,
    /** Requests per endpoint. */
    count: (endpoint) => requests.filter((request) => request.endpoint === endpoint).length,
  };
}
