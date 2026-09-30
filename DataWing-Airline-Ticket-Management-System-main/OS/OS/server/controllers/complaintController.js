const { Complaint } = require('../models/Complaint');
const { dispatch, computeStats } = require('../services/schedulerService');

exports.createComplaint = async (req, res, next) => {
  try {
    const { subject, message, category } = req.body;
    const priority = req.user.isVIP ? 1 : category === 'flight' ? 2 : 3;
    const complaint = await Complaint.create({ user:req.user._id, subject, message, category, priority, burstTime: 3+Math.floor(Math.random()*4) });
    res.status(201).json({ success:true, message:'Complaint submitted', data:complaint });
  } catch(err){ next(err); }
};

exports.getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ user:req.user._id }).sort('-createdAt');
    res.json({ success:true, data:complaints });
  } catch(err){ next(err); }
};

exports.getAllComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find().populate('user','name email').sort('-createdAt').limit(50);
    res.json({ success:true, data:complaints });
  } catch(err){ next(err); }
};

exports.resolveComplaint = async (req, res, next) => {
  try {
    const { response } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status:'resolved', response }, { new:true });
    res.json({ success:true, data:complaint });
  } catch(err){ next(err); }
};

exports.simulateComplaintQueue = async (req, res, next) => {
  try {
    const { algorithm = 'priority' } = req.body;
    const complaints = await Complaint.find({ status:'queued' }).sort('arrivalTime').limit(15);
    const tasks = complaints.length ? complaints.map((c,i)=>({ id:c._id.toString(), label:c.ticketRef, arrival:i, burst:c.burstTime||4, priority:c.priority }))
      : Array.from({length:6},(_,i)=>({ id:`C${i+1}`, label:`TKT${i+1}`, arrival:i, burst:2+Math.floor(Math.random()*5), priority:1+Math.floor(Math.random()*3) }));
    const { schedule, results } = dispatch(algorithm, tasks);
    const stats = computeStats(results, schedule);
    res.json({ success:true, data:{ algorithm, schedule, results, stats } });
  } catch(err){ next(err); }
};
