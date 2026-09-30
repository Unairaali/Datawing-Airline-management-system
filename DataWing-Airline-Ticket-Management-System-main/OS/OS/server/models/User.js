const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role:     { type: String, enum: ['customer','staff','admin'], default: 'customer' },
  phone:    { type: String, default: '' },
  passport: { type: String, default: '' },
  isVIP:    { type: Boolean, default: false },
  totalBookings: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  createdAt:  { type: Date, default: Date.now }
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', UserSchema);
