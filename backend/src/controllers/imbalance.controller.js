import { calculateImbalance } from '../services/imbalance.service.js';

export const postImbalance = (req, res, next) => {
  try {
    const payload = req.body || {};
    const result = calculateImbalance(payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
