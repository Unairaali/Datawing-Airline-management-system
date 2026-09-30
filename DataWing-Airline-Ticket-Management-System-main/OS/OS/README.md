# ✈ DataWing — Airline Ticket Management System
### Using CPU Scheduling Algorithms

Full-stack airline management system demonstrating real-world OS scheduling algorithms in different airline departments.

---

## Setup

```bash
npm install
cp .env.example .env   # Fill in MONGO_URI and JWT_SECRET
net start MongoDB      # Windows (run PowerShell as Admin)
npm run dev
```
Open: **http://localhost:5000**

---

## Modules & Algorithms

| Module | Algorithm | Purpose |
|---|---|---|
| Ticket Booking | FCFS + Round Robin | Process booking requests in order |
| Flight Management | Priority + SJF | Emergency flights first, short tasks first |
| Seat Allocation | FCFS + Priority | VIP passengers get priority seats |
| Payment Processing | Round Robin + SRTF | Fair payment queue, faster transactions first |
| Customer Support | FCFS + Priority | Urgent complaints handled first |
| Analytics | All 6 | Compare algorithm performance |

---

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JS, Canvas API, Socket.IO Client
- **Backend:** Node.js, Express.js, Socket.IO
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + bcrypt
- **Architecture:** MVC

---

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/flights | Get flights |
| POST | /api/bookings | Book ticket |
| POST | /api/payments | Process payment |
| POST | /api/complaints | Submit complaint |
| GET | /api/analytics/dashboard | Admin stats |
| GET | /api/analytics/compare | Algorithm comparison |

---

## Roles
- **Customer** — Book flights, make payments, submit complaints
- **Staff** — Add/update flights, resolve complaints
- **Admin** — Full access + analytics dashboard
