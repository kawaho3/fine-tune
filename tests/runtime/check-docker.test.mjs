import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDocker, createArguments, dockerEnvironment, evaluateProbe, IMAGE } from '../../tools/runtime/check-docker.mjs';

const valid = () => ({
  uid: 1000, capabilitiesDropped: true, noNewPrivileges: true, seccomp: true,
  readOnlyRoot: true, workspaceWritable: true, workspaceMountRestricted: true,
  noRuntimeSocket: true, noInheritedCredentials: true, networkDisabled: true, metadataBlocked: true,
  memoryMax: '134217728', cpuMax: '50000 100000', pidsMax: '32',
});

test('readiness uses measured resource limits and fails closed on unsupported or missing controls', () => {
  assert.equal(evaluateProbe(valid()).ready, true);
  for (const key of Object.keys(valid())) {
    const observed = valid();
    delete observed[key];
    assert.equal(evaluateProbe(observed).ready, false, key);
  }
  const unbounded = evaluateProbe({ ...valid(), memoryMax: '34359738368', cpuMax: '400000 100000', pidsMax: 'max' });
  assert.deepEqual(unbounded.failed, ['memoryBounded', 'cpuBounded', 'pidsBounded']);
  assert.equal(unbounded.ready, false);
  for (const value of ['0', '-1', 'Infinity', 'max', 128, '1e3', '9999999999999999999999999999999']) {
    assert.equal(evaluateProbe({ ...valid(), memoryMax: value }).checks.memoryBounded, false);
  }
  for (const value of ['0 100000', 'max 100000', '50000 0', '50000', null]) {
    assert.equal(evaluateProbe({ ...valid(), cpuMax: value }).checks.cpuBounded, false);
  }
  for (const input of [null, [], 'yes']) assert.throws(() => evaluateProbe(input), /Invalid probe/);
});

test('CLI environment excludes secrets, proxy credentials and remote daemon connections', () => {
  assert.deepEqual(dockerEnvironment({ PATH: '/bin', OPENAI_API_KEY: 'do-not-forward', HTTPS_PROXY: 'private' }), {
    PATH: '/bin', DOCKER_HOST: 'unix:///var/run/docker.sock',
  });
  assert.throws(() => dockerEnvironment({ DOCKER_HOST: 'tcp://remote:2375' }), /local Unix/);
  assert.throws(() => dockerEnvironment({ DOCKER_HOST: 'unix:///socket\n--privileged' }), /local Unix/);
});

test('fixed image probe cannot accept host mounts, environment or arbitrary commands', () => {
  const args = createArguments('fine-tune-readiness-1234-abcd');
  for (const required of ['--pull=never', '--network=none', '--read-only', '--user=1000:1000', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=32', '--memory=128m', '--cpus=0.5']) assert.ok(args.includes(required));
  assert.ok(args.includes(IMAGE));
  assert.ok(!args.some(arg => /^--(privileged|mount|volume)/.test(arg)));
  assert.ok(args.filter(arg => arg.startsWith('--env=')).every(arg => /^--env=(HTTP_PROXY|HTTPS_PROXY|NO_PROXY|http_proxy|https_proxy|no_proxy)=$/.test(arg)));
  assert.throws(() => createArguments('name; rm -rf /'), /Invalid probe name/);
});

test('successful probe always removes its container without leaking extra response data', async () => {
  const calls = [];
  const report = await checkDocker({ environment: {}, execute: async (command, args, options) => {
    calls.push({ command, args, options });
    return { stdout: args[0] === 'start' ? JSON.stringify({ ...valid(), secret: 'never report' }) : 'ok' };
  } });
  assert.equal(report.ready, true);
  assert.equal(JSON.stringify(report).includes('never report'), false);
  assert.deepEqual(calls.map(call => call.args[0]), ['create', 'start', 'rm']);
  assert.ok(calls.every(call => call.options.timeout <= 15000 && call.options.maxBuffer === 16384));
});

test('invalid output, timeout or cancellation still trigger forced cleanup', async () => {
  for (const mode of ['invalid', 'timeout', 'cancelled']) {
    const calls = [];
    const controller = new AbortController();
    const report = await checkDocker({ environment: {}, signal: controller.signal, execute: async (_, args, options) => {
      calls.push(args[0]);
      assert.equal(options.signal, args[0] === 'rm' ? undefined : controller.signal);
      if (args[0] === 'start') {
        if (mode === 'cancelled') { controller.abort(); throw new Error('aborted'); }
        if (mode === 'timeout') throw new Error('timed out; sensitive text');
        return { stdout: 'not json' };
      }
      return { stdout: '' };
    } });
    assert.equal(report.ready, false);
    assert.deepEqual(calls, ['create', 'start', 'rm']);
    assert.equal(JSON.stringify(report).includes('sensitive text'), false);
  }
});

test('cleanup failure prevents readiness even when all measured controls pass', async () => {
  const report = await checkDocker({ environment: {}, execute: async (_, args) => {
    if (args[0] === 'rm') throw new Error('daemon disconnected');
    return { stdout: args[0] === 'start' ? JSON.stringify(valid()) : '' };
  } });
  assert.equal(report.ready, false);
  assert.deepEqual(report.failed, ['cleanup']);
});
