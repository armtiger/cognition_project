import { Router } from 'express';
import { requires } from '../authorization/requires.js';
import { listCases, decide } from './service.js';

export const kycRouter = Router();

kycRouter.get('/', requires('kyc.read'), (req, res) => {
  res.json(listCases());
});

kycRouter.post('/:id/decision', requires('kyc.decide'), (req, res, next) => {
  try {
    const { status, note, version } = req.body ?? {};
    res.json(decide(req.user, req.params.id, { status, note, version }));
  } catch (err) {
    next(err);
  }
});
