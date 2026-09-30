const User    = require('../models/User');
const Flight  = require('../models/Flight');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { Complaint } = require('../models/Complaint');
const { dispatch, computeStats } = require('../services/schedulerService');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, totalFlights, totalBookings, totalPayments, totalComplaints,
           confirmedBookings, pendingBookings] = await Promise.all([
      User.countDocuments(),
      Flight.countDocuments(),
      Booking.countDocuments(),
      Payment.countDocuments({ status:'completed' }),
      Complaint.countDocuments(),
      Booking.countDocuments({ status:'confirmed' }),
      Booking.countDocuments({ status:'pending' }),
    ]);

    const revenue = await Payment.aggregate([
      { $match: { status:'completed' } },
      { $group: { _id:null, total: { $sum:'$amount' } } }
    ]);

    const recentBookings = await Booking.find().populate('flight user','flightNumber name').sort('-createdAt').limit(5);

    res.json({ success:true, data:{
      totalUsers, totalFlights, totalBookings, totalPayments,
      totalComplaints, confirmedBookings, pendingBookings,
      totalRevenue: revenue[0]?.total || 0,
      recentBookings
    }});
  } catch(err){ next(err); }
};

exports.compareAlgorithms = async (req, res, next) => {
  try {
    const tasks = Array.from({length:6},(_,i)=>({
      id:`T${i+1}`, label:`Task${i+1}`,
      arrival: i*Math.floor(Math.random()*3),
      burst: 1+Math.floor(Math.random()*8),
      priority: 1+Math.floor(Math.random()*3)
    }));
    const algos = ['fcfs','sjf','srtf','rr','priority','priority_pre'];
    const labels = { fcfs:'FCFS', sjf:'SJF', srtf:'SRTF', rr:'Round Robin', priority:'Priority NP', priority_pre:'Priority Pre' };
    const results = algos.map(algo => {
      const { schedule, results: res } = dispatch(algo, tasks, 2);
      const stats = computeStats(res, schedule);
      return { algo, label:labels[algo], ...stats };
    });
    res.json({ success:true, data: results });
  } catch(err){ next(err); }
};
