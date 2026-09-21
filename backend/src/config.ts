import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const backendRoot = fileURLToPath(new URL('../', import.meta.url));
loadEnv({ path: path.join(backendRoot, '.env'), quiet: true });

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT harus berupa angka antara 1 dan 65535.');
}

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port,
  frontendOrigins: (process.env.FRONTEND_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',').map((origin) => origin.trim()).filter(Boolean),
  dataDir: path.resolve(backendRoot, process.env.DATA_DIR || 'data'),
};
