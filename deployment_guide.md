# Location Tracker — Deployment Guide

## 🖥️ Local Development

### Prerequisites
- Node.js ≥ 18
- MySQL running locally (port 3306)
- A database named `contact_tracker`

### 1. Install all dependencies
```bash
cd d:\contact-tracker
npm install          # installs concurrently
cd server && npm install
cd ../client && npm install
```

### 2. Configure the backend [.env](file:///d:/contact-tracker/client/.env)
Edit [d:\contact-tracker\server\.env](file:///d:/contact-tracker/server/.env):
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=contact_tracker
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=any_long_random_string
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Configure the frontend [.env](file:///d:/contact-tracker/client/.env)
Edit [d:\contact-tracker\client\.env](file:///d:/contact-tracker/client/.env):
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Create the MySQL database
```sql
CREATE DATABASE contact_tracker;
```
> Sequelize will auto-create all tables on first server start.

### 5. Run both servers
```bash
# From d:\contact-tracker root
npm run dev
```
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

---

## ☁️ Production Deployment

### Database — Railway (MySQL)

1. Go to [railway.app](https://railway.app) → New Project → MySQL
2. Copy the connection details from the MySQL service dashboard:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

---

### Backend — Render

1. Push `d:\contact-tracker\server` to a GitHub repo
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set these settings:

| Setting | Value |
|---------|-------|
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Environment | Node |

5. Add Environment Variables in Render dashboard:

```
PORT=5000
NODE_ENV=production
DB_HOST=<from Railway>
DB_PORT=<from Railway>
DB_NAME=contact_tracker
DB_USER=<from Railway>
DB_PASSWORD=<from Railway>
JWT_SECRET=<generate a 64-char random string>
JWT_EXPIRE=7d
CLIENT_URL=https://your-app.vercel.app
```

6. Deploy → copy the Render URL (e.g. `https://contact-location-tracker.onrender.com`)

---

### Frontend — Vercel

1. Push `d:\contact-tracker\client` to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Set these settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. Add Environment Variables in Vercel dashboard:

```
VITE_API_URL=https://contact-location-tracker.onrender.com/api
VITE_SOCKET_URL=https://contact-location-tracker.onrender.com
```

5. Deploy → your app is live! 🎉

---

### Admin Panel — Vercel

1. Push `d:\contact-tracker\admin` to a GitHub repo (or use the same repo)
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Set these settings:

| Setting | Value |
|---------|-------|
| Project Name | `location-tracker-admin` |
| Root Directory | `admin` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. Add Environment Variables:

```
VITE_API_URL=https://contact-location-tracker.onrender.com/api
VITE_SOCKET_URL=https://contact-location-tracker.onrender.com
```

5. Deploy → your Admin dashboard is live! 🔐

---

## 🔐 Security Checklist

- [ ] Use a long random `JWT_SECRET` (min 32 chars) — never commit it
- [ ] Set `NODE_ENV=production` on Render
- [ ] Restrict MySQL user to only the `contact_tracker` database
- [ ] Vercel → Settings → Functions: set CORS origin to your Vercel domain
- [ ] Enable HTTPS on all services (Render & Vercel do this automatically)
- [ ] Rotate `JWT_SECRET` if ever compromised

---

## 🧪 API Testing Reference

### Auth
```
POST /api/auth/register  { name, email, password }
POST /api/auth/login     { email, password }
GET  /api/auth/me        Authorization: Bearer <token>
```

### Contacts (all protected)
```
POST   /api/contacts           { name, phone, email?, notes? }
GET    /api/contacts           ?search=&page=&limit=
GET    /api/contacts/:id
PUT    /api/contacts/:id       { name?, phone?, email?, notes? }
DELETE /api/contacts/:id
```

### Tracking
```
POST /api/tracking/create           { phoneNumber, trackingType, expiryHours? }
POST /api/tracking/update-location  { token, latitude, longitude, accuracy? }
GET  /api/tracking                  ?status=&page=&limit=
GET  /api/tracking/:token
DELETE /api/tracking/:id
```

---

## 📁 Final Project Structure

```
d:\contact-tracker\
├── package.json          ← root (concurrently)
├── .gitignore
│
├── server\
│   ├── server.js         ← Express + Socket.IO entry
│   ├── .env              ← MySQL credentials (never commit)
│   ├── render.yaml       ← Render deploy config
│   ├── config\db.js      ← Sequelize connection
│   ├── models\           ← User, Contact, TrackingRequest
│   ├── controllers\      ← authController, contactController, trackingController
│   ├── routes\           ← auth.js, contacts.js, tracking.js
│   └── middleware\auth.js ← JWT protect middleware
│
└── client\
    ├── vite.config.js    ← Tailwind + proxy
    ├── vercel.json       ← Vercel deploy config
    ├── .env              ← VITE_API_URL, VITE_SOCKET_URL
    └── src\
        ├── main.jsx
        ├── App.jsx       ← All routes
        ├── context\AuthContext.jsx
        ├── services\api.js, locationService.js
        ├── hooks\useGeolocation.js, useSocket.js
        ├── components\Navbar, ProtectedRoute, LoadingScreen
        └── pages\        ← 8 pages
```
