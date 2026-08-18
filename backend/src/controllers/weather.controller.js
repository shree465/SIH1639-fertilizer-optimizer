import { getWeather as fetchWeather } from '../services/weather.service.js';

export const getWeather = async (req, res, next) => {
  try {
    const result = await fetchWeather(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
