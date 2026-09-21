import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { apiRouter } from './routes.js';

export const app = express();
app.disable('x-powered-by');
app.use(cors({
  origin: config.frontendOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'SISTEM AKAMEDIK',
    school: 'SMP Negeri 1 Pangkalan Kerinci',
    kabupaten: 'Pelalawan',
    provinsi: 'Riau',
    timestamp: new Date().toISOString(),
  });
});
app.use('/api', apiRouter);
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Format JSON tidak valid.' });
    return;
  }
  if (error.type === 'entity.too.large') {
    res.status(413).json({ error: 'Ukuran permintaan terlalu besar.' });
    return;
  }
  console.error('[backend]', error);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
};
app.use(errorHandler);
