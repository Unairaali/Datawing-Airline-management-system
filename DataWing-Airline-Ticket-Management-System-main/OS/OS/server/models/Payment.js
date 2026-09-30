const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  paymentRef:    { type: String, unique: true },
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  booking:       { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  amount:        { type: Number, required: true },
  method:        { type: String, enum: ['card','paypal','bank','wallet'], default: 'card' },
  status:        { type: String, enum: ['queued','processing','completed','failed'], default: 'queued' },
  arrivalTime:   { type: Date, default: Date.now },
  burstTime:     { type: Number, default: 3 },   // processing time in seconds
  remainingTime: { type: Number, default: 3 },
  waitingTime:   { type: Number, default: 0 },
  algorithm:     { type: String, default: 'rr' },
  quantum:       { type: Number, default: 2 },
  createdAt:     { type: Date, default: Date.now }
});

PaymentSchema.pre('save', function(next) {
  if (!this.paymentRef) this.paymentRef = 'PAY' + Date.now().toString(36).toUpperCase();
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);
