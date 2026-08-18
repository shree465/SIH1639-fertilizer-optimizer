import { getSoilCardById } from '../services/soilLookup.service.js';

export const getSoilLookup = (req, res, next) => {
  try {
    const { cardId } = req.params;
    const result = getSoilCardById(cardId);
    if (!result) {
      return res.status(404).json({ detail: `Soil Health Card ${cardId} not found` });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};
