# AI Usage Report

> **Course:** CLBG Software Development Track — End-of-Bootcamp Assessment  
> **Project:** Project 02: Student Lost-and-Found Platform  
> **Participant:** Bootcamp Candidate  

---

## 1. AI Tools Used

| Tool | Purpose / Phase | How It Was Utilized |
|---|---|---|
| **Google Antigravity / Claude Assistant** | Architecture, Scaffolding, Debugging & Testing | Used to plan project structure, scaffold Express routes, generate test cases, and create responsive UI styling. |
| **Node.js Diagnostics & Shell** | Execution & Verification | Used in tandem to inspect console logs, debug network requests, and verify tests locally before committing. |

---

## 2. Important Prompts

Below are the key prompts and discussions used during the project lifecycle:

### Prompt 1: Project Architecture & Model Design
> *"Given Project 02: Student Lost-and-Found Platform from the CLBG guide, design a clean Mongoose schema with fields for title, description, post_type (Lost/Found), category, location, contact_info, status (Open/Claimed/Returned), and timestamps. Also, provide a fallback persistent file store so the application runs seamlessly both offline and when connected to MongoDB Atlas."*
* **What it produced:** The Mongoose schema in `models/Item.js` along with the dual-mode repository that prevents local database crashes when an external database URI is not yet configured.

### Prompt 2: RESTful API Controllers & Validation
> *"Generate Express controller handlers for GET all (with search by title/location and filters for type, category, and status), GET by ID, POST item (with strict field validation), PUT item (with status updates), and DELETE item. Ensure friendly error payloads and correct HTTP status codes (200, 201, 400, 404, 500)."*
* **What it produced:** The controller logic in `controllers/itemController.js` and Express router setup in `routes/itemRoutes.js`.

### Prompt 3: Automated CRUD & Edge Case Testing
> *"Write an automated integration test script in pure Node.js that starts the Express server, checks health, validates rejection of invalid inputs (empty title, invalid category), tests Create, Read, Update, and Delete operations, and verifies 404 responses for non-existent items."*
* **What it produced:** `tests/api.test.js`, running 29 assertions across 8 distinct suites.

### Prompt 4: Responsive UI & Real-Time Feedback
> *"Create a single-page frontend using HTML5, Tailwind CSS, and vanilla JavaScript. Include quick analytics cards, filter tabs for Lost vs Found, search bar, item cards with badges, Create/Edit modals, delete confirmation modal, and auto-dismissing toast notifications."*
* **What it produced:** `public/index.html`, `public/css/style.css`, `public/js/api.js`, and `public/js/app.js`.

---

## 3. Features or Code Generated with AI

1. **Initial Project Scaffolding:** `package.json`, environment variable management (`dotenv`), and directory structuring.
2. **Data Model & Schema:** Mongoose schema definition with validation rules and enum constraints (`Lost` | `Found`, `Open` | `Claimed` | `Returned`).
3. **API Routing & Handlers:** Controller functions implementing the 4 compulsory CRUD operations, search queries (`$regex`), and aggregate count calculations for the dashboard.
4. **Client Interface:** Responsive modal layouts, Tailwind styling, badge classes, and DOM manipulation for dynamic card updates.
5. **Automated Test Suite:** Multi-suite test runner testing API endpoints and HTTP error codes.

---

## 4. Changes I Made to AI-Generated Code

* **Route Order Precedence Fix:** The `/api/items/stats` route was originally being caught by the dynamic `/:id` route, causing Express to treat the word `"stats"` as an item ID and fail. I moved the `/stats` route definition before the `/:id` route in `routes/itemRoutes.js` to ensure proper routing precedence.
* **Escaping User Input in HTML:** Updated `app.js` to add an `escapeHtml()` sanitization function to prevent XSS vulnerabilities when displaying user-submitted item titles and descriptions.
* **Dual-Store Persistence Fallback:** Ensured the backend gracefully handles environments without an active MongoDB connection by reading and writing to `data/items.json`. This ensures assessors can test the project locally without needing local database software installed.
* **Delete Safety Confirmation:** Replaced a native browser `confirm()` popup with an accessible, custom modal dialog (`#delete-modal`) to avoid accidental deletions and maintain visual consistency with the design system.

---

## 5. Errors and How I Resolved Them

### Error 1: Partial Dependency Extraction During Installation
* **Issue:** During an initial `npm install`, a process interruption left the `mongoose` package partially extracted, resulting in `MODULE_NOT_FOUND: Cannot find module '../../error/mongooseError'`.
* **Investigation:** Inspected the stack trace which pointed directly into the incomplete `node_modules/mongoose/lib/drivers/` path.
* **Resolution:** Re-ran `npm install --prefer-offline` cleanly to complete dependency unpacking and verified the module via `node -e "console.log(require('mongoose').version)"`.

### Error 2: Search Query Parameter Handling
* **Issue:** Empty search strings were initially adding an empty regex match, which returned an empty array on local filtering.
* **Investigation:** Inspected the filter logic in `itemController.js` and noticed `req.query.q` was truthy even when containing only whitespace.
* **Resolution:** Added `.trim()` and a check `if (q && q.trim())` before applying the regex search filter.

---

## 6. How I Tested and Verified AI-Generated Code

1. **Code Walkthrough & Review:** Read through each generated function line-by-line to ensure I understand the logic, arguments, and return types before executing.
2. **Automated Integration Testing:** Created and ran `npm test` (`tests/api.test.js`), asserting:
   - Successful HTTP 201 creation with matching payloads.
   - HTTP 400 rejection on empty strings and missing fields.
   - HTTP 200 retrieval with query filtering (`?type=Lost`).
   - HTTP 200 updates persisting status changes.
   - HTTP 200 deletion and subsequent HTTP 404 verification.
3. **Manual Cross-Browser & Mobile Verification:**
   - Tested responsive layout on desktop and simulated mobile viewpoints (375px width).
   - Tested page refresh persistence to ensure data remained intact.
   - Tested edge cases (special characters in titles, long descriptions, rapid modal open/close).

---

## 7. What I Learned

* **AI as an Accelerator, Not a Replacement:** AI significantly sped up the creation of boilerplate CRUD controllers and responsive CSS classes. However, understanding JavaScript execution order (such as Express route matching precedence) was critical to debugging issues that AI initially introduced.
* **Defending Code Requires Deep Comprehension:** Because the assessment requires an oral technical defense, every AI-assisted module had to be thoroughly understood. I learned how the frontend `fetch` request translates into an Express route, reaches the controller, queries the model, and returns a JSON payload to the client.
* **Resilience in Full-Stack Architecture:** Building the dual-store persistence layer demonstrated the value of decoupling business logic from the underlying storage engine, ensuring the app remains reliable under varying development and evaluation environments.
