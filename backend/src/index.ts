import { app } from './app.js';
import { config } from './config.js';

const server = app.listen(config.port, config.host, () => {
  console.log(`[backend] API aktif di http://${config.host}:${config.port}/api`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE'
    ? `[backend] Port ${config.port} sedang dipakai. Hentikan server lama atau ubah PORT di backend/.env.`
    : error);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
