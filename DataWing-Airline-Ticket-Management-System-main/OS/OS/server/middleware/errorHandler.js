// errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('💥', err.message);
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(', ') });
  }
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server Error' });
};
module.exports = errorHandler;
