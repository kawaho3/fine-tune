/** Trusted readiness probe only. Never accepts or executes generated programs. */
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
export const IMAGE = 'node@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a';
export const LIMITS = Object.freeze({ memoryBytes: 134217728, cpuRatio: 0.5, pids: 32, workspaceBytes: 16777216 });

// Explicitly construct the CLI environment; do not pass host credentials to a child.
export function dockerEnvironment(source = process.env) {
  const host = source.DOCKER_HOST ?? 'unix:///var/run/docker.sock';
  if (!/^unix:\/\/\/[\w./-]+$/.test(host)) throw new Error('A local Unix Docker socket is required.');
  return { PATH: source.PATH ?? '/usr/local/bin:/usr/bin:/bin', DOCKER_HOST: host };
}

function finiteLimit(value) {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

/** Validate measured controls, not merely the requested Docker flags. */
export function evaluateProbe(observed) {
  if (!observed || typeof observed !== 'object' || Array.isArray(observed)) throw new Error('Invalid probe response.');
  const memory = finiteLimit(observed.memoryMax);
  const pids = finiteLimit(observed.pidsMax);
  const cpu = typeof observed.cpuMax === 'string' ? observed.cpuMax.match(/^([1-9]\d*) ([1-9]\d*)$/) : null;
  const cpuRatio = cpu ? Number(cpu[1]) / Number(cpu[2]) : null;
  const checks = {
    nonRoot: Number.isSafeInteger(observed.uid) && observed.uid > 0,
    capabilitiesDropped: observed.capabilitiesDropped === true,
    noNewPrivileges: observed.noNewPrivileges === true,
    seccomp: observed.seccomp === true,
    readOnlyRoot: observed.readOnlyRoot === true,
    workspaceWritable: observed.workspaceWritable === true,
    workspaceMountRestricted: observed.workspaceMountRestricted === true,
    noRuntimeSocket: observed.noRuntimeSocket === true,
    noInheritedCredentials: observed.noInheritedCredentials === true,
    networkDisabled: observed.networkDisabled === true,
    metadataBlocked: observed.metadataBlocked === true,
    memoryBounded: memory !== null && memory <= LIMITS.memoryBytes,
    cpuBounded: cpuRatio !== null && Number.isFinite(cpuRatio) && cpuRatio > 0 && cpuRatio <= LIMITS.cpuRatio,
    pidsBounded: pids !== null && pids <= LIMITS.pids,
  };
  return {
    ready: Object.values(checks).every(Boolean),
    checks,
    measured: { memoryBytes: memory, cpuRatio, pids },
    required: LIMITS,
    failed: Object.keys(checks).filter(key => !checks[key]),
    scope: 'Prerequisite probe only; a pass does not certify production isolation or enable code execution.',
  };
}

// Reviewed, fixed source; no user-controlled code, dependencies, paths or commands.
const PROBE = String.raw`
import fs from 'node:fs';
import net from 'node:net';
const read = path => { try { return fs.readFileSync(path,'utf8').trim(); } catch { return null; } };
const status = read('/proc/self/status') ?? '';
const fields = Object.fromEntries(status.split('\n').map(line => line.split(/:\s*/,2)));
let readOnlyRoot = false;
try { fs.writeFileSync('/etc/fine-tune-readiness-probe','probe'); } catch (error) { readOnlyRoot = error.code === 'EROFS'; }
let workspaceWritable = false;
try { fs.writeFileSync('/workspace/probe','probe'); workspaceWritable = fs.readFileSync('/workspace/probe','utf8') === 'probe'; fs.unlinkSync('/workspace/probe'); } catch {}
const mount = (read('/proc/mounts') ?? '').split('\n').map(line => line.split(' ')).find(parts => parts[1] === '/workspace');
const mountOptions = new Set(mount?.[3]?.split(',') ?? []);
let workspaceMountRestricted = false;
try {
  const stat = fs.statfsSync('/workspace');
  workspaceMountRestricted = mount?.[2] === 'tmpfs' && ['noexec','nosuid','nodev'].every(flag => mountOptions.has(flag)) && stat.blocks * stat.bsize <= 16777216;
} catch {}
const blocked = host => new Promise(resolve => {
  const socket = net.connect({host,port:443});
  const timer = setTimeout(() => { socket.destroy(); resolve(false); },1000);
  socket.once('connect',() => { clearTimeout(timer); socket.destroy(); resolve(false); });
  socket.once('error',error => { clearTimeout(timer); resolve(['ENETUNREACH','EHOSTUNREACH'].includes(error.code)); });
});
const [networkDisabled,metadataBlocked] = await Promise.all([blocked('1.1.1.1'),blocked('169.254.169.254')]);
const expectedEnv = new Set(['PATH','HOSTNAME','HOME','NODE_VERSION','YARN_VERSION','PWD','SHLVL']);
console.log(JSON.stringify({
 uid:process.getuid(),
 capabilitiesDropped:['CapInh','CapPrm','CapEff','CapBnd','CapAmb'].every(key => /^0+$/.test(fields[key] ?? '')),
 noNewPrivileges:fields.NoNewPrivs === '1', seccomp:fields.Seccomp === '2',
 readOnlyRoot,workspaceWritable,workspaceMountRestricted,
 noRuntimeSocket:!fs.existsSync('/var/run/docker.sock') && !fs.existsSync('/run/podman/podman.sock'),
 noInheritedCredentials:Object.keys(process.env).every(key => expectedEnv.has(key) || process.env[key] === ''),
 networkDisabled,metadataBlocked,
 memoryMax:read('/sys/fs/cgroup/memory.max'),cpuMax:read('/sys/fs/cgroup/cpu.max'),pidsMax:read('/sys/fs/cgroup/pids.max')
}));
`;

export function createArguments(name) {
  if (!/^fine-tune-readiness-[a-f0-9-]+$/.test(name)) throw new Error('Invalid probe name.');
  return [
    'create', '--pull=never', '--name', name, '--label', 'fine-tune.readiness-probe=true',
    '--network=none', '--read-only', '--user=1000:1000', '--cap-drop=ALL',
    '--security-opt=no-new-privileges', '--pids-limit=32', '--memory=128m', '--memory-swap=128m', '--cpus=0.5',
    // Some managed daemons inject proxies automatically. Clear them explicitly.
    '--env=HTTP_PROXY=', '--env=HTTPS_PROXY=', '--env=NO_PROXY=', '--env=http_proxy=', '--env=https_proxy=', '--env=no_proxy=',
    '--tmpfs=/workspace:rw,noexec,nosuid,nodev,size=16777216,nr_inodes=1024,uid=1000,gid=1000',
    '--workdir=/workspace', '--log-driver=none', IMAGE, 'node', '--input-type=module', '-e', PROBE,
  ];
}

export async function checkDocker({ execute = execFileAsync, environment = process.env, signal } = {}) {
  const name = `fine-tune-readiness-${randomUUID()}`;
  const options = { env: dockerEnvironment(environment), timeout: 15000, killSignal: 'SIGKILL', maxBuffer: 16384, encoding: 'utf8', signal };
  let report;
  try {
    await execute('docker', createArguments(name), options);
    const result = await execute('docker', ['start', '--attach', name], options);
    report = evaluateProbe(JSON.parse(result.stdout.trim()));
  } catch {
    report = { ready: false, failed: ['probeExecution'], message: 'Docker probe could not complete. Ensure the local daemon and pinned image are available; no generated code was run.', image: IMAGE };
  } finally {
    // Also attempted after timed-out create/start: killing the CLI alone does not stop a container.
    try {
      await execute('docker', ['rm', '--force', name], { ...options, timeout: 5000, signal: undefined });
    } catch (error) {
      // A missing container after a failed create requires no removal. Other failures are blockers.
      if (!(typeof error.stderr === 'string' && /^Error response from daemon: No such container: fine-tune-readiness-[a-f0-9-]+\s*$/.test(error.stderr))) {
        report = { ...report, ready: false, failed: [...(report?.failed ?? []), 'cleanup'], message: 'Probe cleanup was not confirmed; remove containers labeled fine-tune.readiness-probe=true before retrying.' };
      }
    }
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    const report = await checkDocker({ signal: controller.signal });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ready ? 0 : 1;
  } catch {
    console.log(JSON.stringify({ ready: false, failed: ['configuration'], message: 'Use a local Unix Docker socket. No probe was run.' }));
    process.exitCode = 1;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}
