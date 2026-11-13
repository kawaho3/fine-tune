import { createServer } from 'node:http';
import { createHandler } from './app.mjs';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('PORT must be an integer between 0 and 65535.');
  process.exitCode = 1;
} else {
  const server = createServer(createHandler());
  server.requestTimeout = 10_000;
  server.headersTimeout = 5_000;
  server.listen(port, host, () => {
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : port;
    console.log(`fine-tune offline mock: http://${host}:${activePort}`);
    console.log('No LLM calls, arbitrary code execution, sandbox, or data persistence.');
  });
}
