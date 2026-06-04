import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import chatRouter from './routes/chat.js';
import compileRouter from './routes/compile.js';
import templatesRouter from './routes/templates.js';
import renderRouter from './routes/render.js';
import extractRouter from './routes/extract.js';
import atsRouter from './routes/ats.js';
import { compileInfo } from './services/compiler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' })); // headroom for base64 image attachments

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'resumex-backend', compile: compileInfo() });
});

app.use('/api/chat', chatRouter);
app.use('/api/compile', compileRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/render', renderRouter);
app.use('/api/extract', extractRouter);
app.use('/api/ats-score', atsRouter);

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const port = Number(process.env.PORT || 8000);
app.listen(port, () => {
  console.log(`Resumex backend listening on http://localhost:${port}`);
});
