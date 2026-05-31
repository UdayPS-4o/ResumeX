// Kanban board: column metadata CRUD + the full board snapshot (columns + cards
// grouped by column). Card CRUD stays in routes/applications.js. All behind
// requireAuth.

import { Router } from 'express';
import * as appsRepo from '../repo/applications.js';
import * as columnsRepo from '../repo/boardColumns.js';

const router = Router();

// Full board: ordered columns + cards grouped by column id.
router.get('/', (req, res) => {
  res.json(appsRepo.board_(req.user.id));
});

router.get('/columns', (req, res) => {
  res.json({ columns: columnsRepo.list(req.user.id) });
});

router.post('/columns', (req, res) => {
  res.status(201).json({ column: columnsRepo.create(req.user.id, req.body || {}) });
});

router.post('/columns/reorder', (req, res) => {
  const columns = columnsRepo.reorder(req.user.id, req.body?.ids || []);
  res.json({ columns });
});

router.patch('/columns/:id', (req, res) => {
  const column = columnsRepo.update(req.user.id, req.params.id, req.body || {});
  if (!column) return res.status(404).json({ error: 'Column not found' });
  res.json({ column });
});

router.delete('/columns/:id', (req, res) => {
  const result = columnsRepo.remove(req.user.id, req.params.id, req.body?.reassignTo || null);
  if (!result.ok) {
    const status = result.reason === 'last_column' ? 409 : 404;
    const error =
      result.reason === 'last_column'
        ? 'A board needs at least one column.'
        : 'Column not found';
    return res.status(status).json({ error });
  }
  res.json(result);
});

export default router;
