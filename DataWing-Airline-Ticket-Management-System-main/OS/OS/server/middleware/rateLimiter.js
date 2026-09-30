const rateLimit = require('express-rate-limit');
exports.apiLimiter  = rateLimit({ windowMs: 15*60*1000, max: 300, message: { success:false, message:'Too many requests' } });
exports.authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20,  message: { success:false, message:'Too many auth attempts' } });
