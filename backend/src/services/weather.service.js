import axios from 'axios';
import config from '../config/env.js';

export const getWeather = async (query = {}) => {
  const { lat, lon, city = 'Nashik', state = 'Maharashtra' } = query;

  if (config.openWeatherApiKey && (lat || city)) {
    try {
      const url = lat && lon
        ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${config.openWeatherApiKey}`
        : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&units=metric&appid=${config.openWeatherApiKey}`;

      const res = await axios.get(url, { timeout: 5000 });
      const data = res.data;

      const tempC = Math.round(data.main.temp);
      const humidity = data.main.humidity;
      const weatherCondition = data.weather[0]?.main || 'Clear';
      const rainExpected = weatherCondition.toLowerCase().includes('rain');

      return {
        isLive: true,
        location: `${data.name || city}, ${state}`,
        temperatureC: tempC,
        humidityPercent: humidity,
        condition: weatherCondition,
        description: data.weather[0]?.description || 'Clear sky',
        rainfallForecastMm: rainExpected ? 15.0 : 0.0,
        advisory: rainExpected
          ? 'Heavy rain forecast in next 24-48 hours. Delay top-dressing Urea application to prevent nutrient runoff/leaching loss.'
          : 'Favourable weather conditions for top-dressing fertilizer application.',
      };
    } catch (e) {
      console.warn('OpenWeather API call failed, serving fallback data:', e.message);
    }
  }

  // Realistic Fallback Weather Data
  return {
    isLive: false,
    location: `${city}, ${state}`,
    temperatureC: 29,
    humidityPercent: 68,
    condition: 'Partly Cloudy',
    description: 'Partly cloudy with mild breeze',
    rainfallForecastMm: 2.5,
    advisory: 'Moderate soil moisture. Ideal window for top-dressing Urea and MOP within the next 48 hours.',
  };
};

export default {
  getWeather,
};
