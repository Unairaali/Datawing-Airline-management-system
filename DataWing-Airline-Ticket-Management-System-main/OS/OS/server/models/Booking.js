const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  bookingRef:  { type: String, unique: true },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flight:      { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },
  passengers:  [{ name: String, age: Number, passport: String, seat: String }],
  seatClass:   { type: String, enum: ['economy','business','first'], default: 'economy' },
  totalPrice:  { type: Number, required: true },
  status:      { type: String, enum: ['pending','confirmed','cancelled','checked-in'], default: 'pending' },
  priority:    { type: Number, default: 3 }, // 1=VIP, 2=business, 3=economy
  arrivalTime: { type: Date, default: Date.now }, // when booking request arrived (for FCFS)
  burstTime:   { type: Number, default: 5 },      // estimated processing time
  algorithm:   { type: String, default: 'fcfs' },
  waitingTime: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['unpaid','paid','refunded'], default: 'unpaid' },
  createdAt:   { type: Date, default: Date.now }
});

// Auto-generate booking reference
BookingSchema.pre('save', function(next) {
  if (!this.bookingRef) {
    this.bookingRef = 'DW' + Date.now().toString(36).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Booking', BookingSchema);
