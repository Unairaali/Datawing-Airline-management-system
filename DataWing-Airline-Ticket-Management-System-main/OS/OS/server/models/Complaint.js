const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  ticketRef: { type: String, unique: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject:   { type: String, required: true },
  message:   { type: String, required: true },
  category:  { type: String, enum: ['booking','flight','payment','seat','other'], default: 'other' },
  priority:  { type: Number, default: 3 }, // 1=urgent, 2=VIP, 3=normal
  status:    { type: String, enum: ['queued','in-progress','resolved','closed'], default: 'queued' },
  response:  { type: String, default: '' },
  arrivalTime: { type: Date, default: Date.now },
  burstTime:   { type: Number, default: 4 },
  waitingTime: { type: Number, default: 0 },
  algorithm:   { type: String, default: 'priority' },
  createdAt:   { type: Date, default: Date.now }
});

ComplaintSchema.pre('save', function(next) {
  if (!this.ticketRef) this.ticketRef = 'TKT' + Date.now().toString(36).toUpperCase();
  next();
});

const SchedulingLogSchema = new mongoose.Schema({
  module:    { type: String },
  algorithm: { type: String },
  tasks:     [{ pid: String, arrival: Number, burst: Number, priority: Number, completion: Number, waiting: Number, turnaround: Number }],
  stats:     { awt: Number, atat: Number, cpuUtil: Number, throughput: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  Complaint: mongoose.model('Complaint', ComplaintSchema),
  SchedulingLog: mongoose.model('SchedulingLog', SchedulingLogSchema)
};
