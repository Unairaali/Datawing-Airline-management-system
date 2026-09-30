const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success:false, errors: errors.array() });
    const { name, email, password, phone } = req.body;
    const user = await User.create({ name, email, password, phone });
    const token = generateToken(user._id);
    res.status(201).json({ success:true, message:'Account created', token,
      user: { id:user._id, name:user.name, email:user.email, role:user.role, isVIP:user.isVIP }
    });
  } catch(err){ next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success:false, message:'Invalid credentials' });
    user.lastActive = Date.now();
    await user.save({ validateBeforeSave:false });
    const token = generateToken(user._id);
    res.json({ success:true, message:'Logged in', token,
      user: { id:user._id, name:user.name, email:user.email, role:user.role, isVIP:user.isVIP }
    });
  } catch(err){ next(err); }
};

exports.getProfile = async (req, res) => {
  res.json({ success:true, user: {
    id:req.user._id, name:req.user.name, email:req.user.email,
    role:req.user.role, isVIP:req.user.isVIP,
    totalBookings:req.user.totalBookings, createdAt:req.user.createdAt
  }});
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, passport } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone, passport }, { new:true });
    res.json({ success:true, user });
  } catch(err){ next(err); }
};
