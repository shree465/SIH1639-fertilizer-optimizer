import { calculateLccRecommendation } from '../services/lcc.service.js';

export const postLccReading = (req, res, next) => {
  try {
    const payload = req.body || {};
    const result = calculateLccRecommendation(payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
