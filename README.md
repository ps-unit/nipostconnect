# 📮 NiPOST Connect v2.0
### Nigerian Postal Service — Internal Communication Platform

---

## Quick Start (5 commands)

```bash
# 1. Copy and fill environment variables
cp .env.example server/.env
# Edit server/.env — set DATABASE_URL and generate VAPID keys (see below)

# 2. Install all dependencies
cd server && npm install
cd ../client && npm install
cd ..

# 3. Generate VAPID keys for push notifications, paste into server/.env
cd server && npm run vapid:generate

# 4. Set up database (migrate + seed 37 states, 10 depts, all channels, super admin)
cd server
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run uploads:init     # creates uploads/images and uploads/documents folders

# 5. Start development
cd ..
npm run dev              # starts server :5000 + client :5173 together
```

Open **http://localhost:5173**

**Default Super Admin login:**
```
Email    : pmg@nipost.gov.ng
Password : NiPOST@Admin2026
```
> Change immediately after first login via Admin Panel → Staff tab.

---

## What's Included (Phase 1 + Phase 2)

| Feature                   | Status |
|---------------------------|--------|
| Staff registration & auth | ✅ |
| 37 state channels + FCT   | ✅ |
| 10 department channels    | ✅ |
| Role-based access (4 tiers) | ✅ |
| Real-time messaging       | ✅ |
| Official memos            | ✅ |
| Polls & voting            | ✅ |
| Anonymous suggestions     | ✅ |
| Direct messages           | ✅ |
| Channel join requests     | ✅ |
| Admin panel (6 tabs)      | ✅ |
| Emergency broadcast       | ✅ |
| Audit log                 | ✅ |
| PWA (installable)         | ✅ |
| Push notifications (VAPID)| ✅ |
| File & image sharing      | ✅ |
| Read receipts (memos)     | ✅ |
| Notification centre       | ✅ |
| Offline support           | ✅ |

---

## Project Structure

```
nipost-connect/
├── .env.example                    ← copy to server/.env and fill in
├── package.json                    ← root workspace (runs both together)
│
├── server/
│   ├── server.js                   ← Express + Socket.io entry point
│   ├── uploads/                    ← created by npm run uploads:init
│   │   ├── images/
│   │   └── documents/
│   ├── prisma/
│   │   └── schema.prisma           ← full DB schema (v2, 16 tables)
│   └── src/
│       ├── middleware/
│       │   ├── auth.js             ← JWT verification
│       │   └── rbac.js             ← role-based access control
│       ├── routes/
│       │   ├── auth.js             ← register, login, refresh, logout
│       │   ├── channels.js         ← CRUD, membership, join requests
│       │   ├── messages.js         ← paginated list, send, pin, react
│       │   ├── polls.js            ← create, vote, close
│       │   ├── users.js            ← directory, profile
│       │   ├── dms.js              ← direct messages
│       │   ├── admin.js            ← stats, staff, audit, broadcast
│       │   ├── uploads.js          ← file upload (Phase 2)
│       │   └── notifications.js    ← push subscriptions (Phase 2)
│       ├── socket/
│       │   └── index.js            ← real-time + push notification triggers
│       └── utils/
│           ├── seed.js             ← DB seed script
│           └── webpush.js          ← VAPID push notification helper (Phase 2)
│
└── client/
    ├── index.html                  ← PWA meta, manifest link
    ├── vite.config.js
    ├── public/
    │   ├── manifest.json           ← PWA manifest
    │   ├── sw.js                   ← service worker (cache + push)
    │   ├── offline.html            ← offline fallback page
    │   └── icons/                  ← add your icon files here (see below)
    └── src/
        ├── App.jsx                 ← router + PWA/notification prompts
        ├── main.jsx
        ├── contexts/
        │   ├── AuthContext.jsx
        │   └── SocketContext.jsx
        ├── hooks/
        │   ├── usePWA.jsx          ← install prompt + SW lifecycle (Phase 2)
        │   └── useNotifications.jsx← VAPID subscribe/unsubscribe (Phase 2)
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx    ← 4-step onboarding
        │   └── ChatPage.jsx        ← main layout
        ├── services/
        │   └── api.js              ← all Axios calls + auto token refresh
        └── components/
            ├── layout/
            │   ├── NavRail.jsx         ← left icon rail + notification bell
            │   ├── ChannelSidebar.jsx  ← grouped channel list
            │   ├── ChatMain.jsx        ← messages + compose + file upload
            │   ├── MembersPanel.jsx    ← right panel with presence dots
            │   └── DMSidebar.jsx       ← DM conversation list
            ├── chat/
            │   ├── MessageBubble.jsx   ← all message types + attachments
            │   ├── FileUpload.jsx      ← drag-and-drop file picker (Phase 2)
            │   └── AttachmentViewer.jsx← image lightbox + doc download (Phase 2)
            ├── modals/
            │   ├── AdminPanel.jsx      ← 6-tab admin panel
            │   ├── ComposeModal.jsx    ← announce / memo / poll
            │   └── CreateChannelModal.jsx
            └── shared/
                ├── styles.js           ← design tokens
                ├── LoadingScreen.jsx
                └── NotificationBell.jsx← bell + InstallPrompt + banners (Phase 2)
```

---

## Icons (Required for PWA)

Create `client/public/icons/` and add PNG files at these sizes:
`72, 96, 128, 144, 152, 192, 384, 512`

Quick option — generate from any square image using:
```
https://www.pwabuilder.com/imageGenerator
```

---

## Environment Variables

All go in `server/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/nipost_connect"
JWT_SECRET="min-64-char-random-string"
JWT_REFRESH_SECRET="another-min-64-char-random-string"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
CLIENT_URL="http://localhost:5173"
SERVER_URL="http://localhost:5000"
ALLOWED_EMAIL_DOMAIN="nipost.gov.ng"

# Phase 2 — run: cd server && npm run vapid:generate
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:ict@nipost.gov.ng

SEED_ADMIN_EMAIL="pmg@nipost.gov.ng"
SEED_ADMIN_PASSWORD="NiPOST@Admin2026"
SEED_ADMIN_NAME="Postmaster General"
SEED_ADMIN_STAFF_ID="NPS/HQ/2024/001"
```

---

## Production Deployment

```bash
# Build client
cd client && npm run build

# Set NODE_ENV=production in server/.env
# Run migrations
cd server && npx prisma migrate deploy

# Start with PM2
pm2 start server.js --name "nipost-connect"
pm2 save && pm2 startup
```

Nginx config:
```nginx
server {
    server_name connect.nipost.gov.ng;

    location / {
        root /var/www/nipost-connect/client/dist;
        try_files $uri $uri/ /index.html;
    }
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /uploads {
        proxy_pass http://localhost:5000;
    }
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Phase Roadmap

| Phase | Status    | Key Features |
|-------|-----------|-------------|
| 1     | ✅ Done   | Auth, RBAC, channels, messages, polls, DMs, admin panel, real-time |
| 2     | ✅ Done   | PWA, push notifications, file sharing, read receipts, notification centre |
| 3     | Up next   | Analytics dashboard, scheduled messages, HRMIS integration, bulk memo dispatch |
| 4     | Planned   | Voice channels, AI memo drafting, SMS fallback for critical alerts |

---

*NiPOST Connect — Built for the Nigerian Postal Service*
*ICT Directorate · ict@nipost.gov.ng · ext. 1200*
