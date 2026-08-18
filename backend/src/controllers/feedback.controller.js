import { saveFeedback } from '../services/feedback.service.js';

export const postFeedback = (req, res, next) => {
  try {
    const payload = req.body || {};
    const result = saveFeedback(payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
