import { calculateRecommendation } from '../services/nutrientEngine.service.js';

export const postRecommend = (req, res, next) => {
  try {
    const payload = req.body || {};
    const result = calculateRecommendation(payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
