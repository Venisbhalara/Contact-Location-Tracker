<div align="center">

# 📍 Location Tracker

**A real-time full-stack application to share and track live GPS locations securely.**

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL-4479a1?logo=mysql)](https://www.mysql.com/)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?logo=socket.io)](https://socket.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

</div>

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure register/login with encrypted passwords
- 📇 **Contact Management** — Add, view, and manage contacts
- 🔗 **Shareable Tracking Links** — Generate one-time tracking links and send them to anyone
- 📍 **Real-Time Location Sharing** — Target user shares live GPS location via the link
- 🗺️ **Live Map View** — Viewer sees live position on an interactive Leaflet map with movement trail
- 🏠 **Detailed Address** — Full reverse-geocoded address (road, area, city, state) via OpenStreetMap
- 🔄 **Auto-Refresh Every 10 Minutes** — Location updates automatically even when stationary
- 🛑 **Instant Stop on Delete** — Deleting a tracking request immediately stops the sharer via Socket.IO
- 📱 **Mobile Friendly** — Works on phone browsers on the same Wi-Fi network

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, React Leaflet |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (via Sequelize ORM) |
| **Real-time** | Socket.IO (WebSocket + polling) |
| **Auth** | JSON Web Tokens (JWT) + bcrypt |
| **Geocoding** | OpenStreetMap Nominatim API (free, no key needed) |

---

## 📁 Project Structure

```
contact-tracker/
├── client/                         # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/             # Navbar, ProtectedRoute, LoadingScreen
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Global auth state
│   │   ├── hooks/
│   │   │   ├── useSocket.js        # Socket.IO connection hook (viewer side)
│   │   │   └── useGeolocation.js   # Raw geolocation hook
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Landing page
│   │   │   ├── Login.jsx           # Login form
│   │   │   ├── Register.jsx        # Signup form
│   │   │   ├── Dashboard.jsx       # Manage tracking requests
│   │   │   ├── Contacts.jsx        # Contact list
│   │   │   ├── CreateTracking.jsx  # Generate a tracking link
│   │   │   ├── TrackingLink.jsx    # Sharer's page (allows/denies location)
│   │   │   └── LiveMap.jsx         # Viewer's live map page
│   │   ├── services/
│   │   │   ├── api.js              # Axios instance (via Vite proxy)
│   │   │   ├── locationService.js  # GPS capture + socket broadcast + auto-refresh
│   │   │   └── geocodingService.js # OpenStreetMap reverse geocoding
│   │   └── App.jsx                 # Router setup
│   ├── vite.config.js              # Vite + proxy config
│   └── .env                        # Client env vars (see setup)
│
├── server/                         # Express backend
│   ├── config/
│   │   └── db.js                   # Sequelize + MySQL connection
│   ├── controllers/
│   │   ├── authController.js       # Register, login, getMe
│   │   ├── contactController.js    # CRUD contacts
│   │   └── trackingController.js   # Create, update, delete tracking
│   ├── middleware/
│   │   └── auth.js                 # JWT verification middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Contact.js
│   │   ├── TrackingRequest.js
│   │   └── index.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── contacts.js
│   │   └── tracking.js
│   ├── server.js                   # Express app + Socket.IO setup
│   └── .env                        # Server env vars (see setup)
│
├── package.json                    # Root scripts (runs both client + server)
└── README.md
```

---

## ⚙️ Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [MySQL](https://www.mysql.com/) v8.0 or higher
- [Git](https://git-scm.com/)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Venisbhalara/Contact-Location-Tracker.git
cd Contact-Location-Tracker
```

### 2. Install All Dependencies

```bash
npm run install:all
```

> This installs dependencies for the root, server, and client in one command.

### 3. Set Up the Database

Open **MySQL Workbench** (or your preferred MySQL client) and create a new database:

```sql
CREATE DATABASE contact_tracker;
```

### 4. Configure Server Environment Variables

Copy the example env file:

```bash
cd server
copy .env.example .env
```

Open `server/.env` and fill in your values:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=contact_tracker
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_very_secret_key_change_this
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

> ℹ️ **Tables are created automatically** on first run via Sequelize `sync({ alter: true })`. No manual migration needed.

### 5. Start the Application

From the **root** directory:

```bash
npm run dev
```

This starts both the backend (port `5000`) and frontend (port `3000`) concurrently.

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |

---

## 📱 Accessing from a Mobile Device

To test on your phone (must be on the **same Wi-Fi network** as your PC):

### Step 1 — Find your PC's local IP

```powershell
ipconfig
# Look for "IPv4 Address" under your active adapter
# Example: 10.126.122.217
```

### Step 2 — Allow port 5000 through Windows Firewall

```powershell
netsh advfirewall firewall add rule name="Node Server 5000" dir=in action=allow protocol=TCP localport=5000
```

### Step 3 — Update `server/.env`

```env
CLIENT_URL=http://<YOUR_PC_IP>:3000
```

### Step 4 — Restart and open on phone

```bash
npm run dev
```

Open on your phone: **`http://<YOUR_PC_IP>:3000`**

> The Vite dev server automatically exposes itself to the local network. All API and Socket.IO traffic is routed through the Vite proxy — no hardcoded IPs needed in the client.

---

## 🔑 Environment Variables Reference

### `server/.env`

| Variable | Description | Example |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_NAME` | Database name | `contact_tracker` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `yourpassword` |
| `JWT_SECRET` | Secret key for JWT signing | `change_this_in_production` |
| `JWT_EXPIRE` | Token expiry duration | `7d` |
| `CLIENT_URL` | Frontend URL (for CORS) | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |

### `client/.env` (optional)
The client `.env` is intentionally left empty for local development — all API and Socket.IO traffic routes through Vite's built-in proxy. No client env vars are required for local setup.

---

## 📡 API Endpoints

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register a new user |
| `POST` | `/login` | Public | Login and receive JWT |
| `GET` | `/me` | Private | Get current logged-in user |

### Contacts — `/api/contacts`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Private | Get all contacts (paginated) |
| `POST` | `/` | Private | Add a new contact |
| `PUT` | `/:id` | Private | Update a contact |
| `DELETE` | `/:id` | Private | Delete a contact |

### Tracking — `/api/tracking`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/create` | Private | Generate a new tracking link |
| `GET` | `/` | Private | Get all tracking requests for user |
| `GET` | `/:token` | Public | Get tracking info by token |
| `POST` | `/update-location` | Public | Sharer pushes GPS coordinates |
| `DELETE` | `/:id` | Private | Delete tracking (notifies sharer via socket) |

---

## 🔌 Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `join-tracking` | Client → Server | Join a tracking room by token |
| `register-sharer` | Client → Server | Sharer registers their socket in the room |
| `send-location` | Client → Server | Sharer broadcasts their coordinates |
| `location-update` | Server → Client | Live GPS update sent to all viewers |
| `tracking-stopped` | Server → Client | Fired when requester deletes the tracking |

---

## 📜 Available Scripts

From the **root** directory:

| Script | Description |
|---|---|
| `npm run dev` | Start both frontend & backend concurrently |
| `npm run server` | Start only the backend (nodemon) |
| `npm run client` | Start only the frontend (Vite) |
| `npm run install:all` | Install all dependencies (root + server + client) |
| `npm run build` | Build the React frontend for production |

---

## 🏗️ How It Works

```
1. User A (Requester) logs in → creates a tracking link for a phone number
2. The link (/track/:token) is shared with User B (Sharer)
3. User B opens the link on their phone → taps "Allow Location Access"
4. Location is:
   - Sent to the backend via REST (persisted in MySQL)
   - Broadcast via Socket.IO to all viewers in real-time
   - Auto-refreshed every 10 minutes even if stationary
5. User A opens the Live Map (/live/:token) → sees User B's live location
   - Full address shown (road, area, city, state) via OpenStreetMap
6. When User A deletes the tracking:
   - Server emits 'tracking-stopped' via Socket.IO
   - User B's browser immediately shows "Tracking Ended" and stops sending
```

---

## 🔒 Security Notes

- Passwords are hashed with **bcrypt** before storing
- All private routes require a valid **JWT Bearer token**
- CORS is configured to only accept requests from your `CLIENT_URL` and local network IPs
- Tracking links expire after **24 hours** by default
- **Never commit your `.env` file** — it is listed in `.gitignore`

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/Venisbhalara">Venisbhalara</a>
</div>
