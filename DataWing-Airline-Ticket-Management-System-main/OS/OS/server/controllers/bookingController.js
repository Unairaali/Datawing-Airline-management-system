const Booking = require('../models/Booking');
const Flight  = require('../models/Flight');
const User    = require('../models/User');
const { dispatch, computeStats } = require('../services/schedulerService');

// POST create booking
exports.createBooking = async (req, res, next) => {
  try {
    const { flightId, passengers, seatClass = 'economy' } = req.body;
    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ success:false, message:'Flight not found' });
    if (flight.availableSeats <= 0) return res.status(400).json({ success:false, message:'No seats available' });

    const priceMap = { economy: flight.economyPrice, business: flight.businessPrice, first: flight.firstClassPrice };
    const totalPrice = priceMap[seatClass] * (passengers?.length || 1);
    const priority = req.user.isVIP ? 1 : seatClass === 'first' ? 1 : seatClass === 'business' ? 2 : 3;

    const booking = await Booking.create({
      user: req.user._id, flight: flightId,
      passengers: passengers || [{ name: req.user.name }],
      seatClass, totalPrice, priority,
      burstTime: 3 + Math.floor(Math.random() * 4),
      algorithm: 'fcfs'
    });

    flight.availableSeats -= (passengers?.length || 1);
    await flight.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalBookings: 1 } });

    const io = req.app.get('io');
    if (io) io.emit('booking:new', { booking: booking.bookingRef, user: req.user.name, flight: flight.flightNumber });

    res.status(201).json({ success:true, message:'Booking confirmed', data: await booking.populate('flight') });
  } catch(err){ next(err); }
};

// GET user bookings
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).populate('flight').sort('-createdAt');
    res.json({ success:true, count:bookings.length, data:bookings });
  } catch(err){ next(err); }
};

// GET all bookings (admin/staff)
exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find().populate('flight user').sort('-createdAt').limit(100);
    res.json({ success:true, count:bookings.length, data:bookings });
  } catch(err){ next(err); }
};

// PUT cancel booking
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ success:false, message:'Booking not found' });
    booking.status = 'cancelled';
    await booking.save();
    await Flight.findByIdAndUpdate(booking.flight, { $inc: { availableSeats: booking.passengers.length || 1 } });
    res.json({ success:true, message:'Booking cancelled' });
  } catch(err){ next(err); }
};

// POST simulate booking queue with FCFS or Round Robin
exports.simulateQueue = async (req, res, next) => {
  try {
    const { algorithm = 'fcfs', quantum = 2 } = req.body;
    const bookings = await Booking.find({ status:'pending' }).sort('createdAt').limit(15);
    if (!bookings.length) return res.status(400).json({ success:false, message:'No pending bookings' });

    const tasks = bookings.map((b,i) => ({
      id: b._id.toString(), label: b.bookingRef,
      arrival: i, burst: b.burstTime || 3, priority: b.priority
    }));

    const { schedule, results } = dispatch(algorithm, tasks, quantum);
    const stats = computeStats(results, schedule);
    res.json({ success:true, data: { algorithm, schedule, results, stats } });
  } catch(err){ next(err); }
};
