import app from './app.js';
import config from './config/env.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 SIH1639 Fertilizer Optimizer Node/Express Backend`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`⚙️  Environment: ${config.nodeEnv}`);
  console.log(`===================================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
