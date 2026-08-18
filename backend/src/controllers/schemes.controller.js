import { matchSchemes } from '../services/schemes.service.js';

export const postSchemesMatch = (req, res, next) => {
  try {
    const payload = req.body || {};
    const result = matchSchemes(payload);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
