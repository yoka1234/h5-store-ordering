function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err);

  const status = err.status || 500;
  const message = err.message || '服务器内部错误';

  res.status(status).json({
    error: true,
    message,
  });
}

function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { errorHandler, createError };
