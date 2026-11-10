# 🎓 Kuda Campus | Student Lost & Found Platform

> **A Professional-Grade Full-Stack React & Node.js Application Inspired by Kuda Bank's Signature Obsidian UI.**  
> Built for the **Collective Labs | Builders Group (CLBG) Software Development Track End-of-Bootcamp Assessment**.

![Project Status](https://img.shields.io/badge/Status-Completed-success?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-43%20Passing-brightgreen?style=flat-square)
![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%20%7C%20Tailwind%20CSS-6825DF?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%20%7C%20Multer-black?style=flat-square)
![License](https://img.shields.io/badge/License-ISC-lightgrey?style=flat-square)

---

## 📌 1. Project Overview

The **Kuda Campus Lost-and-Found Platform** is a modern, high-performance web application designed for university communities, taking design inspiration from **Kuda Bank's** sleek obsidian mobile interface. Misplaced items—such as student ID cards, textbooks, water bottles, and electronics—are often lost in lecture halls, libraries, and hostels without a single reliable matching system.

This platform bridges that gap by allowing students to:
- Post **Lost Items** with photos, locations, and identifying details.
- Post **Found Items** discovered across campus facilities with drag-and-drop photo upload.
- Browse photos in a full-screen **Image Lightbox**.
- Filter, search, and browse active notices in real time with quick action cards.
- Update item lifecycle statuses (`Open` $\rightarrow$ `Claimed` $\rightarrow$ `Returned`).
- Remove obsolete or duplicate reports once resolved with strict ownership authorization.

---

## 🎯 2. Problem Statement & Solution

* **The Problem:** Campus bulletin boards and fragmented WhatsApp groups lead to missed notices, duplicated inquiries, and lost belongings never reaching their rightful owners.
* **The Solution:** An ultra-responsive full-stack web application with high-definition image uploads, transparent tracking, structured categorization, instant search, and real-time status progression.

---

## ⚡ 3. Key Features (Full CRUD + Authentication + Image Upload)

| Operation | Action | Feature Description |
|---|---|---|
| **Auth** | Sign Up & Sign In | Secure JWT authentication with hashed passwords (`bcryptjs`). Pre-seeded with student accounts (`tunde`, `chioma`) and campus admin (`admin`). |
| **Create** | Report Item + Upload Photo | Modal to report Lost or Found items with drag-and-drop **Image Upload** (PNG, JPG, WebP), live preview, and automatic file compression. |
| **Read** | Browse, Search & Lightbox | Kuda-style obsidian feed displaying card thumbnails, full-screen **Photo Lightbox**, real-time analytics counter, and multi-field keyword search. |
| **Update** | Edit, Change Photo & Status | Edit item details, change photos, or quickly transition item status between `Open`, `Claimed`, and `Returned`. Protected by post ownership (only creator or admin). |
| **Delete** | Remove Item | Safe deletion flow with confirmation modal. Protected by post ownership (only creator or admin). |

### Additional Highlights
* **Kuda Bank Design Language**: Obsidian dark mode palette (`#0B0914`), Kuda royal purple accents (`#6825DF`), lilac alert banners, metric balance cards, and mobile bottom navigation.
* **Image Upload Pipeline**: Built with `Multer` on the backend and HTML5 drag-and-drop on the frontend, saving to `/uploads` with generous 25MB body limit support.
* **Modern React 19 Stack**: Built using Vite, Tailwind CSS, and Lucide React icons, compiling to static assets in milliseconds.
* **Resilient Database Layer**: Seamlessly connects to **MongoDB Atlas** in production and falls back to a persistent JSON store for local offline testing.
* **Automated Test Suite**: 43 automated tests verifying health, edge cases, input validation, image upload, and all CRUD operations.

---

## 🛠️ 4. Technology Stack

* **Frontend:** Semantic HTML5, Tailwind CSS (via CDN), Vanilla JavaScript (ES6+), FontAwesome Icons.
* **Backend:** Node.js (v22+), Express.js framework (RESTful API architecture).
* **Database & Persistence:** MongoDB & Mongoose ODM (with local persistent fallback store).
* **Developer Tools:** Git, GitHub, npm, built-in Node test runner.
* **Deployment Platforms:** Render / Vercel (Hosting) + MongoDB Atlas (Cloud Database).

---

## 📂 5. Project Directory Structure

```text
student-lost-and-found/
├── config/
│   └── db.js                 # Database connection manager (MongoDB Atlas + Fallback)
├── controllers/
│   └── itemController.js     # Business logic & CRUD request handlers
├── data/
│   └── items.json            # Persistent local JSON data store
├── models/
│   └── Item.js               # Mongoose schema and unified repository interface
├── public/                   # Frontend assets served by Express
│   ├── css/
│   │   └── style.css         # Custom animations, modal overlays, and toast styles
│   ├── js/
│   │   ├── api.js            # Frontend REST client wrapper
│   │   └── app.js            # DOM controller, modal management, and event handling
│   └── index.html            # Main responsive single-page user interface
├── routes/
│   └── itemRoutes.js         # Express router mapping RESTful API endpoints
├── tests/
│   └── api.test.js           # Automated end-to-end API test suite (29 tests)
├── .env.example              # Template for required environment variables
├── .gitignore                # Git ignore rules (node_modules, .env, logs)
├── AI_USAGE.md               # Detailed AI usage disclosure for CLBG assessment
├── package.json              # Project dependencies and npm scripts
├── README.md                 # Project documentation
└── server.js                 # Main server entry point
```

---

## 🚀 6. Setup and Installation Instructions

Follow these steps to run the application locally:

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **npm** (v9.0.0 or higher)
* **Git** installed on your system

### Step 1: Clone the Repository
```bash
git clone https://github.com/Brolin5/student-lost-and-found.git
cd student-lost-and-found
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create a local `.env` file by copying the example template:
```bash
cp .env.example .env
```
Open `.env` in your text editor:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string_here
```
*(Note: If `MONGODB_URI` is left blank, the app runs using the persistent file database `data/items.json` out of the box).*

### Step 4: Start the Server
```bash
# Production mode
npm start

# Development mode (with live watch)
npm run dev
```

### Step 5: Open in Your Browser
Visit `http://localhost:5000` to interact with the application.

---

## 🧪 7. Testing Instructions

The project comes with an automated test suite verifying all 4 CRUD operations, validation rules, and error states.

Run the test suite with:
```bash
npm test
```

### Verification Checklist:
- [x] **Create:** Form accepts valid input, returns HTTP 201, and displays on list.
- [x] **Read:** Retrieves all saved items, supports category filtering and keyword search.
- [x] **Update:** Changes persist across page reloads and status transitions update properly.
- [x] **Delete:** Confirmation modal prompts before deletion; record permanently removed.
- [x] **Invalid Input:** Rejects empty titles, invalid categories, and invalid post types with HTTP 400.
- [x] **404 Handling:** Requests to non-existent item IDs return HTTP 404 without server crash.

---

## 🌐 8. Deployment Guide (e.g. Render / Vercel)

### Option A: Deploying on Render (Recommended for Express)
1. Push your code to a public/private GitHub repository.
2. Sign in to [Render](https://render.com/) and click **New + $\rightarrow$ Web Service**.
3. Connect your GitHub repository.
4. Set the following build settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. In the **Environment Variables** section, add:
   - `PORT`: `5000`
   - `MONGODB_URI`: *Your free MongoDB Atlas connection string*
6. Click **Deploy Web Service**. Once live, copy your live URL.

### Live Application Link
* **Production URL:** `[INSERT LIVE DEPLOYMENT URL HERE]`
* **GitHub Repository:** https://github.com/Brolin5/student-lost-and-found

---

## 🔒 9. Environment Variables (.env.example)

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Port number the Express server binds to | `5000` |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://user:pass@cluster.mongodb.net/lostfound` |

*Never commit real secrets or database passwords to GitHub.*

---

## 👥 10. Authors & Acknowledgments

* **Developer:** Participant in CLBG Software Development Track
* **Facilitators:** Collective Labs | Builders Group (CLBG) Mentors
* **Assessment Guide:** *Build. Learn. Create. Collaborate.*
