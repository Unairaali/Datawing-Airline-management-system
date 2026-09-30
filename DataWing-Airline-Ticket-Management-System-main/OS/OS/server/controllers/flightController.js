const Flight = require('../models/Flight');
const { dispatch, computeStats } = require('../services/schedulerService');

// GET all flights
exports.getFlights = async (req, res, next) => {
  try {
    const { origin, destination, date, status } = req.query;
    const filter = {};
    if (origin) filter.origin = new RegExp(origin, 'i');
    if (destination) filter.destination = new RegExp(destination, 'i');
    if (status) filter.status = status;
    const flights = await Flight.find(filter).sort('departureTime').limit(50);
    res.json({ success:true, count:flights.length, data:flights });
  } catch(err){ next(err); }
};

// GET single flight
exports.getFlight = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ success:false, message:'Flight not found' });
    res.json({ success:true, data:flight });
  } catch(err){ next(err); }
};

// POST create flight (staff/admin)
exports.createFlight = async (req, res, next) => {
  try {
    const flight = await Flight.create(req.body);
    const io = req.app.get('io');
    if (io) io.emit('flight:new', { flight });
    res.status(201).json({ success:true, data:flight });
  } catch(err){ next(err); }
};

// PUT update flight
exports.updateFlight = async (req, res, next) => {
  try {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new:true });
    if (!flight) return res.status(404).json({ success:false, message:'Flight not found' });
    const io = req.app.get('io');
    if (io) io.emit('flight:update', { flight });
    res.json({ success:true, data:flight });
  } catch(err){ next(err); }
};

// DELETE flight
exports.deleteFlight = async (req, res, next) => {
  try {
    await Flight.findByIdAndDelete(req.params.id);
    res.json({ success:true, message:'Flight deleted' });
  } catch(err){ next(err); }
};

// POST schedule flights using Priority/SJF
exports.scheduleFlights = async (req, res, next) => {
  try {
    const { algorithm = 'priority' } = req.body;
    const flights = await Flight.find({ status: 'scheduled' }).limit(20);
    if (!flights.length) return res.status(400).json({ success:false, message:'No scheduled flights' });

    const tasks = flights.map((f, i) => ({
      id: f._id.toString(),
      label: f.flightNumber,
      arrival: i,
      burst: Math.ceil((new Date(f.arrivalTime) - new Date(f.departureTime)) / 60000 / 60) || 2,
      priority: f.priority
    }));

    const { schedule, results } = dispatch(algorithm, tasks);
    const stats = computeStats(results, schedule);
    res.json({ success:true, data: { algorithm, schedule, results, stats } });
  } catch(err){ next(err); }
};

// Seed demo flights
exports.seedFlights = async (req, res, next) => {
  try {
    await Flight.deleteMany({});
    const now = new Date();
    const flights = [
      { flightNumber:'DW101', origin:'Karachi', destination:'Lahore',   departureTime: new Date(now.getTime()+2*3600000), arrivalTime: new Date(now.getTime()+3.5*3600000), duration:90,  economyPrice:120, businessPrice:380, firstClassPrice:750, priority:3, gate:'A1', availableSeats:150, totalSeats:150 },
      { flightNumber:'DW102', origin:'Lahore',  destination:'Islamabad',departureTime: new Date(now.getTime()+3*3600000), arrivalTime: new Date(now.getTime()+4*3600000),   duration:60,  economyPrice:80,  businessPrice:250, firstClassPrice:500, priority:2, gate:'B3', availableSeats:120, totalSeats:120 },
      { flightNumber:'DW103', origin:'Karachi', destination:'Dubai',    departureTime: new Date(now.getTime()+5*3600000), arrivalTime: new Date(now.getTime()+8*3600000),   duration:180, economyPrice:350, businessPrice:900, firstClassPrice:1800,priority:1, gate:'C5', availableSeats:200, totalSeats:200 },
      { flightNumber:'DW104', origin:'Islamabad',destination:'London',  departureTime: new Date(now.getTime()+8*3600000), arrivalTime: new Date(now.getTime()+16*3600000),  duration:480, economyPrice:800, businessPrice:2200,firstClassPrice:4500,priority:2, gate:'D2', availableSeats:180, totalSeats:180 },
      { flightNumber:'DW105', origin:'Lahore',  destination:'Dubai',    departureTime: new Date(now.getTime()+1*3600000), arrivalTime: new Date(now.getTime()+4*3600000),   duration:180, economyPrice:300, businessPrice:800, firstClassPrice:1600,priority:3, gate:'A4', availableSeats:160, totalSeats:160 },
      { flightNumber:'DW106', origin:'Karachi', destination:'Islamabad',departureTime: new Date(now.getTime()+4*3600000), arrivalTime: new Date(now.getTime()+5.5*3600000), duration:90,  economyPrice:100, businessPrice:320, firstClassPrice:650, priority:3, gate:'B1', availableSeats:140, totalSeats:140 },
    ];
    const created = await Flight.insertMany(flights);
    res.json({ success:true, message:`${created.length} flights seeded`, data:created });
  } catch(err){ next(err); }
};
