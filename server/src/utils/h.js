// async route wrapper -> forwards errors to the error handler
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
