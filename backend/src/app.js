import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev mode for local testing
    },
    credentials: true,
  })
);

// Logging
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register API Routes
app.use('/', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Central Error Handler Middleware
app.use(errorHandler);

export default app;
