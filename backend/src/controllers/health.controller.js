import config from '../config/env.js';

export const getHealth = (req, res) => {
  res.json({
    status: 'ok',
    env: config.nodeEnv,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
};
