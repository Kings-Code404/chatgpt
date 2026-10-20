# Smart Learning Web App (SLWA)

A complete, responsive, three-tier academic learning management web application built for **Students**, **Teachers**, and **Administrators**.

Developed based on the institutional requirements report and modern design system guidelines, SLWA delivers structured course management, secure examination environments with server-enforced duration, verified syllabus materials, objective auto-grading, and direct student-faculty feedback.

---

## 🏛️ Technology Stack & Architecture

SLWA is built following a strict **Three-Tier Architecture**:

- **Presentation Layer (Frontend):**
  - HTML5, CSS3, JavaScript (ES2023)
  - **Bootstrap 5.3** responsive grid and component utilities
  - **Smart Learning Custom Design System:** Inter typography, Deep Blue (`#004ac6`) & Indigo (`#4b41e1`) accents, subtle glassmorphism cards, and Google Material Symbols
- **Application Layer (Backend):**
  - **Node.js** & **Express.js**
  - MVC / Layered architecture: Controllers, Business Services/Models, Middleware, Validation, and Routes
  - Express Session with secure HTTP-only cookies, Rate Limiting (`express-rate-limit`), Method Override, Multer upload security, and Connect-Flash
- **Data Layer (Database):**
  - **MySQL** with normalized relational tables, foreign key constraints, unique checks, and index optimization
  - Parameterized queries using `mysql2/promise` preventing SQL injection

---

## 📁 Project Structure

```
SLW-App-Site/
├── database/
│   ├── migrate.js             # Automated database migration runner
│   ├── seed.js                # Demo seed data runner (clearly labeled)
│   ├── schema.sql             # Relational MySQL schema (18 tables, including persistent sessions)
│   └── seeds.sql              # Safe institutional seed records
├── public/
│   ├── css/
│   │   └── app.css            # Smart Learning custom design system styles
│   ├── images/
│   │   └── logo.png           # Smart Learning brand logo
│   └── js/
│       ├── app.js             # Global UI behaviors, sidebar, flash dismiss
│       └── exam.js            # Live countdown timer, auto-save, submission
├── src/
│   ├── config/
│   │   ├── db.js              # MySQL connection pool configuration
│   │   └── multer.js          # Secure file upload & MIME validation
│   ├── controllers/
│   │   ├── attemptController.js
│   │   ├── authController.js
│   │   ├── courseController.js
│   │   ├── enrollmentController.js
│   │   ├── examController.js
│   │   ├── feedbackController.js
│   │   ├── notificationController.js
│   │   ├── resourceController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js            # Session auth & RBAC authorization
│   │   └── errorHandler.js    # Global 404 & production-masked 500 handler
│   ├── models/
│   │   ├── attemptModel.js
│   │   ├── courseModel.js
│   │   ├── enrollmentModel.js
│   │   ├── examModel.js
│   │   ├── feedbackModel.js
│   │   ├── notificationModel.js
│   │   ├── resourceModel.js
│   │   └── userModel.js
│   └── routes/
│       ├── admin.js           # Admin routes (/admin/*)
│       ├── auth.js            # Authentication routes (/auth/*)
│       ├── public.js          # Public pages (/, /about, /courses)
│       ├── student.js         # Student routes (/student/*)
│       └── teacher.js         # Teacher routes (/teacher/*)
├── views/
│   ├── admin/                 # Administrator views (12 screens)
│   ├── auth/                  # Login, Register, Password Recovery (4 screens)
│   ├── errors/                # 401, 403, 404, 500 error views
│   ├── partials/              # head, topbar, sidebar, flash, footer
│   ├── public/                # home, about, course catalog, course detail
│   ├── student/               # Student dashboard, exams, results, feedback
│   └── teacher/               # Teacher dashboard, exam editor, resources
├── .env.example               # Environment variables configuration template
├── package.json               # Dependencies and run scripts
├── server.js                  # Express application entry point
└── README.md                  # System manual and role walkthrough
```

---

## 🚀 Quick Start & Installation

See [DEPLOYMENT.md](DEPLOYMENT.md) for the source audit, corrected requirements matrix, Render service configuration, production environment variables, MySQL migration safety, storage requirements, smoke tests, and rollback steps.

### 1. Prerequisites
- **Node.js** (v24.x, as pinned by `package.json`)
- **MySQL Server** (v8.0+ or MariaDB / XAMPP / WAMP)

### 2. Clone / Open Directory
```bash
cd "c:\Users\ABHISHEK KUMAR\OneDrive\Desktop\SLW-App-Site"
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` to match your MySQL server credentials:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=slwa_db
SESSION_SECRET=a_very_long_secure_random_string_32_characters_minimum
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=./uploads
BASE_URL=http://localhost:3000
```

### 4. Install Dependencies
```bash
npm ci
```

### 5. Setup Database Schema & Seed Data
Ensure your MySQL server is running, then execute:
```bash
# Creates the database and all 18 tables with constraints & indexes
npm run migrate

# Inserts safe, clearly-labeled testing accounts & demo courses
npm run seed
```

### 6. Start the Server
```bash
# Production start
npm start

# Or development mode with auto-reload
npm run dev

# Run the project's automated tests
npm test
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Default Test Accounts (Demo Seed Data)

All demo accounts use the standard password: **`Password1!`**

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@slwa.local` | `Password1!` | System-wide users, courses, assignments, audit & announcements |
| **Teacher (Faculty)** | `meera@slwa.local` | `Password1!` | CS courses, exam authoring (MCQs, T/F), resource uploads, grading |
| **Teacher (Faculty)** | `raj@slwa.local` | `Password1!` | Mathematics courses, exams, student feedback review |
| **Student** | `studenta@slwa.local` | `Password1!` | Course enrollment, online exam taking with live timer, results, feedback |
| **Student** | `studentb@slwa.local` | `Password1!` | Mathematics enrollment, exam attempts, notifications |

---

## 🎯 Role-by-Role User Journey Walkthrough

### 👨‍🎓 1. Student Journey
1. **Sign In:** Navigate to `/auth/login` and log in as `studenta@slwa.local`.
2. **Dashboard (`/student/dashboard`):** View real enrolled course counts, scheduled exams, past results, and unread alerts.
3. **Course Enrollment (`/student/courses`):** Browse active courses with department filters. Click **Enroll** on any un-enrolled course. Duplicate enrollment is strictly blocked by both database constraints and backend validation.
4. **Access Study Materials (`/student/courses/:id/resources`):** Enrolled students can safely inspect and download uploaded syllabi and lecture slides. Non-enrolled students are denied access at the backend layer.
5. **Take an Online Examination (`/student/exams`):**
   - Click **Start Exam** on an active exam.
   - The online exam interface (`/student/attempts/:id/take`) displays a real-time countdown synchronized with server timestamps.
   - Question navigator allows jumping between questions. Questions turn solid upon being answered.
   - Changing options auto-saves progress to the server.
   - Once the timer expires or the student submits, objective questions (MCQs, True/False) are auto-graded immediately!
6. **View Results (`/student/results`):** View total scores, pass/fail thresholds, and inspect question-by-question response breakdowns (`/student/results/:attemptId`). Students cannot view other students' private results.
7. **Submit Course Feedback (`/student/feedback`):** Rate completed courses (1-5 stars) and submit constructive comments.
8. **Notification Center (`/student/notifications`):** Read announcements broadcasted by the administration and mark them as read.

---

### 👩‍🏫 2. Teacher Journey
1. **Sign In:** Log in as `meera@slwa.local`.
2. **Faculty Dashboard (`/teacher/dashboard`):** View total assigned courses, enrolled students, active exams, and recent student submissions.
3. **Course Resources (`/teacher/courses/:id/resources`):**
   - Click **Upload New Material** to distribute files (PDF, PPT, Word, Video, Images).
   - Validates MIME type and file size (up to 10 MB).
   - Delete resources when updated.
4. **Author Examinations (`/teacher/exams`):**
   - Click **Create New Exam** (`/teacher/exams/new`) to set title, duration in minutes, pass marks, total marks, attempt limits, and availability dates.
   - Manage Questions (`/teacher/exams/:id/questions/new`): Add Multiple Choice (MCQ with selectable correct option), True/False, or Short Answer questions.
   - Toggle status between **Draft** (hidden from students) and **Published** (available to take).
5. **Review Student Attempts (`/teacher/exams/:id/results`):** Inspect student exam submissions, scores, and dates.
6. **Inspect Feedback (`/teacher/feedback`):** View student ratings and reviews left on assigned courses.

---

### 🛡️ 3. Administrator Journey
1. **Sign In:** Log in as `admin@slwa.local`.
2. **System Dashboard (`/admin/dashboard`):** Global metrics on users, courses, faculty appointments, enrollments, and exams.
3. **User Management (`/admin/users`):**
   - Filter users by role (`student`, `teacher`, `admin`) and status (`active`, `inactive`, `suspended`).
   - Edit user roles, update contact info, or toggle account suspension.
4. **Course Management (`/admin/courses`):**
   - Create, edit, and archive courses.
   - Assign teachers to courses using the inline faculty assignment dropdown.
5. **Enrollment Oversight (`/admin/enrollments`):** Inspect all student enrollments and manage rosters.
6. **Study Resources Audit (`/admin/resources`):** Oversight of all documents uploaded across departments with deletion controls.
7. **Exam & Result Oversight (`/admin/exams`, `/admin/results`):** System-wide review of examinations and student attempts.
8. **Broadcast Announcements (`/admin/notifications/new`):** Compose platform announcements targeted to all users, students only, or faculty only.
9. **Feedback Moderation (`/admin/feedback`):** Review and moderate all course reviews across the university.

---

## 🗄️ MySQL Data Model

The database comprises 17 fully normalized relational tables:

```
roles ───< users ───< student_profiles
             │   ───< teacher_profiles
             ├───< courses (created_by)
             ├───< teacher_course_assignments (teacher_id)
             ├───< enrollments (student_id)
             ├───< study_resources (uploaded_by)
             ├───< exams (created_by)
             ├───< exam_attempts (student_id)
             ├───< notifications (created_by)
             ├───< notification_recipients (user_id)
             └───< feedback (student_id)

courses ───< teacher_course_assignments (course_id)
        ───< enrollments (course_id)
        ───< study_resources (course_id)
        ───< exams (course_id)
        ───< feedback (course_id)

exams ───< questions ───< question_options
      └──< exam_attempts ───< attempt_answers (selected_option -> question_options)

user_sessions stores persistent Express session data for production restarts.
```

### Table Inventory:
1. `roles`: Master user roles (`admin`, `teacher`, `student`).
2. `users`: Credentials, status (`active`, `inactive`, `suspended`), password hash, reset tokens.
3. `student_profiles`: Enrollment number, department, semester, phone, bio.
4. `teacher_profiles`: Employee ID, department, qualification, phone, bio.
5. `courses`: Course code (unique), title, syllabus, credits, category, status.
6. `teacher_course_assignments`: Unique `(teacher_id, course_id)` faculty pairings.
7. `enrollments`: Unique `(student_id, course_id)` student registrations.
8. `study_resources`: File path, original file name, MIME type, size, course link.
9. `exams`: Course link, duration, total marks, pass marks, window, attempt limits, status.
10. `questions`: Exam link, question text, type (`mcq`, `true_false`, `short_answer`), marks.
11. `question_options`: Question link, option text, is_correct boolean.
12. `exam_attempts`: Attempt record, student link, start time, submission time, score, status.
13. `attempt_answers`: Attempt answers linking attempt, question, and selected option.
14. `notifications`: Platform announcements and target audience.
15. `notification_recipients`: Per-user inbox state (`is_read`, `read_at`).
16. `feedback`: Unique `(student_id, course_id)` ratings (1-5) and qualitative review.

---

## 🔒 Security & Reliability Implementation

1. **SQL Injection Defense:** All database queries utilize parameterized SQL statements via `mysql2/promise`. No string concatenation is used in queries.
2. **Password Security:** Passwords hashed with **bcryptjs** (12 salt rounds). Plaintext passwords are never stored.
3. **Server-Enforced RBAC:** Role authorization is validated on the backend middleware layer (`requireAuth`, `requireRole('role')`), not merely through hidden links in templates.
4. **Ownership Verification:** Students can only view their own exam results and attempts. Resource downloads verify enrollment before serving files.
5. **Rate Limiting:** `/auth` routes are protected by `express-rate-limit` (20 attempts per 15-minute window) against brute-force attacks.
6. **File Upload Security:** Multer disk storage validates MIME types against an approved whitelist (PDF, DOCX, PPT, MP4, PNG, JPG). Random hexadecimal prefixes prevent path traversal and file collisions.
7. **Error Masking:** Global error handler masks database errors and call stacks in production (`NODE_ENV=production`), returning friendly institutional error views.

---

## 🌐 Production Deployment & HTTPS

For production deployments (e.g. Ubuntu / Debian VPS with Nginx and Let's Encrypt):

1. Set `.env`:
   ```env
   NODE_ENV=production
   PORT=3000
   ```
2. Run with PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "slwa"
   pm2 startup
   pm2 save
   ```
3. Configure Nginx Reverse Proxy with SSL:
   ```nginx
   server {
       listen 80;
       server_name learning.institution.edu;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name learning.institution.edu;

       ssl_certificate /etc/letsencrypt/live/learning.institution.edu/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/learning.institution.edu/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;

       client_max_body_size 12M;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto https;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 📋 Out-of-Scope Declarations

As explicitly stipulated in the project requirements, the following features are not part of the SLWA product scope and have not been implied:
- ❌ AI Tutoring & AI Essay Grading
- ❌ Payment Gateways / Tuition Fees
- ❌ Live WebRTC Video Conferences
- ❌ University ERP / LDAP Single-Sign-On integrations
- ❌ Native Mobile App Builds

---

## 📄 License & Attribution

Developed for Smart Learning Web App (SLWA). Author: **ABHISHEK KUMAR**.
Distributed under institutional academic license.
