# Sankalp IAS UPSC Preparation Platform

## Run locally

Prerequisites: Node.js 20.19+ or 22.12+, and npm.

```sh
npm install
npm run dev
```

The development server runs the API and Vite app together. Set any required
secrets in a local `.env` file; never commit that file.

## Sign-in and access

Copy `.env.example` to `.env`, then set a unique `SESSION_SECRET` (at least 32
characters) and the administrator email and password. A database can be set
with `DATABASE_URL` on the server or connected later from Admin → Database.
Generate a session secret with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Learners create accounts from the sign-in screen. Learner accounts are stored
in PostgreSQL's `app_users` table. Administrators sign in through the same
screen using the credentials configured on the server; administrator accounts
cannot be self-registered. In development, learner accounts may be held in
memory until PostgreSQL is connected.

In production, set `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the
deployment's secret manager; `DATABASE_URL` is optional when connecting from
the admin panel. Never use the sample values in `.env.example` as credentials.

## Database connection and durable content

An administrator can connect PostgreSQL from Admin → Database. The app checks
the connection, creates its required tables, and loads existing app content if
the selected database already has it. For a database without app content, the
current content is saved as the initial state. Successful changes made through
the app are written to PostgreSQL before the API confirms success.

For remote PostgreSQL servers, TLS certificate verification remains enabled.
If the provider uses a private CA that Node.js does not trust by default, set
`DATABASE_SSL_CA_FILE` to the path of the provider's CA certificate in PEM
format, then restart the server and reconnect from Admin → Database. You can
also include `sslrootcert` with that file path in the PostgreSQL connection URI.
For Supabase, download the database root certificate from the project's
Database settings under SSL Configuration. Do not disable certificate
verification or use a certificate from an untrusted source.

Content is currently stored as one JSONB snapshot in `app_content_state`, while
learner credentials use `app_users`. Keep a stable `SESSION_SECRET`; it
encrypts the saved connection string in `data/database-config.json`. That
server-side file is not returned to clients and is excluded from git. Back up
the encrypted config file and the secret together on persistent server storage.
If the secret is lost or changed, reconnect the database from the admin panel.
Never put a connection string in client-side source, browser storage, or public
chat.

This snapshot approach is intended for a single app instance. Run a single
server until a multi-instance-safe repository and migration strategy is in
place; independent in-memory snapshots can otherwise overwrite one another.
Test attempts and syllabus completion are keyed to the signed-in account.
Profile scores and subject accuracy are calculated from submitted attempts;
percentile and study-hour estimates are not shown because the app has no
verified peer-comparison or time-tracking data.

## Question bank and practice tests

Administrators can add or edit question-bank entries, including bilingual
prompts, options, answers, subject, paper, difficulty, source, and explanation.
Question counts for tests are calculated from their attached questions. Create
tests in Practice or from the Content Studio shortcut, import questions, then
publish a completed test to make it visible to learners. Drafts remain admin
only; learners already viewing Practice refresh the published test list
automatically.

## Classes and study files

Administrators can add YouTube Live/recording links, Zoom meeting links, or
Google Meet links to a class. YouTube videos play in the class window when
embedding is enabled for that video; Zoom and Meet open in their own site or
application because those services do not support general-purpose embedding
inside this app. Use an HTTPS URL for the matching platform.

Administrators can attach PDF, JPG, PNG, and WebP files to editorials, Mains
questions, and class handouts, and publish static notes or monthly magazine
PDFs in the dedicated PDF library. Uploads are limited to 15 MB each and four
files per upload request. `UPLOAD_DIR` selects the storage directory; the
default is `./uploads`. Uploaded files require a signed-in account to access,
and only administrators can upload them.

Use a persistent disk/volume for `UPLOAD_DIR` in deployment and back it up.
Ephemeral container filesystems will lose uploaded files during redeploys.
For multi-instance or high-availability deployments, configure shared durable
object storage instead; this app currently supports local disk only.

## Production build

```sh
npm install
npm run lint
npm run build
npm start
```

The build creates the browser app and a bundled production server in `dist/`.
The server listens on `PORT` when provided, or port `3000` by default. The
`/api/health` endpoint can be used for basic process health checks.

## Deployment readiness

Application content, profiles, and attempts persist in PostgreSQL after a
database is connected. Without a database, content-management writes are
disabled rather than reported as saved. Content is shared across learners,
while test attempts and syllabus progress are currently keyed by user inside
the single JSONB snapshot.

Content sections start empty; administrators add and publish tests, questions,
classes, resources, and discussions. Existing snapshots are cleaned once of the
application's known seeded demo records. Test participation counts represent
distinct learners with a recorded attempt, not enrollments. The syllabus
catalogue is built in as curriculum content, while each learner's progress is
stored separately.

Before launch, implement and verify at minimum:

- Normalized PostgreSQL repositories and migrations as content volume grows.
- Server-authoritative test delivery and scoring; answer keys must not be sent to
  the browser before a test is submitted.
- Further per-user data isolation, privacy/retention controls, and secure secret handling.
- Automated API and browser tests, backups, monitoring, and deployment rollback.
