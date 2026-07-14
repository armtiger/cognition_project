import { Router } from 'express';
import { requires } from '../authorization/requires.js';
import { listRefunds, resolveApproval, processRefund } from './service.js';

export const refundsRouter = Router();

refundsRouter.get('/', requires('refunds.read'), (req, res) => {
  res.json(listRefunds());
});

refundsRouter.post('/:id/approve', requires('refunds.approve'), (req, res, next) => {
  try {
    const { decision, version } = req.body ?? {};
    res.json(resolveApproval(req.user, req.params.id, { decision, version }));
  } catch (err) {
    next(err);
  }
});

refundsRouter.post('/:id/process', requires('refunds.process'), (req, res, next) => {
  try {
    const { version } = req.body ?? {};
    res.json(processRefund(req.user, req.params.id, { version }));
  } catch (err) {
    next(err);
  }
});
