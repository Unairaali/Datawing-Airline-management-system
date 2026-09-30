const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { dispatch, computeStats } = require('../services/schedulerService');

// POST process payment
exports.processPayment = async (req, res, next) => {
  try {
    const { bookingId, method = 'card' } = req.body;
    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
    if (!booking) return res.status(404).json({ success:false, message:'Booking not found' });

    const payment = await Payment.create({
      user: req.user._id, booking: bookingId,
      amount: booking.totalPrice, method,
      burstTime: 2 + Math.floor(Math.random() * 5),
      status: 'queued'
    });

    // Simulate processing
    setTimeout(async () => {
      payment.status = 'completed';
      await payment.save();
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      await booking.save();
      const io = req.app.get('io');
      if (io) io.emit('payment:complete', { ref: payment.paymentRef, amount: payment.amount });
    }, 2000);

    res.status(201).json({ success:true, message:'Payment queued', data:payment });
  } catch(err){ next(err); }
};

// GET payment history
exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).populate('booking').sort('-createdAt');
    res.json({ success:true, data:payments });
  } catch(err){ next(err); }
};

// POST simulate payment queue with RR or SRTF
exports.simulatePaymentQueue = async (req, res, next) => {
  try {
    const { algorithm = 'rr', quantum = 2 } = req.body;
    const payments = await Payment.find({ status:'queued' }).sort('createdAt').limit(15);
    const tasks = payments.length ? payments.map((p,i) => ({
      id:p._id.toString(), label:p.paymentRef, arrival:i,
      burst:p.burstTime||3, priority:2
    })) : Array.from({length:6},(_,i)=>({ id:`P${i+1}`, label:`PAY${i+1}`, arrival:i*Math.floor(Math.random()*3), burst:1+Math.floor(Math.random()*6), priority:2 }));

    const { schedule, results } = dispatch(algorithm, tasks, quantum);
    const stats = computeStats(results, schedule);
    res.json({ success:true, data:{ algorithm, schedule, results, stats } });
  } catch(err){ next(err); }
};
