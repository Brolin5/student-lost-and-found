# 🎓 Nile University of Nigeria | Campus Lost & Found Platform

> **A modern, high-performance Full-Stack React & Node.js application built for Nile University of Nigeria students, faculty, and campus administrators.**

---

## 📌 Project Overview
The Nile University Campus Lost & Found Platform provides a centralized digital lost-and-found system to help students quickly report, match, and reclaim misplaced belongings (IDs, electronics, documents, wallets) across campus lecture halls, libraries, and facilities.

---

## 🚀 Live Links & Deployments
- **Live Frontend (Vercel):** [https://student-lost-and-found.vercel.app/](https://student-lost-and-found.vercel.app/)
- **Live Backend (Render):** [https://student-lost-and-found.onrender.com](https://student-lost-and-found.onrender.com)
- **Health Check & Keep-Alive:** [https://student-lost-and-found.onrender.com/api/health](https://student-lost-and-found.onrender.com/api/health)
- **GitHub Repository:** [https://github.com/Brolin5/student-lost-and-found](https://github.com/Brolin5/student-lost-and-found)

---

## 🛠️ Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS (Nile Royal Blue theme), Lucide React Icons
- **Backend:** Node.js, Express.js, native RFC 6455 WebSockets for live alerts
- **Database & Storage:** PostgreSQL, MongoDB Atlas, Persistent JSON storage fallback, Cloudinary
- **Authentication & Security:** JWT (JSON Web Tokens), bcryptjs, Role-Based Access Control (Student vs. Admin)
- **Hosting & CI/CD:** Vercel (Frontend), Render (Backend), Git / GitHub

---

## ⚡ Main Features
1. **Lost & Found Reporting (Create):** Post lost or found property with photos, location, category, and contact details.
2. **Instant Search & Real-Time Feed (Read):** Multi-filter search (category, post type, status) and live campus feed.
3. **Smart Match Radar:** Intelligent similarity algorithm automatically pairing lost reports with found items.
4. **Item Lifecycle Management (Update):** Owners can edit post details and update statuses (`Open` → `Claimed` → `Returned`).
5. **Secure Post Removal (Delete):** Safe removal with confirmation modal, protected by ownership authorization.
6. **Anti-Fraud Ownership Verification:** Claimants submit secret identifying proof before retrieving items.
7. **Real-Time WebSocket Notification Tray:** Live notifications for matches and claim status changes.
8. **Interactive Onboarding Tour:** 5-step spotlight walkthrough guiding new users through the interface.
9. **Student Profile:** Dashboard to track filed claims, manage personal reports, and view activity stats.
10. **Admin Audit Trail:** Role-protected security logging of all logins, reports, status changes, and claims.

---

## 🧪 Testing & Verification
The project includes a comprehensive 59-test automated API test suite (`npm test`):
- **Health & Initialization:** System status and telemetry validation.
- **Authentication:** Registration, login, JWT token issuance, and password verification.
- **Route Protection & Validation:** 400 Bad Request on empty/invalid inputs and duplicate usernames.
- **CRUD Operations:** Complete Create, Read, Update, and Delete verification with ownership checks.
- **Security & Authorization:** 401 Unauthorized for unauthenticated requests, 403 Forbidden for non-owners/non-admins.
- **Smart Match & Claims Flow:** Automated matching calculations and claim verification flows.

---

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/Brolin5/student-lost-and-found.git
cd student-lost-and-found
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run automated tests
```bash
npm test
```

### 4. Start the application
```bash
# Start backend server (port 5000)
npm start

# In a separate terminal, start frontend dev server (port 5173)
npm run dev
```

---

## 👥 Demo Credentials
For testing the live application:
- **Student 1:** Username: `tunde` | Password: `password123`
- **Student 2:** Username: `chioma` | Password: `password123`
- **Campus Admin:** Username: `admin` | Password: `adminpassword`
