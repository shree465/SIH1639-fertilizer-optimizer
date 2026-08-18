export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res, message = 'An error occurred', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
};
