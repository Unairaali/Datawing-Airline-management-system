require('dotenv').config();
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');
const path    = require('path');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { protect, authorize } = require('./middleware/auth');

connectDB();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin:'*' } });
app.set('io', io);

io.on('connection', socket => {
  socket.on('join:room', room => socket.join(room));
  socket.on('flight:emergency', data => io.emit('flight:emergency', data));
});

app.use(cors({ origin:'*' }));
app.use(express.json({ limit:'2mb' }));
app.use(express.urlencoded({ extended:true }));
app.use('/api', apiLimiter);

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// Flight routes
app.use('/api/flights', require('./routes/flights'));

// Booking routes
app.use('/api/bookings', require('./routes/bookings'));

// Payment routes
const payR = express.Router();
const pc   = require('./controllers/paymentController');
payR.post('/',         protect, pc.processPayment);
payR.get('/my',        protect, pc.getPayments);
payR.post('/simulate', protect, pc.simulatePaymentQueue);
app.use('/api/payments', payR);

// Complaint routes
const cmpR = express.Router();
const cc   = require('./controllers/complaintController');
cmpR.post('/',           protect, cc.createComplaint);
cmpR.get('/my',          protect, cc.getMyComplaints);
cmpR.get('/',            protect, authorize('staff','admin'), cc.getAllComplaints);
cmpR.put('/:id/resolve', protect, authorize('staff','admin'), cc.resolveComplaint);
cmpR.post('/simulate',   protect, cc.simulateComplaintQueue);
app.use('/api/complaints', cmpR);

// Analytics routes
const anaR = express.Router();
const ac   = require('./controllers/analyticsController');
anaR.get('/dashboard', protect, authorize('staff','admin'), ac.getDashboardStats);
anaR.get('/compare',   protect, ac.compareAlgorithms);
app.use('/api/analytics', anaR);

// Health check
app.get('/api/health', (req, res) => res.json({ success:true, message:'DataWing running!' }));

// Serve frontend
app.use(express.static(path.join(__dirname, '../client')));
app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, '../client/index.html')));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n✈  DataWing: http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🌱 Env: ${process.env.NODE_ENV}\n`);
});