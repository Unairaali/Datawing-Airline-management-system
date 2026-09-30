/* ══════════════════════════════════════════════
   DataWing Airlines — script.js FIXED
   Full-tab layout, all 6 algorithms
══════════════════════════════════════════════ */
"use strict";

const API    = '';
const COLORS = ['#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16','#e879f9','#fb7185','#34d399','#fbbf24'];
const ALGO_COLORS = { fcfs:'#0ea5e9', rr:'#10b981', sjf:'#f59e0b', srtf:'#8b5cf6', priority:'#ef4444', priority_pre:'#ec4899' };

let authToken   = localStorage.getItem('dw_token') || null;
let currentUser = JSON.parse(localStorage.getItem('dw_user') || 'null');
let flights     = [];
let tasks       = [];
let emTasks     = [];
let fsTasks     = [];
let socket      = null;

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initClock();
  initTheme();
  initSocket();
  updateAuthUI();
  generateSeatMap();
  onModuleChange();
  initFlightScheduleTasks();
  setTimeout(() => { loadDashboard(); loadFlights(); }, 600);
  setupModalClose();
  heroTyping();
});

function initLoader() {
  const msgs = ['Preparing for takeoff...','Loading flight data...','Connecting to server...','All systems go! ✈'];
  let i = 0;
  const iv = setInterval(() => {
    const el = document.getElementById('loaderMsg');
    if (el) el.textContent = msgs[i] || '';
    i++;
    if (i >= msgs.length) {
      clearInterval(iv);
      setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');
      }, 400);
    }
  }, 450);
}

function heroTyping() {
  const el = document.getElementById('heroTitle');
  if (!el) return;
  const txt = el.textContent;
  el.textContent = '';
  let i = 0;
  setTimeout(() => {
    const iv = setInterval(() => {
      el.textContent += txt[i++];
      if (i >= txt.length) clearInterval(iv);
    }, 55);
  }, 1800);
}

function initClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const tick = () => { el.textContent = new Date().toLocaleTimeString(); };
  tick();
  setInterval(tick, 1000);
}

function initTheme() {
  const t = localStorage.getItem('dw_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (icon)  icon.textContent  = t === 'dark' ? '☀' : '☾';
  if (label) label.textContent = t === 'dark' ? 'Light' : 'Dark';
}

function toggleTheme() {
  const cur  = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('dw_theme', next);
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (icon)  icon.textContent  = next === 'dark' ? '☀' : '☾';
  if (label) label.textContent = next === 'dark' ? 'Light' : 'Dark';
}

function toggleSidebar() {
  // no sidebar in this layout
}

// ════════════════════════════════════════════
// SOCKET.IO
// ════════════════════════════════════════════
function initSocket() {
  try {
    socket = io({ transports: ['websocket', 'polling'] });
    const pill = document.getElementById('socketPill');
    socket.on('connect', () => {
      if (pill) { pill.textContent = '● Live'; pill.classList.add('on'); }
    });
    socket.on('disconnect', () => {
      if (pill) { pill.textContent = '● Offline'; pill.classList.remove('on'); }
    });
    socket.on('booking:new',      d => addActivity(`🎫 New booking: ${d.booking} — ${d.user} on ${d.flight}`));
    socket.on('flight:new',       d => { addActivity(`✈ New flight: ${d.flight?.flightNumber}`); loadFlights(); });
    socket.on('flight:update',    d => { addActivity(`✏ Updated: ${d.flight?.flightNumber}`); loadFlights(); });
    socket.on('payment:complete', d => addActivity(`💳 Payment ${d.ref} — $${d.amount}`));
    socket.on('flight:emergency', d => { showNotif(`🚨 EMERGENCY: ${d.message}`, 'error'); addActivity(`🚨 ${d.message}`); });
  } catch {
    const pill = document.getElementById('socketPill');
    if (pill) pill.textContent = '● Offline';
  }
}

function addActivity(msg) {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  if (feed.querySelector('.empty-t')) feed.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'act-item';
  item.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  feed.insertBefore(item, feed.firstChild);
  if (feed.children.length > 12) feed.removeChild(feed.lastChild);
}

// ════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════
function goTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const pg = document.getElementById(`page-${page}`);
  if (pg) pg.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  const titles = {
    dashboard:'Dashboard', flights:'Flight Management', booking:'Book Ticket',
    mybookings:'My Bookings', seats:'Seat Allocation', payment:'Payments',
    support:'Customer Support', scheduling:'CPU Task Scheduler',
    flightsched:'Flight Scheduling Module', emergency:'Emergency & Delay Mgmt',
    analytics:'Performance Analytics', admin:'Admin Panel'
  };
  const algoMap = {
    booking:'FCFS · Round Robin · SJF', flights:'Priority · SJF',
    seats:'Priority NP · Priority Pre · FCFS', payment:'Round Robin · SRTF · SJF',
    support:'Priority NP · Priority Pre · FCFS', scheduling:'All 6 Algorithms',
    flightsched:'Round Robin · Priority · SJF · SRTF', emergency:'Priority Pre · SRTF · RR',
    analytics:'All 6 Algorithms'
  };

  const bc = document.getElementById('bcCurrent');
  const ba = document.getElementById('bcAlgo');
  if (bc) bc.textContent = titles[page] || page;
  if (ba) ba.textContent = algoMap[page] || '';

  if (page === 'mybookings') loadMyBookings();
  if (page === 'dashboard')  loadDashboard();
  if (page === 'payment')    { loadMyBookingsForPayment(); loadPaymentHistory(); }
  if (page === 'support')    loadMyComplaints();
  if (page === 'admin')      loadAdminStats();
  window.scrollTo(0, 0);
}

// ════════════════════════════════════════════
// API HELPER
// ════════════════════════════════════════════
async function api(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res  = await fetch(API + endpoint, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || data.errors?.[0]?.msg || 'Request failed');
  return data;
}

// ════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════
function updateAuthUI() {
  const isAuth  = !!authToken;
  const isAdmin = currentUser?.role === 'admin';
  const isStaff = ['staff','admin'].includes(currentUser?.role);

  document.getElementById('authBtns')?.classList.toggle('hidden', isAuth);
  document.getElementById('userBtns')?.classList.toggle('hidden', !isAuth);

  if (currentUser) {
    const av = document.getElementById('ucAvatar');
    const nm = document.getElementById('ucName');
    const rl = document.getElementById('ucRole');
    if (av) av.textContent = currentUser.name[0].toUpperCase();
    if (nm) nm.textContent = currentUser.name;
    if (rl) rl.textContent = currentUser.role;
  }

  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !isAdmin));
  document.querySelectorAll('.staff-only').forEach(el => el.classList.toggle('hidden', !isStaff));
}

async function login() {
  const email = document.getElementById('lgEmail').value.trim();
  const pass  = document.getElementById('lgPass').value;
  const err   = document.getElementById('lgError');
  err.textContent = '';
  if (!email || !pass) { err.textContent = 'All fields required'; return; }
  try {
    const data = await api('/api/auth/login', 'POST', { email, password: pass });
    authToken = data.token; currentUser = data.user;
    localStorage.setItem('dw_token', authToken);
    localStorage.setItem('dw_user',  JSON.stringify(currentUser));
    closeModal('loginModal');
    updateAuthUI();
    showNotif(`Welcome back, ${currentUser.name}! ✈`, 'success');
  } catch(e) { err.textContent = e.message; }
}

async function register() {
  const name  = document.getElementById('rgName').value.trim();
  const email = document.getElementById('rgEmail').value.trim();
  const pass  = document.getElementById('rgPass').value;
  const phone = document.getElementById('rgPhone').value.trim();
  const err   = document.getElementById('rgError');
  err.textContent = '';
  const emailRx = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|net|org|edu|io|co)$/;
  if (!name)                { err.textContent = 'Name required'; return; }
  if (!emailRx.test(email)) { err.textContent = 'Valid email required (e.g. user@gmail.com)'; return; }
  if (pass.length < 6)      { err.textContent = 'Password min 6 characters'; return; }
  try {
    const data = await api('/api/auth/register', 'POST', { name, email, password: pass, phone });
    authToken = data.token; currentUser = data.user;
    localStorage.setItem('dw_token', authToken);
    localStorage.setItem('dw_user',  JSON.stringify(currentUser));
    closeModal('registerModal');
    updateAuthUI();
    showNotif(`Welcome to DataWing, ${currentUser.name}! ✈`, 'success');
  } catch(e) { err.textContent = e.message; }
}

function logout() {
  authToken = null; currentUser = null;
  localStorage.removeItem('dw_token');
  localStorage.removeItem('dw_user');
  updateAuthUI();
  showNotif('Logged out safely');
}

// ════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════
async function loadDashboard() {
  try {
    const data = await api('/api/analytics/dashboard');
    const d = data.data;
    animCount('st-flights',   d.totalFlights   || 0);
    animCount('st-bookings',  d.totalBookings  || 0);
    animCount('st-users',     d.totalUsers     || 0);
    animCount('st-pending',   d.pendingBookings|| 0);
    animCount('st-complaints',d.totalComplaints|| 0);
    const rev = document.getElementById('st-revenue');
    if (rev) rev.textContent = '$' + Math.round(d.totalRevenue || 0);
    const au = document.getElementById('adm-users');
    const af = document.getElementById('adm-flights');
    const ab = document.getElementById('adm-bookings');
    const ar = document.getElementById('adm-revenue');
    if (au) au.textContent = d.totalUsers;
    if (af) af.textContent = d.totalFlights;
    if (ab) ab.textContent = d.totalBookings;
    if (ar) ar.textContent = '$' + Math.round(d.totalRevenue || 0);
  } catch {}
  updateDepBoard();
}

function updateDepBoard() {
  const board = document.getElementById('depBoard');
  if (!board || !flights.length) return;
  const rows = flights.slice(0, 5).map(f => {
    const t = new Date(f.departureTime).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const s = { scheduled:'ON TIME', delayed:'DELAYED', departed:'DEPARTED', boarding:'BOARDING' }[f.status] || f.status.toUpperCase();
    return `<div class="db-row"><span>${f.flightNumber}</span><span>${f.origin}→${f.destination}</span><span>${t}</span><span>${f.gate||'—'}</span></div>`;
  }).join('');
  board.innerHTML = `<div class="db-row db-hdr"><span>Flight</span><span>Route</span><span>Time</span><span>Gate</span></div>${rows}`;
}

// ════════════════════════════════════════════
// FLIGHTS
// ════════════════════════════════════════════
async function loadFlights() {
  try {
    const origin = document.getElementById('srchOrigin')?.value || '';
    const dest   = document.getElementById('srchDest')?.value   || '';
    const status = document.getElementById('srchStatus')?.value || '';
    let url = '/api/flights?';
    if (origin) url += `origin=${origin}&`;
    if (dest)   url += `destination=${dest}&`;
    if (status) url += `status=${status}&`;
    const data = await api(url);
    flights = data.data;
    renderFlights();
    populateFlightSelect();
    updateDepBoard();
    initFlightScheduleTasks();
  } catch {}
}

function renderFlights() {
  const tbody = document.getElementById('flightsTbody');
  if (!tbody) return;
  if (!flights.length) {
    tbody.innerHTML = '<tr class="erow"><td colspan="11">No flights — click Load Demo Flights</td></tr>';
    return;
  }
  tbody.innerHTML = flights.map(f => {
    const dep = new Date(f.departureTime).toLocaleString([], { dateStyle:'short', timeStyle:'short' });
    const pri = { 1:'<span class="chip cr">Emergency</span>', 2:'<span class="chip co">VIP</span>', 3:'<span class="chip cb">Normal</span>' }[f.priority] || '';
    return `<tr>
      <td><strong>${f.flightNumber}</strong></td>
      <td>${f.origin}</td><td>${f.destination}</td><td>${dep}</td>
      <td>${f.duration || '—'} min</td>
      <td>${f.availableSeats}/${f.totalSeats}</td>
      <td>$${f.economyPrice}</td><td>$${f.businessPrice}</td>
      <td>${statusChip(f.status)}</td><td>${pri}</td>
      <td><button class="btn-sky sm" onclick="quickBook('${f._id}')">Book</button></td>
    </tr>`;
  }).join('');
}

function populateFlightSelect() {
  const sel = document.getElementById('bkFlight');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select Flight —</option>' +
    flights.map(f => `<option value="${f._id}">${f.flightNumber}: ${f.origin}→${f.destination} ($${f.economyPrice})</option>`).join('');
}

function quickBook(id) {
  if (!authToken) { openModal('loginModal'); return; }
  document.getElementById('bkFlight').value = id;
  goTo('booking');
  updatePrice();
}

async function seedFlights() {
  try {
    await api('/api/flights/seed', 'POST');
    await loadFlights();
    showNotif('✈ Demo flights loaded!', 'success');
    addActivity('⚡ Demo flights loaded');
  } catch(e) { showNotif(e.message, 'error'); }
}

async function addFlight() {
  try {
    const body = {
      flightNumber:  document.getElementById('af-num').value,
      origin:        document.getElementById('af-origin').value,
      destination:   document.getElementById('af-dest').value,
      departureTime: document.getElementById('af-dep').value,
      arrivalTime:   document.getElementById('af-arr').value,
      totalSeats:    +document.getElementById('af-seats').value,
      availableSeats:+document.getElementById('af-seats').value,
      economyPrice:  +document.getElementById('af-eco').value,
      businessPrice: +document.getElementById('af-biz').value,
      priority:      +document.getElementById('af-pri').value,
    };
    await api('/api/flights', 'POST', body);
    closeModal('addFlightModal');
    loadFlights();
    showNotif('Flight added!', 'success');
  } catch(e) {
    const el = document.getElementById('afError');
    if (el) el.textContent = e.message;
  }
}

// ════════════════════════════════════════════
// BOOKING
// ════════════════════════════════════════════
function updatePrice() {
  const fid    = document.getElementById('bkFlight')?.value;
  const cls    = document.getElementById('bkClass')?.value;
  const flight = flights.find(f => f._id === fid);
  const el     = document.getElementById('priceDisplay');
  if (!el) return;
  if (!flight) { el.textContent = 'Select a flight to see price'; return; }
  const p = { economy: flight.economyPrice, business: flight.businessPrice, first: flight.firstClassPrice }[cls] || flight.economyPrice;
  el.textContent = `Total: $${p}`;
}

async function bookTicket() {
  if (!authToken) { openModal('loginModal'); return; }
  const flightId  = document.getElementById('bkFlight').value;
  const seatClass = document.getElementById('bkClass').value;
  const name      = document.getElementById('bkName').value.trim();
  const passport  = document.getElementById('bkPassport').value.trim();
  const err       = document.getElementById('bkError');
  err.textContent = '';
  if (!flightId) { err.textContent = 'Select a flight'; return; }
  if (!name)     { err.textContent = 'Passenger name required'; return; }
  try {
    const data = await api('/api/bookings', 'POST', { flightId, seatClass, passengers: [{ name, passport }] });
    showNotif(`🎫 Booking confirmed! Ref: ${data.data.bookingRef}`, 'success');
    goTo('mybookings');
  } catch(e) { err.textContent = e.message; }
}

async function simBookingQueue() {
  const algo    = document.getElementById('bkAlgo').value;
  const quantum = +document.getElementById('bkQuantum').value || 2;
  try {
    const data = await api('/api/bookings/simulate', 'POST', { algorithm: algo, quantum });
    renderGantt('bkGantt', data.data.schedule, algo);
    renderMStats('bkStats', data.data.stats);
  } catch {
    simulateDemo('bkGantt', 'bkStats', algo, quantum);
  }
}

async function loadMyBookings() {
  if (!authToken) {
    const t = document.getElementById('myBookingsTbody');
    if (t) t.innerHTML = '<tr class="erow"><td colspan="8">Please login first</td></tr>';
    return;
  }
  try {
    const data  = await api('/api/bookings/my');
    const tbody = document.getElementById('myBookingsTbody');
    if (!tbody) return;
    if (!data.data.length) { tbody.innerHTML = '<tr class="erow"><td colspan="8">No bookings yet</td></tr>'; return; }
    tbody.innerHTML = data.data.map(b => `<tr>
      <td><strong>${b.bookingRef}</strong></td>
      <td>${b.flight?.flightNumber || '—'}</td>
      <td>${b.flight?.origin || ''}→${b.flight?.destination || ''}</td>
      <td><span class="chip cb">${b.seatClass}</span></td>
      <td>$${b.totalPrice}</td>
      <td>${statusChip(b.status)}</td>
      <td>${statusChip(b.paymentStatus)}</td>
      <td>${b.status === 'pending' ? `<button class="btn-ghost sm danger" onclick="cancelBooking('${b._id}')">Cancel</button>` : ''}</td>
    </tr>`).join('');
  } catch(e) { showNotif(e.message, 'error'); }
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking?')) return;
  try {
    await api(`/api/bookings/${id}/cancel`, 'PUT');
    showNotif('Booking cancelled');
    loadMyBookings();
  } catch(e) { showNotif(e.message, 'error'); }
}

// ════════════════════════════════════════════
// SEAT MAP
// ════════════════════════════════════════════
function generateSeatMap() {
  const map = document.getElementById('seatMap');
  if (!map) return;
  map.innerHTML = '';
  for (let r = 1; r <= 25; r++) {
    for (let c = 0; c < 6; c++) {
      const letter = 'ABCDEF'[c];
      const cls    = r <= 2 ? 'first' : r <= 7 ? 'biz' : 'eco';
      const occ    = Math.random() < 0.28;
      const seat   = document.createElement('div');
      seat.className   = `seat ${occ ? 'occupied' : cls}`;
      seat.title       = `${r}${letter}`;
      seat.textContent = `${r}${letter}`;
      if (!occ) seat.onclick = () => { seat.classList.toggle('occupied'); updateSeatStats(); };
      map.appendChild(seat);
    }
  }
  updateSeatStats();
}

function updateSeatStats() {
  const all = document.querySelectorAll('.seat');
  const occ = document.querySelectorAll('.seat.occupied').length;
  const el  = document.getElementById('seatStats');
  if (el) el.innerHTML = `<span>Total: ${all.length}</span><span>Occupied: ${occ}</span><span>Available: ${all.length - occ}</span><span>Occupancy: ${Math.round(occ / all.length * 100)}%</span>`;
}

function simulateSeatAlloc() {
  const algo = document.getElementById('seatAlgo').value;
  const passengers = [
    { id:'V1', label:'VIP-Ahmed',   priority:1, color:COLORS[0], seatClass:'first' },
    { id:'V2', label:'VIP-Maria',   priority:1, color:COLORS[3], seatClass:'first' },
    { id:'B1', label:'Biz-Sara',    priority:2, color:COLORS[1], seatClass:'biz'   },
    { id:'B2', label:'Biz-Usman',   priority:2, color:COLORS[4], seatClass:'biz'   },
    { id:'E1', label:'Eco-John',    priority:3, color:COLORS[2], seatClass:'eco'   },
    { id:'E2', label:'Eco-Fatima',  priority:3, color:COLORS[5], seatClass:'eco'   },
    { id:'E3', label:'Eco-Ali',     priority:3, color:COLORS[6], seatClass:'eco'   },
  ];

  // Reset seat map — regenerate fresh
  generateSeatMap();

  const wq = document.getElementById('seatWaitQ');
  const dq = document.getElementById('seatDoneQ');
  if (wq) wq.innerHTML = passengers.map(p => `<span class="qchip" style="background:${p.color}">${p.label.split('-')[0]}</span>`).join('');
  if (dq) dq.innerHTML = '';

  const tasks2 = passengers.map((p, i) => ({ ...p, arrival: i, burst: 2 }));
  const { schedule, results } = clientDispatch(algo, tasks2, 2);
  renderGantt('seatGantt', schedule, algo);
  renderMStats('seatStats2', clientComputeStats(results, schedule));

  // Get available seats grouped by class
  const allSeats = document.querySelectorAll('.seat:not(.occupied)');
  const availFirst = [...allSeats].filter(s => s.classList.contains('first'));
  const availBiz   = [...allSeats].filter(s => s.classList.contains('biz'));
  const availEco   = [...allSeats].filter(s => s.classList.contains('eco'));

  results.sort((a, b) => a.completion - b.completion).forEach((r, i) => {
    setTimeout(() => {
      const p = passengers.find(x => x.id === r.id);

      // Find correct seat pool based on class
      const pool = p?.seatClass === 'first' ? availFirst
                 : p?.seatClass === 'biz'   ? availBiz
                 : availEco;

      // Find first available seat in pool
      const targetSeat = pool.find(s => !s.classList.contains('occupied') && !s.dataset.assigned);

      if (targetSeat) {
        // Mark seat as assigned with passenger color
        targetSeat.dataset.assigned = r.id;
        targetSeat.style.background  = p?.color || '#888';
        targetSeat.style.color       = '#fff';
        targetSeat.style.border      = `2px solid ${p?.color || '#888'}`;
        targetSeat.style.transform   = 'scale(1.15)';
        targetSeat.title = `${targetSeat.title} — ${p?.label || r.id}`;
        setTimeout(() => { targetSeat.style.transform = 'scale(1)'; }, 300);
      }

      // Update queue chips
      if (dq) {
        const chip = document.createElement('span');
        chip.className = 'qchip';
        chip.style.background = p?.color || '#888';
        chip.textContent = p?.label.split('-')[0] || r.id;
        dq.appendChild(chip);
      }
      if (wq) {
        const w = wq.querySelector(`[style*="${p?.color}"]`);
        if (w) w.remove();
      }
    }, i * 500);
  });
}

// ════════════════════════════════════════════
// PAYMENT
// ════════════════════════════════════════════
async function loadMyBookingsForPayment() {
  if (!authToken) return;
  try {
    const data = await api('/api/bookings/my');
    const sel  = document.getElementById('payBooking');
    if (!sel) return;
    const unpaid = data.data.filter(b => b.paymentStatus === 'unpaid' && b.status !== 'cancelled');
    sel.innerHTML = '<option value="">— Select Booking —</option>' +
      unpaid.map(b => `<option value="${b._id}">${b.bookingRef} — $${b.totalPrice}</option>`).join('');
  } catch {}
}

async function makePayment() {
  if (!authToken) { openModal('loginModal'); return; }
  const bookingId = document.getElementById('payBooking').value;
  const method    = document.getElementById('payMethod').value;
  const err       = document.getElementById('payError');
  if (err) err.textContent = '';
  if (!bookingId) { if (err) err.textContent = 'Select a booking'; return; }
  try {
    await api('/api/payments', 'POST', { bookingId, method });
    showNotif('💳 Payment queued — processing...', 'info');
    setTimeout(loadPaymentHistory, 2500);
  } catch(e) { if (err) err.textContent = e.message; }
}

async function loadPaymentHistory() {
  if (!authToken) return;
  try {
    const data  = await api('/api/payments/my');
    const tbody = document.getElementById('payHistTbody');
    if (!tbody) return;
    if (!data.data.length) { tbody.innerHTML = '<tr class="erow"><td colspan="5">No payments yet</td></tr>'; return; }
    tbody.innerHTML = data.data.map(p => `<tr>
      <td>${p.paymentRef}</td><td>$${p.amount}</td><td>${p.method}</td>
      <td>${statusChip(p.status)}</td>
      <td>${new Date(p.createdAt).toLocaleDateString()}</td>
    </tr>`).join('');
  } catch {}
}

async function simPaymentQueue() {
  const algo    = document.getElementById('payAlgo').value;
  const quantum = +document.getElementById('payQuantum').value || 2;
  try {
    const data = await api('/api/payments/simulate', 'POST', { algorithm: algo, quantum });
    renderGantt('payGantt', data.data.schedule, algo);
    renderMStats('payStats', data.data.stats);
  } catch {
    simulateDemo('payGantt', 'payStats', algo, quantum);
  }
}

// ════════════════════════════════════════════
// SUPPORT
// ════════════════════════════════════════════
async function submitComplaint() {
  if (!authToken) { openModal('loginModal'); return; }
  const subject  = document.getElementById('cmpSubject').value.trim();
  const message  = document.getElementById('cmpMessage').value.trim();
  const category = document.getElementById('cmpCategory').value;
  const err      = document.getElementById('cmpError');
  if (err) err.textContent = '';
  if (!subject || !message) { if (err) err.textContent = 'Subject and message required'; return; }
  try {
    const data = await api('/api/complaints', 'POST', { subject, message, category });
    showNotif(`🎧 Ticket: ${data.data.ticketRef}`, 'success');
    document.getElementById('cmpSubject').value = '';
    document.getElementById('cmpMessage').value = '';
    loadMyComplaints();
  } catch(e) { if (err) err.textContent = e.message; }
}

async function loadMyComplaints() {
  if (!authToken) return;
  try {
    const data  = await api('/api/complaints/my');
    const tbody = document.getElementById('cmpTbody');
    if (!tbody) return;
    if (!data.data.length) { tbody.innerHTML = '<tr class="erow"><td colspan="4">No tickets yet</td></tr>'; return; }
    tbody.innerHTML = data.data.map(c => `<tr>
      <td>${c.ticketRef}</td><td>${c.category}</td><td>${c.subject}</td><td>${statusChip(c.status)}</td>
    </tr>`).join('');
  } catch {}
}

async function simComplaintQueue() {
  const algo = document.getElementById('cmpAlgo').value;
  try {
    const data = await api('/api/complaints/simulate', 'POST', { algorithm: algo });
    renderGantt('cmpGantt', data.data.schedule, algo);
    renderMStats('cmpStats', data.data.stats);
  } catch {
    simulateDemo('cmpGantt', 'cmpStats', algo, 2);
  }
}

// ════════════════════════════════════════════
// SCHEDULER PAGE
// ════════════════════════════════════════════
const MODULE_ALGOS = {
  booking: [
    { v:'fcfs',         l:'FCFS — First Come First Serve',   d:'Booking requests processed in exact arrival order. Like a check-in queue.' },
    { v:'rr',           l:'Round Robin',                     d:'Each booking request gets equal processing time. Prevents any request from blocking others.' },
    { v:'sjf',          l:'SJF — Short Bookings First',      d:'Simple single-passenger bookings processed before complex group bookings.' },
    { v:'priority',     l:'Priority — VIP First',            d:'VIP passengers bookings jump the queue. Business class before Economy.' },
  ],
  flight: [
    { v:'priority',     l:'Priority NP — Emergency First',   d:'Emergency (P1) before VIP (P2) before Regular (P3). Non-preemptive.' },
    { v:'sjf',          l:'SJF — Short Flights First',       d:'Shorter duration flights get runway before long-haul.' },
    { v:'priority_pre', l:'Priority Preemptive',             d:'Emergency flight immediately preempts any current operation.' },
    { v:'srtf',         l:'SRTF — Dynamic Rescheduling',     d:'Flight with shortest remaining prep time runs first.' },
    { v:'fcfs',         l:'FCFS — Arrival Order',            d:'Flights scheduled in order they entered the system.' },
  ],
  payment: [
    { v:'rr',           l:'Round Robin — Fair Processing',   d:'Each payment gets equal CPU time. Fair for all customers.' },
    { v:'srtf',         l:'SRTF — Fastest First',            d:'Smallest payments complete first. Maximizes throughput.' },
    { v:'sjf',          l:'SJF — Quick Transactions',        d:'Fastest-to-process payments before slow bank transfers.' },
    { v:'priority',     l:'Priority — Premium Members',      d:'Premium members payments processed first.' },
    { v:'fcfs',         l:'FCFS — Queue Order',              d:'Payments in order received.' },
  ],
  support: [
    { v:'priority',     l:'Priority NP — Urgent First',      d:'Safety complaints (P1) before booking (P2) before general (P3).' },
    { v:'priority_pre', l:'Priority Pre — Emergency Jump',   d:'Critical safety complaint immediately preempts current.' },
    { v:'fcfs',         l:'FCFS — Submission Order',         d:'Complaints handled in submission order.' },
    { v:'sjf',          l:'SJF — Quick Queries First',       d:'Simple queries before complex refund disputes.' },
  ],
  seat: [
    { v:'priority',     l:'Priority NP — VIP First',         d:'First class (P1) before Business (P2) before Economy (P3).' },
    { v:'priority_pre', l:'Priority Pre — Instant VIP',      d:'VIP arrival during allocation gets next seat immediately.' },
    { v:'fcfs',         l:'FCFS — Check-in Order',           d:'Seats assigned in check-in order.' },
  ],
};

function onModuleChange() {
  const mod  = document.getElementById('schedModule')?.value || 'booking';
  const sel  = document.getElementById('schedAlgo');
  if (!sel) return;
  const algos = MODULE_ALGOS[mod] || [];
  sel.innerHTML = algos.map(a => `<option value="${a.v}">${a.l}</option>`).join('');
  onAlgoChange();
}

function onAlgoChange() {
  const mod   = document.getElementById('schedModule')?.value;
  const algo  = document.getElementById('schedAlgo')?.value;
  const box   = document.getElementById('algoDetailBox');
  const grp   = document.getElementById('quantumGrp');
  const algos = MODULE_ALGOS[mod] || [];
  const found = algos.find(a => a.v === algo);
  if (box && found) box.textContent = found.d;
  if (grp) grp.classList.toggle('hidden', algo !== 'rr');
}

function addTask() {
  const id       = document.getElementById('taskId').value.trim();
  const label    = document.getElementById('taskLabel').value.trim();
  const arrival  = +document.getElementById('taskArrival').value || 0;
  const burst    = +document.getElementById('taskBurst').value || 3;
  const priority = +document.getElementById('taskPriority').value || 2;
  if (!id) { showToast('Task ID required', 'warn'); return; }
  if (tasks.find(t => t.id === id)) { showToast('Duplicate ID', 'warn'); return; }
  tasks.push({ id, label: label || id, arrival, burst, priority, color: COLORS[tasks.length % COLORS.length] });
  renderTaskTable();
  document.getElementById('taskId').value = '';
  document.getElementById('taskLabel').value = '';
}

function deleteTask(id) { tasks = tasks.filter(t => t.id !== id); renderTaskTable(); }
function clearTasks()   { tasks = []; renderTaskTable(); }

function genRandomTasks() {
  tasks = [];
  const mod    = document.getElementById('schedModule')?.value || 'booking';
  const prefix = { booking:'BK', flight:'FL', payment:'PY', support:'SP', seat:'ST' }[mod] || 'T';
  const labelMap = {
    booking: ['PremBook','GroupBook','VIPBook','EcoBook','BizBook','CharterBook'],
    flight:  ['KHI→LHE','KHI→DXB','ISB→LON','LHE→DXB','EmergFlt','VIPFlt'],
    payment: ['CardPay','WalletPay','BankTrans','PayPal','Refund','InstPay'],
    support: ['SafetyRpt','BookErr','PmtFail','SeatUpg','BagClaim','GenQuery'],
    seat:    ['FirstCls','BizClass','EcoClass','WheelChair','MinorPax','VIPPax'],
  };
  for (let i = 0; i < 6; i++) {
    tasks.push({
      id: `${prefix}${i + 1}`,
      label: labelMap[mod]?.[i] || `${prefix}${i + 1}`,
      arrival: i * Math.floor(Math.random() * 3),
      burst: 1 + Math.floor(Math.random() * 8),
      priority: 1 + Math.floor(Math.random() * 3),
      color: COLORS[i]
    });
  }
  renderTaskTable();
}

function renderTaskTable() {
  const tbody = document.getElementById('taskTbody');
  if (!tbody) return;
  if (!tasks.length) { tbody.innerHTML = '<tr class="erow"><td colspan="6">No tasks — click Random</td></tr>'; return; }
  tbody.innerHTML = tasks.map(t => `<tr>
    <td><span style="color:${t.color};font-weight:700">${t.id}</span></td>
    <td>${t.label}</td><td>${t.arrival}</td><td>${t.burst}</td><td>${t.priority}</td>
    <td><button class="btn-ghost sm danger" onclick="deleteTask('${t.id}')">✕</button></td>
  </tr>`).join('');
}

function runModuleSchedule() {
  if (!tasks.length) { showToast('Add tasks first', 'warn'); return; }
  const algo    = document.getElementById('schedAlgo').value;
  const quantum = +document.getElementById('schedQuantum').value || 2;
  const { schedule, results } = clientDispatch(algo, tasks, quantum);
  renderGantt('schedGantt', schedule, algo);
  renderSchedResults(results);
  renderMStats('schedStats', clientComputeStats(results, schedule));
  animateQueues(schedule, tasks);
}

function renderSchedResults(results) {
  const tbody = document.getElementById('schedResultTbody');
  if (!tbody) return;
  const minWT = results.length ? Math.min(...results.map(r => r.waiting)) : 0;
  tbody.innerHTML = results.map(r => `<tr>
    <td><strong>${r.id}</strong></td><td>${r.label || r.id}</td>
    <td>${r.arrival}</td><td>${r.burst}</td><td>${r.priority}</td><td>${r.completion}</td>
    <td>${r.turnaround}</td>
    <td style="color:${r.waiting === minWT ? 'var(--green)' : 'inherit'}">${r.waiting}</td>
    <td>${r.response}</td>
  </tr>`).join('');
}

function animateQueues(schedule, taskList) {
  const ready   = document.getElementById('qReady');
  const running = document.getElementById('qRunning');
  const done    = document.getElementById('qDone');
  if (!ready || !running || !done) return;
  ready.innerHTML   = taskList.map(t => `<span class="qchip" style="background:${t.color}" data-qid="${t.id}">${t.id}</span>`).join('');
  running.innerHTML = '';
  done.innerHTML    = '';
  const uniq = [...new Set(schedule.map(s => s.id))];
  uniq.forEach((id, i) => {
    setTimeout(() => {
      const t = taskList.find(x => x.id === id);
      running.innerHTML = `<span class="qchip" style="background:${t?.color || '#888'}">${id}</span>`;
      ready.querySelector(`[data-qid="${id}"]`)?.remove();
      if (i === uniq.length - 1) {
        setTimeout(() => {
          const chip = document.createElement('span');
          chip.className = 'qchip';
          chip.style.background = t?.color || '#888';
          chip.textContent = id;
          done.appendChild(chip);
          running.innerHTML = '';
        }, 500);
      }
    }, i * 600);
  });
}

// ════════════════════════════════════════════
// FLIGHT SCHEDULING MODULE
// ════════════════════════════════════════════
function initFlightScheduleTasks() {
  if (!flights.length) {
    fsTasks = Array.from({ length: 6 }, (_, i) => ({
      id: `DW${101 + i}`, label: `DW${101 + i}`,
      arrival: i, burst: [90, 60, 180, 480, 180, 90][i] || 90,
      priority: [3, 2, 1, 2, 3, 3][i] || 3, color: COLORS[i]
    }));
  } else {
    fsTasks = flights.map((f, i) => ({
      id: f.flightNumber, label: f.flightNumber,
      arrival: i, burst: f.duration || 90, priority: f.priority || 3,
      color: COLORS[i % COLORS.length]
    }));
  }
  renderFlightQueue();
}

function renderFlightQueue() {
  const el = document.getElementById('fqRows');
  if (!el) return;
  const priMap = { 1:'<span class="chip cr">Emergency</span>', 2:'<span class="chip co">VIP</span>', 3:'<span class="chip cb">Normal</span>' };
  el.innerHTML = fsTasks.map(f => `
    <div class="fqt-row">
      <span style="color:${f.color};font-weight:700">${f.id}</span>
      <span>${f.label}</span>
      <span>${f.burst} min</span>
      <span>${priMap[f.priority] || ''}</span>
      <span><span class="chip co">Waiting</span></span>
    </div>`).join('');
}

function runFlightSchedule() {
  if (!fsTasks.length) { showToast('No flights', 'warn'); return; }
  const algo    = document.getElementById('fsAlgo').value;
  const quantum = +document.getElementById('fsQuantum').value || 3;
  const { schedule, results } = clientDispatch(algo, fsTasks, quantum);
  renderGantt('fsGantt', schedule, algo);
  renderMStats('fsStats', clientComputeStats(results, schedule));
  const tbody = document.getElementById('fsResultTbody');
  if (tbody) tbody.innerHTML = results.map(r => `<tr>
    <td><strong>${r.label || r.id}</strong></td>
    <td>${r.arrival}</td><td>${r.burst} min</td><td>${r.completion}</td>
    <td style="color:${r.waiting > 0 ? 'var(--orange)' : 'var(--green)'}">+${r.waiting} min</td>
    <td>${r.waiting}</td>
  </tr>`).join('');
  showNotif(`✈ Runway scheduled: ${algo.toUpperCase()}`, 'success');
}

// ════════════════════════════════════════════
// EMERGENCY MODULE
// ════════════════════════════════════════════
function addEmergencyTask(id, label, priority, burst) {
  const uid = `${id}_${Date.now()}`;
  emTasks.push({ id: uid, label, arrival: emTasks.length, burst, priority, color: COLORS[emTasks.length % COLORS.length] });
  renderEmTaskTable();
  showToast(`${label} added`, 'info');
}

function clearEmergencyTasks() {
  emTasks = [];
  renderEmTaskTable();
  const g = document.getElementById('emGantt');
  if (g) g.innerHTML = '<p class="empty-t">Add events and dispatch to see timeline</p>';
}

function renderEmTaskTable() {
  const tbody = document.getElementById('emTaskTbody');
  if (!tbody) return;
  const priNames = { 1:'P1-Critical', 2:'P2-Urgent', 3:'P3-Normal', 4:'P4-Routine' };
  tbody.innerHTML = emTasks.length
    ? emTasks.map(t => `<tr>
        <td style="color:${t.color};font-weight:700">${t.label}</td>
        <td><span class="chip ${t.priority === 1 ? 'cr' : t.priority === 2 ? 'co' : 'cb'}">${priNames[t.priority] || t.priority}</span></td>
        <td>${t.burst} units</td>
      </tr>`).join('')
    : '<tr class="erow"><td colspan="3">Add emergency events above</td></tr>';
}

function runEmergencySchedule() {
  if (!emTasks.length) { showToast('Add emergency events first', 'warn'); return; }
  const algo = document.getElementById('emAlgo').value;
  const { schedule, results } = clientDispatch(algo, emTasks, 2);
  renderGantt('emGantt', schedule, algo);
  renderMStats('emStats', clientComputeStats(results, schedule));
  const tbody = document.getElementById('emResultTbody');
  if (tbody) tbody.innerHTML = results.map(r => `<tr>
    <td style="color:${r.priority === 1 ? 'var(--red)' : r.priority === 2 ? 'var(--orange)' : 'var(--accent)'}"><strong>${r.label || r.id}</strong></td>
    <td><span class="chip ${r.priority === 1 ? 'cr' : r.priority === 2 ? 'co' : 'cb'}">P${r.priority}</span></td>
    <td>${r.response} units</td>
    <td style="color:${r.waiting > 0 ? 'var(--orange)' : 'var(--green)'}">${r.waiting} units</td>
    <td>${r.completion}</td>
  </tr>`).join('');
  showNotif(`🚨 Dispatched: ${algo.replace('_', ' ').toUpperCase()}`, 'error');
}

function triggerEmergency() {
  if (socket) socket.emit('flight:emergency', { message: 'FLIGHT DW103 EMERGENCY — ALL UNITS RESPOND' });
  addEmergencyTask('EmFlt', 'Emergency Flight', 1, 5);
  showNotif('🚨 EMERGENCY DECLARED!', 'error');
}

// ════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════
async function loadComparison() {
  try {
    const data = await api('/api/analytics/compare');
    const rows = data.data;
    const best = rows.reduce((b, r) => r.awt < b.awt ? r : b, rows[0]);
    const wrap = document.getElementById('compareWrap');
    if (wrap) wrap.innerHTML = `<div class="content-card">
      <div class="cc-head"><h3 class="cc-title">Algorithm Comparison</h3></div>
      <div class="table-wrap">
        <table class="dtable compare-table">
          <thead><tr><th>Algorithm</th><th>Avg WT</th><th>Avg TAT</th><th>Avg RT</th><th>CPU Util%</th><th>Throughput</th><th>Rank</th></tr></thead>
          <tbody>${rows.sort((a, b) => a.awt - b.awt).map((r, i) => `<tr class="${r === best ? 'best-row' : ''}">
            <td>${r.label || r.algo} ${r === best ? '<span class="chip cg">★ Best</span>' : ''}</td>
            <td ${r === best ? 'class="best"' : ''}>${r.awt.toFixed(2)}</td>
            <td>${r.atat.toFixed(2)}</td><td>${r.art.toFixed(2)}</td>
            <td>${r.cpuUtil.toFixed(1)}%</td><td>${r.throughput.toFixed(3)}</td>
            <td><span class="chip ${i === 0 ? 'cg' : i === 1 ? 'cb' : 'co'}">#${i + 1}</span></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
    drawChart('chartAWT', rows.map(r => r.label || r.algo), rows.map(r => +r.awt.toFixed(2)),      'Avg WT');
    drawChart('chartCPU', rows.map(r => r.label || r.algo), rows.map(r => +r.cpuUtil.toFixed(1)),  'CPU%');
    drawChart('chartTAT', rows.map(r => r.label || r.algo), rows.map(r => +r.atat.toFixed(2)),     'Avg TAT');
    drawChart('chartTP',  rows.map(r => r.label || r.algo), rows.map(r => +r.throughput.toFixed(3)),'Throughput');
  } catch(e) { showNotif(e.message, 'error'); }
}

// ════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════
async function loadAdminStats() {
  try {
    const data = await api('/api/analytics/dashboard');
    const d = data.data;
    const au = document.getElementById('adm-users');
    const af = document.getElementById('adm-flights');
    const ab = document.getElementById('adm-bookings');
    const ar = document.getElementById('adm-revenue');
    if (au) au.textContent = d.totalUsers;
    if (af) af.textContent = d.totalFlights;
    if (ab) ab.textContent = d.totalBookings;
    if (ar) ar.textContent = '$' + Math.round(d.totalRevenue || 0);
  } catch {}
}

async function loadAdminBookings() {
  try {
    const data  = await api('/api/bookings');
    const tbody = document.getElementById('adminBookingsTbody');
    if (!tbody) return;
    if (!data.data.length) { tbody.innerHTML = '<tr class="erow"><td colspan="6">No bookings</td></tr>'; return; }
    tbody.innerHTML = data.data.map(b => `<tr>
      <td>${b.bookingRef}</td><td>${b.user?.name || '—'}</td>
      <td>${b.flight?.flightNumber || '—'}</td>
      <td><span class="chip cb">${b.seatClass}</span></td>
      <td>$${b.totalPrice}</td><td>${statusChip(b.status)}</td>
    </tr>`).join('');
  } catch {}
}

async function loadAdminComplaints() {
  try {
    const data  = await api('/api/complaints');
    const tbody = document.getElementById('adminCmpTbody');
    if (!tbody) return;
    if (!data.data.length) { tbody.innerHTML = '<tr class="erow"><td colspan="6">No complaints</td></tr>'; return; }
    tbody.innerHTML = data.data.map(c => `<tr>
      <td>${c.ticketRef}</td><td>${c.user?.name || '—'}</td>
      <td>${c.category}</td><td>${c.subject}</td>
      <td>${statusChip(c.status)}</td>
      <td>${c.status === 'queued' ? `<button class="btn-sky sm" onclick="resolveAdminComplaint('${c._id}')">Resolve</button>` : ''}</td>
    </tr>`).join('');
  } catch {}
}

async function resolveAdminComplaint(id) {
  try {
    await api(`/api/complaints/${id}/resolve`, 'PUT', { response: 'Resolved by admin' });
    showNotif('Resolved', 'success');
    loadAdminComplaints();
  } catch {}
}

// ════════════════════════════════════════════
// CLIENT-SIDE ALGORITHMS (6 algorithms)
// ════════════════════════════════════════════
function cloneT(ts) { return ts.map(t => ({ ...t, remaining: t.burst, firstRun: -1, completion: 0 })); }

function mergeS(s) {
  if (!s.length) return [];
  const o = [{ ...s[0] }];
  for (let i = 1; i < s.length; i++) {
    const l = o[o.length - 1];
    if (s[i].id === l.id && s[i].start === l.end) l.end = s[i].end;
    else o.push({ ...s[i] });
  }
  return o;
}

function buildR(ts, sc) {
  const sc2 = sc.map(s => { const t = ts.find(x => x.id === s.id); return { ...s, color: t?.color || '#888' }; });
  const res = ts.map(t => ({
    id: t.id, label: t.label || t.id, arrival: t.arrival, burst: t.burst,
    priority: t.priority || 3, completion: t.completion,
    turnaround: t.completion - t.arrival,
    waiting: t.completion - t.arrival - t.burst,
    response: t.firstRun - t.arrival
  }));
  return { schedule: sc2, results: res };
}

function cFCFS(ts) {
  const ps = cloneT(ts).sort((a, b) => a.arrival - b.arrival);
  const sc = []; let t = 0;
  for (const p of ps) {
    if (t < p.arrival) t = p.arrival;
    p.firstRun = t;
    sc.push({ id: p.id, label: p.label || p.id, start: t, end: t + p.burst });
    t += p.burst; p.completion = t;
  }
  return buildR(ps, sc);
}

function cSJF(ts) {
  const ps = cloneT(ts); const sc = []; let t = 0; const done = new Set();
  while (done.size < ps.length) {
    const av = ps.filter(p => p.arrival <= t && !done.has(p.id));
    if (!av.length) { t++; continue; }
    av.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
    const p = av[0]; if (p.firstRun < 0) p.firstRun = t;
    sc.push({ id: p.id, label: p.label || p.id, start: t, end: t + p.burst });
    t += p.burst; p.completion = t; done.add(p.id);
  }
  return buildR(ps, sc);
}

function cSRTF(ts) {
  const ps = cloneT(ts); const sc = []; let t = 0, lp = null, ss = 0; const done = new Set();
  while (done.size < ps.length) {
    const av = ps.filter(p => p.arrival <= t && !done.has(p.id));
    if (!av.length) { t++; continue; }
    av.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
    const p = av[0]; if (p.firstRun < 0) p.firstRun = t;
    if (p.id !== lp) { if (lp !== null) sc.push({ id: lp, label: ps.find(x => x.id === lp)?.label || lp, start: ss, end: t }); ss = t; lp = p.id; }
    p.remaining--; t++;
    if (p.remaining === 0) { p.completion = t; done.add(p.id); }
  }
  if (lp !== null) sc.push({ id: lp, label: ps.find(x => x.id === lp)?.label || lp, start: ss, end: t });
  return buildR(ps, mergeS(sc));
}

function cRR(ts, q) {
  const ps = cloneT(ts).sort((a, b) => a.arrival - b.arrival);
  const sc = []; let t = 0; const queue = [], enq = new Set(), done = new Set(); let i = 0;
  while (i < ps.length && ps[i].arrival <= t) { queue.push(ps[i]); enq.add(ps[i].id); i++; }
  while (done.size < ps.length) {
    if (!queue.length) { t = ps[i].arrival; while (i < ps.length && ps[i].arrival <= t) { queue.push(ps[i]); enq.add(ps[i].id); i++; } continue; }
    const p = queue.shift(); if (p.firstRun < 0) p.firstRun = t;
    const run = Math.min(p.remaining, q);
    sc.push({ id: p.id, label: p.label || p.id, start: t, end: t + run });
    t += run; p.remaining -= run;
    while (i < ps.length && ps[i].arrival <= t) { if (!enq.has(ps[i].id)) { queue.push(ps[i]); enq.add(ps[i].id); } i++; }
    if (p.remaining === 0) { p.completion = t; done.add(p.id); } else queue.push(p);
  }
  return buildR(ps, sc);
}

function cPri(ts) {
  const ps = cloneT(ts); const sc = []; let t = 0; const done = new Set();
  while (done.size < ps.length) {
    const av = ps.filter(p => p.arrival <= t && !done.has(p.id));
    if (!av.length) { t++; continue; }
    av.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
    const p = av[0]; if (p.firstRun < 0) p.firstRun = t;
    sc.push({ id: p.id, label: p.label || p.id, start: t, end: t + p.burst });
    t += p.burst; p.completion = t; done.add(p.id);
  }
  return buildR(ps, sc);
}

function cPriPre(ts) {
  const ps = cloneT(ts); const sc = []; let t = 0, lp = null, ss = 0; const done = new Set();
  while (done.size < ps.length) {
    const av = ps.filter(p => p.arrival <= t && !done.has(p.id));
    if (!av.length) { t++; continue; }
    av.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
    const p = av[0]; if (p.firstRun < 0) p.firstRun = t;
    if (p.id !== lp) { if (lp !== null) sc.push({ id: lp, label: ps.find(x => x.id === lp)?.label || lp, start: ss, end: t }); ss = t; lp = p.id; }
    p.remaining--; t++;
    if (p.remaining === 0) { p.completion = t; done.add(p.id); }
  }
  if (lp !== null) sc.push({ id: lp, label: ps.find(x => x.id === lp)?.label || lp, start: ss, end: t });
  return buildR(ps, mergeS(sc));
}

function clientDispatch(algo, ts, q = 2) {
  switch (algo) {
    case 'fcfs':         return cFCFS(ts);
    case 'sjf':          return cSJF(ts);
    case 'srtf':         return cSRTF(ts);
    case 'rr':           return cRR(ts, q);
    case 'priority':     return cPri(ts);
    case 'priority_pre': return cPriPre(ts);
    default:             return cFCFS(ts);
  }
}

function clientComputeStats(results, schedule) {
  const n = results.length;
  if (!n) return { awt: 0, atat: 0, art: 0, cpuUtil: 0, throughput: 0, n: 0 };
  const awt  = results.reduce((s, r) => s + r.waiting, 0) / n;
  const atat = results.reduce((s, r) => s + r.turnaround, 0) / n;
  const art  = results.reduce((s, r) => s + r.response, 0) / n;
  const tb   = results.reduce((s, r) => s + r.burst, 0);
  const ms   = schedule.length ? Math.max(...schedule.map(s => s.end)) : 1;
  return { awt, atat, art, cpuUtil: (tb / ms) * 100, throughput: n / ms, n };
}

function simulateDemo(gId, sId, algo, q = 2) {
  const demo = Array.from({ length: 5 }, (_, i) => ({
    id: `T${i + 1}`, label: `Task${i + 1}`,
    arrival: i * Math.floor(Math.random() * 2 + 1),
    burst: 1 + Math.floor(Math.random() * 6),
    priority: 1 + Math.floor(Math.random() * 3),
    color: COLORS[i]
  }));
  const { schedule, results } = clientDispatch(algo, demo, q);
  renderGantt(gId, schedule, algo);
  renderMStats(sId, clientComputeStats(results, schedule));
}

// ════════════════════════════════════════════
// GANTT CHART RENDERER
// ════════════════════════════════════════════
function renderGantt(id, schedule, algo = 'fcfs') {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  if (!schedule || !schedule.length) { wrap.innerHTML = '<p class="empty-t">No data</p>'; return; }
  const PX       = 46;
  const makespan = Math.max(...schedule.map(s => s.end));
  const full     = []; let t = 0;
  for (const s of schedule) {
    if (s.start > t) full.push({ pid: 'idle', start: t, end: s.start });
    full.push(s); t = s.end;
  }
  const blocks = full.map(s => {
    const w = (s.end - s.start) * PX;
    if (s.pid === 'idle') return `<div class="gidle" style="width:${w}px" title="Idle [${s.start}–${s.end}]">idle</div>`;
    const lbl = w > 30 ? (s.label || s.id) : '';
    const bg  = s.color || ALGO_COLORS[algo] || '#0ea5e9';
    return `<div class="gblock" style="width:${w}px;background:${bg}" title="${s.label || s.id} [${s.start}–${s.end}] (${s.end - s.start}u)">${lbl}</div>`;
  }).join('');
  const ticks = [];
  for (let i = 0; i <= makespan; i++) { if (makespan <= 20 || i % Math.ceil(makespan / 20) === 0) ticks.push(i); }
  const tickHtml = ticks.map(t => `<span class="gtick" style="left:${t * PX}px">${t}</span>`).join('');
  wrap.innerHTML = `<div style="overflow-x:auto"><div style="min-width:${makespan * PX + 60}px">
    <div class="gantt-inner">${blocks}</div>
    <div class="gtimes" style="position:relative;height:16px;margin-top:2px;">${tickHtml}</div>
  </div></div>`;
  wrap.querySelectorAll('.gblock,.gidle').forEach((b, i) => {
    b.style.opacity = '0'; b.style.transform = 'scaleX(0)'; b.style.transformOrigin = 'left';
    b.style.transition = `opacity .2s ease ${i * 22}ms,transform .2s ease ${i * 22}ms`;
    requestAnimationFrame(() => { b.style.opacity = '1'; b.style.transform = 'scaleX(1)'; });
  });
}

function renderMStats(id, stats) {
  const el = document.getElementById(id);
  if (!el || !stats) return;
  el.innerHTML = [
    { l: 'Avg WT',     v: stats.awt?.toFixed(2)        || '—' },
    { l: 'Avg TAT',    v: stats.atat?.toFixed(2)       || '—' },
    { l: 'Avg RT',     v: stats.art?.toFixed(2)         || '—' },
    { l: 'CPU Util',   v: (stats.cpuUtil?.toFixed(1)   || '—') + '%' },
    { l: 'Throughput', v: stats.throughput?.toFixed(3)  || '—' },
    { l: 'Tasks',      v: stats.n                        || '—' },
  ].map(s => `<div class="ms"><div class="ms-val">${s.v}</div><div class="ms-lbl">${s.l}</div></div>`).join('');
}

// ════════════════════════════════════════════
// CANVAS CHARTS
// ════════════════════════════════════════════
function drawChart(id, labels, values, title) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';
  const W = canvas.offsetWidth || canvas.width;
  const H = canvas.offsetHeight || canvas.height;
  canvas.width = W; canvas.height = H;
  const bg = dark ? '#141b2d' : '#fff';
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const pL = 44, pR = 12, pT = 20, pB = 38;
  const cW = W - pL - pR, cH = H - pT - pB;
  const max = Math.max(...values, 1);
  const bW  = Math.floor(cW / values.length) - 4;
  const tc  = dark ? '#7896b8' : '#475569';
  for (let i = 0; i <= 4; i++) {
    const y = pT + cH * (1 - i / 4);
    ctx.strokeStyle = dark ? '#1e2d45' : '#e2e8f0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + cW, y); ctx.stroke();
    ctx.fillStyle = tc; ctx.font = '9px Space Mono,monospace'; ctx.textAlign = 'right';
    ctx.fillText((max * i / 4).toFixed(1), pL - 3, y + 3);
  }
  let prog = 0;
  const anim = () => {
    ctx.fillStyle = bg; ctx.fillRect(pL, pT, cW, cH + 2);
    for (let i = 0; i <= 4; i++) {
      const y = pT + cH * (1 - i / 4);
      ctx.strokeStyle = dark ? '#1e2d45' : '#e2e8f0';
      ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + cW, y); ctx.stroke();
    }
    values.forEach((v, i) => {
      const x = pL + i * (bW + 4) + 2, bH = (v / max) * cH * Math.min(prog, 1), y = pT + cH - bH;
      ctx.fillStyle = COLORS[i] || '#0ea5e9';
      ctx.beginPath(); ctx.roundRect?.(x, y, bW, bH, 3) ?? ctx.rect(x, y, bW, bH); ctx.fill();
      if (prog >= 1) {
        ctx.fillStyle = dark ? '#e8edf5' : '#0a1628'; ctx.font = 'bold 8px Space Mono,monospace';
        ctx.textAlign = 'center'; ctx.fillText(v, x + bW / 2, y - 3);
      }
      ctx.fillStyle = tc; ctx.font = '8px Space Mono,monospace'; ctx.textAlign = 'center';
      ctx.fillText((labels[i] || '').split(' ')[0].substring(0, 6), x + bW / 2, pT + cH + 14);
    });
    if (prog < 1) { prog += 0.05; requestAnimationFrame(anim); }
  };
  anim();
}

// ════════════════════════════════════════════
// CHATBOT
// ════════════════════════════════════════════
const CHAT_KB = {
  'hello':        'Hello! I\'m DataWing AI. Ask me about flights, algorithms, or any module!',
  'hi':           'Hi! ✈ How can I help you today?',
  'fcfs':         'FCFS processes booking requests in arrival order. Like a check-in queue — first in, first served. Used in Ticket Booking module.',
  'round robin':  'Round Robin gives each task equal time slice. Used in Payment Processing and Flight Scheduling for fairness.',
  'sjf':          'SJF processes the shortest task first. Minimises average waiting time. Used in Flight Operations.',
  'srtf':         'SRTF is preemptive SJF. If a shorter task arrives mid-execution, current task is paused. Used in Emergency Management.',
  'priority':     'Priority Scheduling handles VIP/urgent tasks first. Lower number = higher priority. Used in Seats and Support.',
  'emergency':    'Go to Emergency & Delay tab. Add events (Medical Evac, Security, Weather). Run with Priority Preemptive algorithm.',
  'book':         'Go to Book Ticket tab. Select flight, class, enter name, click Confirm Booking.',
  'flight':       'Go to Flights tab and click Load Demo Flights to see routes.',
  'seat':         'Go to Seats tab. Click any available seat to select it. Run Priority simulation to see VIP allocation.',
  'payment':      'Go to Payments tab. Select unpaid booking, choose method, click Process Payment.',
  'algorithm':    'DataWing uses 6 OS algorithms: FCFS, Round Robin, SJF, SRTF, Priority NP, Priority Preemptive.',
  'gantt':        'Gantt charts show execution timeline. Each colored block = one task on CPU. Width = burst time.',
};

function toggleChat() { document.getElementById('chatbot').classList.toggle('hidden'); }

function sendChat() {
  const input = document.getElementById('chatInput');
  const msgs  = document.getElementById('chatMsgs');
  const text  = input.value.trim();
  if (!text) return;
  const um = document.createElement('div'); um.className = 'cmsg user'; um.textContent = text; msgs.appendChild(um);
  const lower = text.toLowerCase();
  let reply = "Not sure about that. Try asking: flights, booking, FCFS, Round Robin, Priority, emergency, seat, payment, algorithm!";
  for (const [k, r] of Object.entries(CHAT_KB)) { if (lower.includes(k)) { reply = r; break; } }
  setTimeout(() => {
    const bm = document.createElement('div'); bm.className = 'cmsg bot'; bm.textContent = reply;
    msgs.appendChild(bm); msgs.scrollTop = msgs.scrollHeight;
  }, 300);
  input.value = ''; msgs.scrollTop = msgs.scrollHeight;
}

// ════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════
function statusChip(s) {
  const m = { confirmed:'cg', scheduled:'cb', pending:'co', cancelled:'cr', departed:'cb', delayed:'co', arrived:'cg', queued:'co', processing:'cb', completed:'cg', failed:'cr', paid:'cg', unpaid:'co', refunded:'cp', 'in-progress':'cb', resolved:'cg', closed:'cp' };
  return `<span class="chip ${m[s] || 'cb'}">${s}</span>`;
}

function animCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0; const steps = 30, inc = target / steps; let st = 0;
  const tick = () => { st++; cur = st >= steps ? target : cur + inc; el.textContent = Math.round(cur); if (st < steps) requestAnimationFrame(tick); };
  tick();
}

function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
function switchModal(a, b) { closeModal(a); openModal(b); }

function setupModalClose() {
  ['loginModal', 'registerModal', 'addFlightModal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(id); });
  });
}

let toastTimer = null;
function showToast(msg, type = 'info') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast';
    Object.assign(t.style, { position:'fixed', bottom:'2rem', left:'50%', transform:'translateX(-50%)', background:'var(--card)', border:'1px solid var(--border2)', color:'var(--text)', fontFamily:'var(--fm)', fontSize:'.76rem', padding:'.5em 1.2em', borderRadius:'var(--rs)', zIndex:'9000', transition:'opacity .3s', whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,.5)', pointerEvents:'none' });
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 2300);
}

let notifTimer = null;
function showNotif(msg, type = 'info') {
  const el = document.getElementById('notifBar');
  if (!el) return;
  el.textContent = msg; el.className = `notif-bar ${type}`;
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.classList.add('hidden'), 4000);
}
