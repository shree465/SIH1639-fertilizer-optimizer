import { calculateEconomics } from '../services/economics.service.js';

export const postEconomics = (req, res, next) => {
  try {
    const payload = req.body || {};
    const result = calculateEconomics(payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
