import { Router } from 'express';
import { requires } from '../authorization/requires.js';
import { listFlags, updateFlag } from './service.js';

export const flagsRouter = Router();

flagsRouter.get('/', requires('flags.read'), (req, res) => {
  res.json(listFlags());
});

flagsRouter.patch('/:id', requires('flags.write'), (req, res, next) => {
  try {
    res.json(updateFlag(req.user, req.params.id, req.body ?? {}));
  } catch (err) {
    next(err);
  }
});
