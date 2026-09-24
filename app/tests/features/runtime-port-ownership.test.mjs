import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('runtime runner refuses an occupied port without contacting or stopping its owner', async () => {
  let requests = 0;
  const owner = createServer((_request, response) => { requests++; response.end('unrelated server'); });
  await new Promise(resolve => owner.listen(0, '127.0.0.1', resolve));
  const port = owner.address().port;
  try {
    await assert.rejects(promisify(execFile)(process.execPath, ['scripts/run-runtime-tests.mjs', 'tests/mobile-runtime.spec.ts'], {
      cwd: new URL('../../', import.meta.url), env: { ...process.env, MOBILE_RUNTIME_TEST_PORT: String(port) },
      timeout: 10000, windowsHide: true,
    }), error => error.code === 1 && error.stderr.includes('mevcut sunucuya bağlanılmadı'));
    assert.equal(requests, 0);
    assert.equal(owner.listening, true);
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(await response.text(), 'unrelated server');
  } finally {
    owner.closeAllConnections();
    await new Promise(resolve => owner.close(resolve));
  }
});
