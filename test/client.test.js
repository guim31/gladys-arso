// The HTTP client: the right files, a clear error for anything but ARSO XML.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArsoError, URLS, WARNING_AREAS, createArsoClient } from '../src/arso/client.js';

const answering =
  (body, status = 200, seen = []) =>
  async (url, init) => {
    seen.push({ url: String(url), init });
    return new Response(body, { status });
  };

test('the files read: observations, forecast in English, CAP warnings of one area', async () => {
  const seen = [];
  const client = createArsoClient({
    fetch: answering('<?xml version="1.0"?><data></data>', 200, seen),
  });
  await client.observations();
  await client.forecast();
  await client.warnings('SOUTH-WEST');
  assert.deepEqual(
    seen.map((request) => request.url),
    [URLS.observations, URLS.forecast, URLS.warnings('SOUTH-WEST')],
  );
  assert.match(seen[0].url, /observationAms_si_latest\.xml$/);
  assert.match(seen[2].url, /warning_SLOVENIA_SOUTH-WEST_latest_CAP\.xml$/);
  assert.match(seen[0].init.headers['user-agent'], /^gladys-arso/);
  assert.deepEqual(WARNING_AREAS.length, 5);
});

test('HTTP errors, a page that is not ARSO XML, a network failure: an ArsoError', async () => {
  await assert.rejects(
    createArsoClient({ fetch: answering('gone', 404) }).forecast(),
    (err) => err instanceof ArsoError && err.status === 404 && /HTTP 404/.test(err.message),
  );
  await assert.rejects(
    createArsoClient({ fetch: answering('<!DOCTYPE html><html>Login</html>') }).forecast(),
    /not ARSO XML/,
  );
  await assert.rejects(
    createArsoClient({
      fetch: async () => {
        throw new TypeError('fetch failed');
      },
    }).observations(),
    /meteo\.arso\.gov\.si unreachable \(fetch failed\)/,
  );
  const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
  await assert.rejects(
    createArsoClient({
      fetch: async () => {
        throw timeout;
      },
    }).observations(),
    /no answer within 20 s/,
  );
  // A CAP alert is accepted.
  const cap =
    '<?xml version="1.0" encoding="UTF-8" ?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"></alert>';
  assert.equal(await createArsoClient({ fetch: answering(cap) }).warnings('MIDDLE'), cap);
});
