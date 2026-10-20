# SLWA project audit and Render deployment

## 1. Detected project

- **Project:** SMART LEARNING WEB APP (SLWA), based on `package.json`, the project report, and the existing UI.
- **Architecture:** Server-rendered three-tier web application; EJS templates are served by Express. There is no separate frontend build or static-site output.
- **Runtime/backend:** CommonJS Node.js 24, Express 4.21.2, EJS, JavaScript, and Bootstrap loaded from CDNs. The report describes Express 5, but the checked-in application uses Express 4.
- **Database:** MySQL via `mysql2/promise`. SQL, schema, and models are MySQL-specific. Render Postgres is not a drop-in replacement.
- **Entry point and commands:** `server.js`; `npm ci`; `npm start`; schema setup with `npm run migrate`.
- **Upload storage:** Multer writes to `UPLOAD_DIR` (defaults to `./uploads`). Uploaded files are not included in Git. A Render persistent disk or external object storage is required for durable production uploads.
- **Source inputs:** The DOCX report is present at `project-file/SLW_APP Project Report.docx`. The supplied website source is already expanded in this workspace. No source ZIP was present in the workspace.

## 2. Report requirement comparison

| Report requirement | Existing source evidence | Assessment |
|---|---|---|
| Register, authenticate, recover passwords, manage sessions | `/auth/*`, bcrypt, reset tokens, SMTP support | Implemented in code; password recovery requires SMTP configuration. |
| Admin, teacher, and student roles | Role middleware and separate route/view groups | Implemented; ownership checks were tightened in this repair. |
| Profile management | Student, teacher, and admin profile routes/views | Partially implemented. The report lists address/employee number fields that differ from the current schema/profile fields. |
| Course management and teacher assignment | Admin course CRUD and assignment routes | Implemented in code; database-backed workflows need a configured MySQL instance to verify. |
| Student enrollment | Enroll/drop routes and unique student-course key | Implemented; dropping now preserves the enrollment as `dropped` and active enrollment gates access. |
| Study material upload/download | Multer, resource routes, enrollment checks | Implemented; durable production storage depends on a persistent disk or object store. MIME checks use the client-provided MIME type, so the server does not independently inspect file content. |
| Exams and question authoring | Teacher exam/question routes; MCQ, true/false, short-answer models | Implemented; objective grading exists. Short answers are not teacher-graded in the current source. |
| Timed attempts, answer saving, scoring, results | Student attempt routes/models and browser timer | Implemented; server enforces duration and answer ownership checks were added. Cross-browser/database workflow remains unverified without MySQL. |
| Notifications and feedback | Role-specific routes, recipient models, and views | Implemented in code; end-to-end database verification remains unavailable. The current mail/SMS objective is not implemented as a notification channel. |
| Security, logging, validation, errors | bcrypt, validators, parameterized values, session and error middleware | Partially implemented. Fixes below address key issues; external penetration testing and production configuration are still required. |
| Responsive web UI | EJS, CSS, responsive Bootstrap layout | Source is present; no browser visual QA was completed in this run. |
| Native app, live classes, AI tutoring, payments, ERP | Report explicitly lists these as limitations/future work | Out of current scope. |

The report's data dictionary and the actual `database/schema.sql` are not identical. The running application code and its schema currently align around `phone`, `department`, `bio`, and the existing MySQL entities; the report also describes fields such as student address and employee number. No destructive schema rewrite was made. Confirm which academic fields are required before adding columns or migrating existing records.

## 3. Initial audit and prioritized repairs

1. **Exam answer-key disclosure:** Student attempt rendering used the same options query that returned `is_correct`. Student attempts now receive option data without correctness flags.
2. **Answer tampering:** Answer saves accepted a question or option from another exam. Saves now verify the question belongs to the attempt's exam and the option belongs to the question. Server-side save and submit paths enforce the attempt deadline.
3. **Teacher authorization:** Several teacher resource/exam operations did not verify assignment ownership. Course, resource, exam, question, and result views/mutations now check the relevant teacher-course relationship or exam ownership.
4. **CSRF and unsafe method override:** Added session-backed CSRF verification for state-changing requests and removed query-string method override. The remaining form method override uses POST bodies.
5. **Session safety and persistence:** Login now regenerates the session ID; account status/role changes are rechecked on protected requests; cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Added a MySQL-backed session store and `user_sessions` table so sessions survive restarts.
6. **Enrollment lifecycle:** Dropped enrollments previously vanished and still counted as enrolled. Drops now preserve history and only active enrollments grant access; re-enrollment reactivates the existing row.
7. **Sensitive data:** User lookup/list queries no longer pass password hashes/reset-token fields into views. Password reset tokens are stored as SHA-256 digests. Reset links are mailed when SMTP is configured and are no longer printed to logs.
8. **Upload path safety:** Upload directory is created at startup, stored file names use MIME-mapped extensions, and download/delete paths are restricted to the configured upload directory.
9. **Dependency and production configuration:** Updated Nodemailer and Multer, removed vulnerable watcher dependencies in favor of `node --watch`, set the Node engine to 24, and added baseline security headers and `/healthz`.
10. **Input validation:** Admin user edits validate names, email, roles, and status; teachers cannot demote their own admin account.

### Remaining concerns

- MIME type is supplied by the client. Use content-signature inspection before accepting uploads if the application will store untrusted files at scale.
- There is no automated integration test against MySQL, no end-to-end browser suite, and no visual/responsive browser review in this run.
- Database CRUD, login/logout, email delivery, real uploads, authorization against real records, and Render deployment remain unverified until the required services/credentials are configured.
- The report's full field-level profile requirements and its stated Express version need stakeholder confirmation. Existing data was not overwritten or converted.
- No live Render service, repository connection, production database, DNS, or credentials were supplied; nothing was deployed.

## 4. Render architecture for this source

Create a **Render Web Service** using the Node runtime. EJS pages are dynamically rendered by Express, so the project is not a Render Static Site. The server reads `process.env.PORT` (default 3000) and calls `app.listen(PORT)` without pinning a loopback-only host.

Keep MySQL. Render documents a custom MySQL deployment backed by a persistent disk; this is an operationally self-managed MySQL service, not a managed Render Postgres database. A separate managed MySQL provider is also possible if it offers a reachable MySQL endpoint and backups. Select MySQL 8 or a compatible supported MySQL release and keep the web service/database in the same Render region when using private networking.

The application uploads into the filesystem. For Render-local storage, use a **paid** web service with a persistent disk mounted at `/var/data` and set `UPLOAD_DIR=/var/data/uploads`. A free web service cannot attach a persistent disk. If uploads must survive service replacement or support multiple web instances, use object storage instead of a service disk.

## 5. Exact Render service settings

| Setting | Value |
|---|---|
| Service type | Web Service |
| Runtime | Node |
| Node version | 24.x (`package.json` engine is `>=24 <25`) |
| Branch | The branch containing the reviewed source; select it in the Render dashboard. |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/healthz` (returns 200 only when the app can query MySQL; 503 indicates DB is not ready) |
| Static publish directory | None |
| Pre-deploy migration command | `npm run migrate` on a paid service with a reachable DB; otherwise run it once from a trusted machine/job that can reach the database. |

### Environment variables

Set these under the Web Service's Environment page. Use values from the actual MySQL service/provider; do not copy credentials into Git.

| Variable | Required value |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | A cryptographically random value of at least 32 characters. Generate locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `DB_HOST` | MySQL internal hostname/private address shown by the MySQL service/provider. |
| `DB_PORT` | MySQL port, normally `3306` (confirm in provider settings). |
| `DB_USER` | MySQL application user. |
| `DB_PASSWORD` | MySQL application password. |
| `DB_NAME` | Existing database name; the migration uses this name and validates it as a SQL identifier. |
| `BASE_URL` | Exact public origin, e.g. `https://<your-service>.onrender.com` (no trailing slash). |
| `MAX_FILE_SIZE_MB` | `10` (current application default). |
| `UPLOAD_DIR` | `/var/data/uploads` when a paid disk is mounted at `/var/data`; otherwise an external storage integration is needed for durability. |
| `SMTP_HOST` | SMTP hostname for password resets. |
| `SMTP_PORT` | SMTP port, commonly `587` or `465`, as provided. |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials. |
| `SMTP_FROM` | Verified sender address/name accepted by the SMTP provider. |

Password reset email is inactive until all SMTP host/user/password values are configured. Render's free web services do not permit outbound SMTP on ports 25, 465, or 587; use a paid service or add a compatible HTTPS email provider integration before relying on password recovery.

## 6. Database setup, migration, and data safety

1. Select or provision a MySQL database. Do not select Render Postgres for this source without a planned schema/query conversion and data migration.
2. If using Render's custom MySQL deployment, follow Render's MySQL instructions and attach a persistent disk to the MySQL service. Restrict it to private networking where possible.
3. Create a dedicated application database and user with only the privileges the app/migration needs. `npm run migrate` creates the selected database if necessary and runs idempotent `CREATE TABLE IF NOT EXISTS` statements, including the session table.
4. Before a migration on a database containing data, take and verify a backup, for example `mysqldump --single-transaction --routines --triggers DB_NAME > slwa-before-migration.sql`. Keep the backup outside the web service filesystem.
5. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in the migration environment, then run `npm run migrate` once. The migration adds missing tables; it does not drop tables or seed demo users.
6. Do **not** run `npm run seed` against production. It inserts demo accounts with known sample passwords. Use it only in a disposable development database.
7. For paid Render Web Services, the pre-deploy command can be set to `npm run migrate`. Review migrations before enabling automatic execution. Render runs pre-deploy commands in a separate instance; do not depend on its local filesystem changes.
8. For a rollback after application deployment, use Render's previous successful deploy/rollback option. This schema change is additive. If a later release changes data, restore only from a verified database backup after assessing writes made since the backup.

If `DB_NAME` is pre-created and the database account cannot run `CREATE DATABASE`, provision the database first with the provider, then run the migration using an account allowed to create tables. Do not change `schema.sql` to use Postgres syntax.

## 7. GitHub and deployment steps

1. Install Git, Node.js 24, and npm locally. Create a GitHub account and a Render account if needed.
2. In the project directory, review `git status --short` and confirm no `.env`, uploaded files, database dumps, or real credentials are staged. `.env` and upload contents are ignored by `.gitignore`; verify with `git check-ignore .env uploads/*` where files exist.
3. Review `.env.example`; it contains placeholders only. Never upload the real `.env`. If a real credential was committed in the past, rotate it even if the file is later deleted.
4. Install and verify with `npm ci`, `npm test`, and `npm audit`. Commit only the source, lockfile, documentation, schema, and safe example configuration. Push the reviewed branch to GitHub.
5. In Render, choose **New → Web Service**, connect the correct GitHub repository, and select the branch containing this code.
6. Enter the settings from the table above (`npm ci`, `npm start`, `/healthz`). Add the production environment values from the checklist and the persistent disk if retaining local uploads.
7. Provision/configure MySQL separately. Use its actual internal host and database credentials; do not use a `DATABASE_URL` unless the chosen provider explicitly gives one and the app is updated to parse it.
8. Run the migration once against the intended production database after a verified backup. Never run demo seeding in production.
9. Deploy. Review the build logs for `npm ci` errors and runtime logs for MySQL connectivity or session-table errors. The app binds to Render's provided `PORT`.
10. Visit the service URL and complete the smoke checks below. Configure a custom domain only after the service is healthy; Render provides TLS for configured domains.
11. For later changes, push to the connected branch and allow auto-deploy, or use Manual Deploy in Render. Review the resulting logs and smoke tests after every deploy.

## 8. Post-deploy smoke checks

Run these manually against the live URL after setting up a non-production test user and test course. The current source has no production credentials or live deployment to test from this workspace.

- Open `/` and `/about`; verify page styles, logo, fonts, and navigation.
- Open `/healthz`; expect `200 {"status":"ok"}` when MySQL is reachable.
- Register a test student and teacher; sign in, navigate role pages, sign out, and confirm protected pages redirect after logout.
- Confirm a student cannot access teacher/admin paths, a dropped student cannot access enrolled materials or exams, and one student cannot access another student's attempts/results.
- As an assigned teacher, create a test course exam, add questions, publish it, and take it as an enrolled student. Confirm the page source does not contain correctness flags before submission, answer saves work, the timer expires server-side, and the final result is shown.
- Confirm unassigned teachers cannot create/edit/delete course exams or upload/delete resources in another teacher's course.
- Upload and download a permitted file; restart/redeploy and confirm it remains available under the persistent disk mount.
- Submit feedback, receive an admin notification, mark it read, and verify the badge updates.
- Request password reset with SMTP configured; verify the email arrives and the token expires after one hour.
- Check HTTPS redirects/cookies in browser devtools and response headers. Confirm no stack traces or secrets appear in user-facing errors/logs.

## 9. Troubleshooting and rollback

- **Build fails at Node engine check:** Confirm Render uses Node 24.x and `package-lock.json` matches `package.json`; deploy with `npm ci`.
- **App starts but health is 503:** Check `DB_HOST`, `DB_PORT`, database reachability/private region, DB grants, `DB_NAME`, and that `npm run migrate` completed.
- **Missing `user_sessions` table:** Run the migration against the same database the app uses, then restart/redeploy.
- **Login loops or secure-cookie issue:** Confirm HTTPS, `NODE_ENV=production`, Render proxy configuration, `SESSION_SECRET`, and the MySQL session table.
- **Uploads disappear:** The service is using ephemeral local storage or `UPLOAD_DIR` is outside the mounted disk. Attach a paid persistent disk at `/var/data` or switch to object storage and redeploy with `UPLOAD_DIR=/var/data/uploads`.
- **Email reset does not arrive:** Verify SMTP credentials, sender verification, provider allowlists, and Render plan port restrictions. Check mail provider logs; do not print reset URLs into service logs.
- **Migrations fail on `CREATE DATABASE`:** Create the database using the provider console or an appropriately privileged account, then rerun the migration with the selected `DB_NAME`. Back up data first.
- **Rollback:** Select the previous successful deploy in Render. For schema changes, restore a verified DB backup only when necessary and after determining whether current writes must be preserved.

Render free web services sleep after 15 minutes without inbound traffic and take about a minute to wake. Free web services use ephemeral filesystems and cannot attach disks; free Render Postgres expires 30 days after creation and is incompatible with this MySQL code without migration. Free plans are appropriate for a disposable preview, not durable production storage. Check the [current Render pricing page](https://render.com/pricing) before selecting a paid web, MySQL, or disk configuration because plan names and prices change. A disk-backed web service cannot scale to multiple instances and persistent disks affect zero-downtime deploy behavior.

## 10. Files changed

Modified:

- `.env.example`, `.gitignore`, `README.md`
- `database/migrate.js`, `database/schema.sql`
- `package.json`, `package-lock.json`, `server.js`
- `public/js/app.js`, `public/js/exam.js`
- `src/config/multer.js`
- `src/controllers/attemptController.js`, `authController.js`, `courseController.js`, `examController.js`, `feedbackController.js`, `resourceController.js`, `userController.js`
- `src/middleware/auth.js`
- `src/models/attemptModel.js`, `courseModel.js`, `enrollmentModel.js`, `examModel.js`, `userModel.js`
- `src/routes/auth.js`
- `views/partials/head.ejs`, `sidebar.ejs`, `topbar.ejs`
- `views/student/exam-take.ejs`, `views/teacher/exam-questions.ejs`

Created:

- `DEPLOYMENT.md`
- `src/config/mysqlSessionStore.js`, `src/middleware/csrf.js`, `src/utils/storage.js`
- `test/csrf.test.js`, `test/storage.test.js`, `test/templates.test.js`
- `SLWA-Render-Ready.zip` (deliverable; ignored by Git)

## 11. Verification performed in this workspace

- `npm ci`: passed against the final lockfile; installed 117 packages and reported 0 vulnerabilities.
- `npm test`: passed, 7 tests, 0 failures. Tests cover CSRF token acceptance/rejection, upload-path containment, and EJS template compilation; they do not replace database or browser integration tests.
- `node --check` on 38 JavaScript files: passed after the final code changes.
- `npm audit`: passed, 0 vulnerabilities across production and development dependencies.
- `node server.js`: started and listened on port 3000. MySQL is not installed/configured in this workspace.
- Local HTTP smoke: `GET /` returned 200; `/healthz` returned the expected 503 because MySQL was unavailable. No server error was logged for those requests after the anonymous-session fix.
- MySQL CRUD, login/logout, upload, SMTP delivery, full browser journeys, and live Render checks: not verified. No database or deployment credentials were supplied.
