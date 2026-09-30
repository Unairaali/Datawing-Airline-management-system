const mongoose = require('mongoose');

const FlightSchema = new mongoose.Schema({
  flightNumber: { type: String, required: true, unique: true },
  airline:      { type: String, default: 'DataWing Air' },
  origin:       { type: String, required: true },
  destination:  { type: String, required: true },
  departureTime:{ type: Date, required: true },
  arrivalTime:  { type: Date, required: true },
  duration:     { type: Number }, // minutes
  totalSeats:   { type: Number, default: 150 },
  availableSeats:{ type: Number, default: 150 },
  economySeats:  { type: Number, default: 100 },
  businessSeats: { type: Number, default: 40 },
  firstClassSeats:{ type: Number, default: 10 },
  economyPrice:  { type: Number, default: 150 },
  businessPrice: { type: Number, default: 450 },
  firstClassPrice:{ type: Number, default: 900 },
  status: { type: String, enum: ['scheduled','boarding','departed','arrived','delayed','cancelled'], default: 'scheduled' },
  priority: { type: Number, default: 3 }, // 1=emergency, 2=VIP, 3=normal
  delayMinutes: { type: Number, default: 0 },
  gate: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Flight', FlightSchema);
