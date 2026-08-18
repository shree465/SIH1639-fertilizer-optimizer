import { errorResponse } from '../utils/responseHandler.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[Error Middleware]:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
};
