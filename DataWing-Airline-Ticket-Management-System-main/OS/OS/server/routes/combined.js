const express = require('express');
const { protect, authorize } = require('../middleware/auth');

// ── Payment Router ──
const paymentRouter = express.Router();
const pc = require('../controllers/paymentController');
paymentRouter.post('/',         protect, pc.processPayment);
paymentRouter.get('/my',        protect, pc.getPayments);
paymentRouter.post('/simulate', protect, pc.simulatePaymentQueue);

// ── Complaint Router ──
const complaintRouter = express.Router();
const cc = require('../controllers/complaintController');
complaintRouter.post('/',           protect, cc.createComplaint);
complaintRouter.get('/my',          protect, cc.getMyComplaints);
complaintRouter.get('/',            protect, authorize('staff','admin'), cc.getAllComplaints);
complaintRouter.put('/:id/resolve', protect, authorize('staff','admin'), cc.resolveComplaint);
complaintRouter.post('/simulate',   protect, cc.simulateComplaintQueue);

// ── Analytics Router ──
const analyticsRouter = express.Router();
const ac = require('../controllers/analyticsController');
analyticsRouter.get('/dashboard', protect, authorize('staff','admin'), ac.getDashboardStats);
analyticsRouter.get('/compare',   protect, ac.compareAlgorithms);

module.exports = { paymentRouter, complaintRouter, analyticsRouter };