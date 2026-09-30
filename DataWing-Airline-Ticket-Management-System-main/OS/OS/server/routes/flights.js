// routes/flights.js
const express = require('express');
const r = express.Router();
const c = require('../controllers/flightController');
const { protect, authorize } = require('../middleware/auth');
r.get('/',           c.getFlights);
r.get('/:id',        c.getFlight);
r.post('/',          protect, authorize('staff','admin'), c.createFlight);
r.put('/:id',        protect, authorize('staff','admin'), c.updateFlight);
r.delete('/:id',     protect, authorize('admin'), c.deleteFlight);
r.post('/schedule',  protect, authorize('staff','admin'), c.scheduleFlights);
r.post('/seed',      c.seedFlights);
module.exports = r;
