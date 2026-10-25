import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import pg from 'pg';
import multer from 'multer';
import type { ForumPost, LibraryItem, LiveClass, MainsQuestion, MockTest, Question, SyllabusModule } from './src/types/index.ts';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { UPSC_SYLLABUS_MODULES } from './src/data/syllabus.ts';

import fs from 'fs';
import path from 'path';

dotenv.config();

interface TestAttempt {
  id: number;
  userId: string;
  testId: string;
  score: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  totalQuestions: number;
  durationSeconds: number;
  completedAt: string;
  subjectResults: { subject: string; correct: number; total: number }[];
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || '';
const adminPassword = process.env.ADMIN_PASSWORD || '';
const sessionCookieName = 'sankalp_session';
const sessionLifetimeSeconds = 8 * 60 * 60;
const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
fs.mkdirSync(uploadDirectory, { recursive: true });
const allowedUploadTypes: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};
const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedUploadTypes[extension] !== file.mimetype) {
      return callback(new Error('Only PDF, JPG, PNG, and WebP files are supported.'));
    }
    callback(null, true);
  }
});

if (isProduction && sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
}
if (isProduction && (!adminEmail || adminPassword.length < 12)) {
  throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters in production.');
}

app.use(express.json({ limit: '10mb' }));

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'learner' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      authUser?: SessionUser;
    }
  }
}

interface StoredUser extends SessionUser {
  passwordSalt: string;
  passwordHash: string;
}

const localUsers = new Map<string, StoredUser>();

function derivePasswordHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

const configuredAdminHash = adminEmail && adminPassword
  ? derivePasswordHash(adminPassword, `${sessionSecret}:${adminEmail}`)
  : null;

function signSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify({
    ...user,
    expiresAt: Date.now() + sessionLifetimeSeconds * 1000
  })).toString('base64url');
  const signature = createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function getSessionUser(req: Request): SessionUser | null {
  const cookie = req.headers.cookie
    ?.split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${sessionCookieName}=`));
  if (!cookie) return null;

  try {
    const token = decodeURIComponent(cookie.slice(sessionCookieName.length + 1));
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expected = createHmac('sha256', sessionSecret).update(payload).digest();
    const provided = Buffer.from(signature, 'base64url');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser & { expiresAt: number };
    if (
      typeof session.id !== 'string' ||
      typeof session.name !== 'string' ||
      typeof session.email !== 'string' ||
      (session.role !== 'learner' && session.role !== 'admin') ||
      typeof session.expiresAt !== 'number' ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }

    return { id: session.id, name: session.name, email: session.email, role: session.role };
  } catch {
    return null;
  }
}

function setSessionCookie(res: Response, user: SessionUser): void {
  const secure = isProduction ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=${encodeURIComponent(signSession(user))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionLifetimeSeconds}${secure}`
  );
}

function clearSessionCookie(res: Response): void {
  const secure = isProduction ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

const requireAuthentication = (req: Request, res: Response, next: NextFunction) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.authUser = user;
  next();
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.authUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required.' });
  }
  next();
};

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' }
});

// Resilient DATABASE_URL resolution
let dbUrl = process.env.DATABASE_URL;

// Fallback: If .env contains a bare postgres:// or postgresql:// URL without KEY=
if (!dbUrl || dbUrl.startsWith('https://')) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const rawEnv = fs.readFileSync(envPath, 'utf8');
      const match = rawEnv.match(/postgres(?:ql)?:\/\/[^\s"']+/);
      if (match) {
        dbUrl = match[0];
        console.log('[DB] Extracted PostgreSQL connection URL from .env file directly');
      }
    }
  } catch (e) {
    console.error('Could not read .env directly:', e);
  }
}

// Runtime content starts empty; administrators publish content for learners.
const initialDbState = {
  questions: [] as Question[],
  liveClasses: [] as LiveClass[],
  mockTests: [] as MockTest[],
  mainsQuestions: [] as MainsQuestion[],
  libraryItems: [] as LibraryItem[],
  forumPosts: [] as ForumPost[],
  syllabusModules: structuredClone(UPSC_SYLLABUS_MODULES),
  attempts: [] as TestAttempt[],
  userSyllabus: {} as Record<string, SyllabusModule[]>,
  demoContentCleaned: true
};

type AppState = Omit<typeof initialDbState, 'mockTests' | 'questions' | 'userSyllabus'> & {
  mockTests: MockTest[];
  questions: Question[];
  userSyllabus: Record<string, SyllabusModule[]>;
  demoContentCleaned?: boolean;
};
let dbState: AppState = structuredClone(initialDbState);
let pool: pg.Pool | null = null;
let isPgConnected = false;
let connectedDatabase = '';
let databaseSwitchInProgress = false;
let stateWriteQueue: Promise<void> = Promise.resolve();
let mutationQueue: Promise<void> = Promise.resolve();
const databaseConfigPath = path.resolve(process.env.DB_CONFIG_FILE || path.join(process.cwd(), 'data', 'database-config.json'));

function databaseEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Set a stable SESSION_SECRET of at least 32 characters before saving a database connection.');
  }
  return createHash('sha256').update(secret).digest();
}

function encryptDatabaseUrl(url: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', databaseEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(url, 'utf8'), cipher.final()]);
  return JSON.stringify({
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url')
  });
}

function decryptDatabaseUrl(): string | null {
  if (!fs.existsSync(databaseConfigPath)) return null;
  const stored = JSON.parse(fs.readFileSync(databaseConfigPath, 'utf8')) as {
    iv?: string;
    tag?: string;
    ciphertext?: string;
  };
  if (!stored.iv || !stored.tag || !stored.ciphertext) {
    throw new Error('Saved database connection settings are invalid.');
  }
  const decipher = createDecipheriv('aes-256-gcm', databaseEncryptionKey(), Buffer.from(stored.iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(stored.tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(stored.ciphertext, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

function saveEncryptedDatabaseUrl(url: string): void {
  fs.mkdirSync(path.dirname(databaseConfigPath), { recursive: true });
  const temporaryPath = `${databaseConfigPath}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporaryPath, encryptDatabaseUrl(url), { mode: 0o600 });
  fs.renameSync(temporaryPath, databaseConfigPath);
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AppState>;
  return Array.isArray(state.questions) &&
    Array.isArray(state.liveClasses) &&
    Array.isArray(state.mockTests) &&
    Array.isArray(state.mainsQuestions) &&
    Array.isArray(state.libraryItems) &&
    Array.isArray(state.forumPosts) &&
    Array.isArray(state.syllabusModules) &&
    Array.isArray(state.attempts);
}

function removeLegacyDemoContent(state: AppState): boolean {
  if (state.demoContentCleaned) return false;
  const legacyTestIds = new Set(['test-prelims-abhyas-01', 'test-polity-sectional', 'test-csat-speed']);
  const legacyClassIds = new Set(['live-ir-west-asia', 'live-ethics-case-studies', 'live-polity-judiciary']);
  const legacyMainsIds = new Set(['mains-gs2-electoral', 'mains-gs3-energy']);
  const legacyLibraryIds = new Set([
    'lib-editorial-sc-verdict',
    'lib-magazine-vision-summary',
    'lib-ncert-modern-history',
    'lib-pib-economy'
  ]);
  const legacyForumIds = new Set(['post-1', 'post-2', 'post-3']);

  state.questions = state.questions.filter(question => question.id > 8);
  state.mockTests = state.mockTests.filter(test => !legacyTestIds.has(test.id));
  state.mockTests.forEach(test => {
    test.questions = test.questions.filter(question => question.id > 8);
    test.totalQuestions = test.questions.length;
  });
  state.liveClasses = state.liveClasses.filter(liveClass => !legacyClassIds.has(liveClass.id));
  state.mainsQuestions = state.mainsQuestions.filter(question => !legacyMainsIds.has(question.id));
  state.libraryItems = state.libraryItems.filter(item => !legacyLibraryIds.has(item.id));
  state.forumPosts = state.forumPosts.filter(post => !legacyForumIds.has(post.id));
  state.demoContentCleaned = true;

  return true;
}

async function prepareDatabase(url: string): Promise<{ candidate: pg.Pool; databaseName: string; state: AppState }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Enter a valid PostgreSQL connection string.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
    throw new Error('Only PostgreSQL connection strings are supported.');
  }

  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname.toLowerCase());
  const uriCaFile = parsedUrl.searchParams.get('sslrootcert')?.trim();
  for (const parameter of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'sslpassword', 'sslnegotiation']) {
    parsedUrl.searchParams.delete(parameter);
  }
  const sslCaFile = process.env.DATABASE_SSL_CA_FILE?.trim() || uriCaFile;
  let ssl: pg.PoolConfig['ssl'];
  if (!isLocal) {
    ssl = { rejectUnauthorized: true };
    if (sslCaFile) {
      try {
        ssl.ca = fs.readFileSync(path.resolve(sslCaFile), 'utf8');
      } catch {
        throw new Error('DATABASE_SSL_CA_FILE must point to a readable PEM certificate from your PostgreSQL provider.');
      }
    }
  }
  const candidate = new pg.Pool({
    connectionString: parsedUrl.toString(),
    ssl,
    connectionTimeoutMillis: 8000,
    max: 10
  });
  try {
    const result = await candidate.query<{ database_name: string }>(
      'SELECT current_database() AS database_name'
    );
    await candidate.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(320) UNIQUE NOT NULL,
        password_salt VARCHAR(64) NOT NULL,
        password_hash VARCHAR(128) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'learner' CHECK (role = 'learner'),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await candidate.query(`
      CREATE TABLE IF NOT EXISTS app_content_state (
        id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const savedState = await candidate.query<{ state: unknown }>(
      'SELECT state FROM app_content_state WHERE id = 1'
    );
    let loadedState = dbState;
    let needsMigration = false;
    if (savedState.rows.length > 0) {
      if (!isAppState(savedState.rows[0].state)) {
        throw new Error('The connected database contains an incompatible app content record.');
      }
      loadedState = savedState.rows[0].state;
      loadedState.userSyllabus ??= {};
      needsMigration = removeLegacyDemoContent(loadedState);
      if (needsMigration) {
        await candidate.query(
          `UPDATE app_content_state SET state = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
          [JSON.stringify(loadedState)]
        );
      }
    } else {
      await candidate.query(
        'INSERT INTO app_content_state (id, state) VALUES (1, $1::jsonb)',
        [JSON.stringify(loadedState)]
      );
    }
    return { candidate, databaseName: result.rows[0]?.database_name || parsedUrl.pathname.slice(1), state: loadedState };
  } catch (error) {
    await candidate.end().catch(() => undefined);
    throw error;
  }
}

async function persistDbState(): Promise<void> {
  if (!pool || !isPgConnected) throw new Error('Database is not connected.');
  const currentPool = pool;
  const snapshot = JSON.stringify(dbState);
  stateWriteQueue = stateWriteQueue.catch(() => undefined).then(async () => {
    await currentPool.query(
      `INSERT INTO app_content_state (id, state, updated_at)
       VALUES (1, $1::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = CURRENT_TIMESTAMP`,
      [snapshot]
    );
  });
  return stateWriteQueue;
}

async function switchDatabase(url: string, saveConfiguration = true): Promise<void> {
  if (databaseSwitchInProgress) throw new Error('A database connection change is already in progress.');
  databaseSwitchInProgress = true;
  let candidatePool: pg.Pool | null = null;
  try {
    await mutationQueue.catch(() => undefined);
    await stateWriteQueue.catch(() => undefined);
    const { candidate, databaseName, state } = await prepareDatabase(url);
    candidatePool = candidate;
    if (saveConfiguration) {
      saveEncryptedDatabaseUrl(url);
    }
    const previousPool = pool;
    pool = candidatePool;
    candidatePool = null;
    dbState = state;
    isPgConnected = true;
    connectedDatabase = databaseName;
    if (previousPool) await previousPool.end().catch(error => console.warn('[DB] Previous pool close failed:', error));
  } finally {
    if (candidatePool) await candidatePool.end().catch(() => undefined);
    databaseSwitchInProgress = false;
  }
}

function databaseConnectionError(error: unknown): string {
  if (error instanceof Error && (
    error.message.startsWith('Only PostgreSQL') ||
    error.message.startsWith('Enter a valid') ||
    error.message.startsWith('Set a stable') ||
    error.message.startsWith('The connected database') ||
    error.message.startsWith('DATABASE_SSL_CA_FILE')
  )) {
    return error.message;
  }

  const code = error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : '';
  if (['SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(code)) {
    return 'The database TLS certificate is not trusted. Download the database root CA certificate from your provider and set DATABASE_SSL_CA_FILE to its PEM file path, or add sslrootcert=<PEM-file-path> to the PostgreSQL URI. Restart the app before reconnecting.';
  }
  if (code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
    return 'The database host does not match its TLS certificate. Copy the full connection URI from your provider and check that its hostname has not been changed.';
  }
  if (code === '28P01' || code === '28000') {
    return 'The database rejected the username or password. Copy a fresh connection URI from your provider and check whether special characters in the password are URL-encoded.';
  }
  if (code === '3D000') {
    return 'That PostgreSQL database does not exist. Check the database name in the provider connection URI.';
  }
  if (code === '42501') {
    return 'The database account does not have permission to create or update the app tables. Use a PostgreSQL account with the required permissions.';
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'The database host could not be found. Check the hostname and DNS/network access.';
  }
  if (code === 'ECONNREFUSED') {
    return 'The database refused the connection. Check that it is running, the port is correct, and your IP is allowed by the provider.';
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === '57P01') {
    return 'The database connection timed out or was interrupted. Check network access, provider availability, and any IP allowlist.';
  }
  return 'Could not connect to that database. Check the connection URI, database permissions, network access, and provider TLS requirements.';
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', authRateLimit, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || email.length > 320 || !password || password.length > 200) {
    return res.status(400).json({ error: 'Enter your email address and password.' });
  }

  try {
    if (configuredAdminHash && email === adminEmail) {
      const expectedHash = await configuredAdminHash;
      const submittedHash = await derivePasswordHash(password, `${sessionSecret}:${adminEmail}`);
      if (timingSafeEqual(expectedHash, submittedHash)) {
        const user = { id: `admin:${adminEmail}`, name: 'Administrator', email: adminEmail, role: 'admin' as const };
        setSessionCookie(res, user);
        return res.json({ user });
      }
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    if (!pool || !isPgConnected) {
      if (isProduction) return res.status(503).json({ error: 'Sign-in is temporarily unavailable. Please try again later.' });
      const user = localUsers.get(email);
      if (!user) return res.status(401).json({ error: 'Email or password is incorrect.' });
      const submittedHash = await derivePasswordHash(password, user.passwordSalt);
      const expectedHash = Buffer.from(user.passwordHash, 'base64url');
      if (submittedHash.length !== expectedHash.length || !timingSafeEqual(submittedHash, expectedHash)) {
        return res.status(401).json({ error: 'Email or password is incorrect.' });
      }
      const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
      setSessionCookie(res, sessionUser);
      return res.json({ user: sessionUser });
    }

    const result = await pool.query<{
      id: string;
      name: string;
      email: string;
      password_salt: string;
      password_hash: string;
    }>('SELECT id, name, email, password_salt, password_hash FROM app_users WHERE email = $1', [email]);
    const account = result.rows[0];
    if (!account) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const submittedHash = await derivePasswordHash(password, account.password_salt);
    const expectedHash = Buffer.from(account.password_hash, 'base64url');
    if (submittedHash.length !== expectedHash.length || !timingSafeEqual(submittedHash, expectedHash)) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const user = { id: account.id, name: account.name, email: account.email, role: 'learner' as const };
    setSessionCookie(res, user);
    res.json({ user });
  } catch (error) {
    console.error('[AUTH] Sign-in failed:', error);
    res.status(500).json({ error: 'We could not sign you in. Please try again.' });
  }
});

app.post('/api/auth/register', authRateLimit, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Enter a name between 2 and 100 characters.' });
  }
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 12 || password.length > 200) {
    return res.status(400).json({ error: 'Choose a password with at least 12 characters.' });
  }
  if (email === adminEmail) {
    return res.status(409).json({ error: 'This email is reserved for the administrator.' });
  }
  if (isProduction && (!pool || !isPgConnected)) {
    return res.status(503).json({ error: 'Account creation is temporarily unavailable. Please try again later.' });
  }

  try {
    const passwordSalt = randomBytes(16).toString('base64url');
    const passwordHash = (await derivePasswordHash(password, passwordSalt)).toString('base64url');
    const user: StoredUser = {
      id: randomUUID(),
      name,
      email,
      role: 'learner',
      passwordSalt,
      passwordHash
    };

    if (pool && isPgConnected) {
      await pool.query(
        'INSERT INTO app_users (id, name, email, password_salt, password_hash) VALUES ($1, $2, $3, $4, $5)',
        [user.id, user.name, user.email, user.passwordSalt, user.passwordHash]
      );
    } else {
      if (localUsers.has(email)) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      localUsers.set(email, user);
    }

    const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    setSessionCookie(res, sessionUser);
    res.status(201).json({ user: sessionUser });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('[AUTH] Account creation failed:', error);
    res.status(500).json({ error: 'We could not create your account. Please try again.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

app.use('/api', requireAuthentication);

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.authUser });
});

app.get('/api/admin/database', requireAdmin, (_req, res) => {
  res.json({
    connected: isPgConnected,
    database: connectedDatabase || null,
    persistence: 'postgresql',
    configured: fs.existsSync(databaseConfigPath) || Boolean(process.env.DATABASE_URL),
    savedEncrypted: fs.existsSync(databaseConfigPath)
  });
});

app.post('/api/admin/database/connect', requireAdmin, async (req, res) => {
  const connectionString = typeof req.body?.connectionString === 'string'
    ? req.body.connectionString.trim()
    : '';
  if (!connectionString || connectionString.length > 2048) {
    return res.status(400).json({ error: 'Enter a PostgreSQL connection string (up to 2,048 characters).' });
  }
  try {
    await switchDatabase(connectionString);
    res.json({
      connected: true,
      database: connectedDatabase,
      persistence: 'postgresql',
      configured: true,
      savedEncrypted: true
    });
  } catch (error) {
    const errorCode = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : 'unknown';
    console.error('[DB] Database connection change failed:', errorCode);
    res.status(400).json({ error: databaseConnectionError(error) });
  }
});

app.use('/api', async (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (databaseSwitchInProgress) {
    return res.status(503).json({ error: 'A database connection change is in progress. Please retry in a moment.' });
  }
  if (!pool || !isPgConnected) {
    return res.status(503).json({ error: 'Connect a PostgreSQL database in Admin → Database before making changes.' });
  }
  const previousMutation = mutationQueue;
  let releaseMutation!: () => void;
  mutationQueue = new Promise<void>(resolve => { releaseMutation = resolve; });
  await previousMutation.catch(() => undefined);
  const stateBeforeMutation = structuredClone(dbState);
  const sendJson = res.json.bind(res);
  let responsePending = false;
  let mutationReleased = false;
  const release = () => {
    if (mutationReleased) return;
    mutationReleased = true;
    releaseMutation();
  };
  res.once('close', release);
  res.json = ((payload: unknown) => {
    if (responsePending) return res;
    responsePending = true;
    persistDbState()
      .then(() => sendJson(payload))
      .catch(error => {
        console.error('[DB] Could not persist application state:', error instanceof Error ? error.message : 'Unknown error');
        dbState = stateBeforeMutation;
        if (!res.headersSent) {
          res.status(503);
          sendJson({ error: 'The database could not save this change. Please retry after checking the connection.' });
        }
      })
      .finally(release);
    return res;
  }) as Response['json'];
  next();
});

app.post('/api/uploads', requireAdmin, (req, res, next) => {
  uploadMiddleware.array('files', 4)(req, res, error => {
    if (error) {
      const partialFiles = (req.files || []) as Express.Multer.File[];
      partialFiles.forEach(file => fs.unlinkSync(file.path));
      const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'Each file must be 15 MB or smaller.'
        : error.message || 'The selected file type is not supported.';
      return res.status(400).json({ error: message });
    }
    next();
  });
}, (req, res) => {
  const files = (req.files || []) as Express.Multer.File[];
  const invalidFile = files.find(file => {
    const descriptor = fs.openSync(file.path, 'r');
    const signature = Buffer.alloc(12);
    const bytesRead = fs.readSync(descriptor, signature, 0, signature.length, 0);
    fs.closeSync(descriptor);
    const bytes = signature.subarray(0, bytesRead);
    const extension = path.extname(file.filename).toLowerCase();
    if (extension === '.pdf') return !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'));
    if (extension === '.jpg' || extension === '.jpeg') return !(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff);
    if (extension === '.png') return !bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    return !(bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP');
  });
  if (invalidFile) {
    files.forEach(file => fs.unlinkSync(file.path));
    return res.status(400).json({ error: 'A file did not match its declared PDF or image type.' });
  }
  res.status(201).json({
    files: files.map(file => ({
      url: `/uploads/${file.filename}`,
      name: file.originalname,
      type: file.mimetype
    }))
  });
});

app.get('/uploads/:filename', requireAuthentication, (req, res) => {
  if (!/^[0-9a-f-]+\.(pdf|jpe?g|png|webp)$/i.test(req.params.filename)) {
    return res.status(404).json({ error: 'File not found.' });
  }
  res.sendFile(path.join(uploadDirectory, req.params.filename), error => {
    if (error && !res.headersSent) {
      const statusCode = 'statusCode' in error && error.statusCode === 404 ? 404 : 500;
      res.status(statusCode).json({ error: 'Could not read this file.' });
    }
  });
});

// ----------------------------------------------------------------------------
// PRELIMS QUESTIONS & CSV IMPORTER API
// ----------------------------------------------------------------------------
app.get('/api/questions', (_req, res) => {
  res.json(dbState.questions);
});

function buildQuestion(input: Partial<Question>, id: number): Question | null {
  const subjects: Question['subject'][] = ['Polity', 'Economy', 'History', 'Geography', 'Environment', 'Science & Tech', 'Current Affairs', 'CSAT'];
  const papers: Question['gsPaper'][] = ['GS-1', 'GS-2', 'GS-3', 'CSAT'];
  const difficulties: Question['difficulty'][] = ['Easy', 'Moderate', 'Hard', 'Standard UPSC'];
  if (
    typeof input.questionEn !== 'string' || !input.questionEn.trim() ||
    !Array.isArray(input.optionsEn) || input.optionsEn.length !== 4 ||
    input.optionsEn.some(option => typeof option !== 'string' || !option.trim()) ||
    !Number.isInteger(input.correctOptionIndex) || input.correctOptionIndex! < 0 || input.correctOptionIndex! > 3 ||
    (input.subject !== undefined && !subjects.includes(input.subject)) ||
    (input.gsPaper !== undefined && !papers.includes(input.gsPaper)) ||
    (input.difficulty !== undefined && !difficulties.includes(input.difficulty)) ||
    (input.optionsHi !== undefined && (!Array.isArray(input.optionsHi) || input.optionsHi.length !== 4 || input.optionsHi.some(option => typeof option !== 'string')))
  ) return null;

  return {
    id,
    subject: input.subject || 'Polity',
    gsPaper: input.gsPaper || 'GS-2',
    difficulty: input.difficulty || 'Standard UPSC',
    sourceReference: typeof input.sourceReference === 'string' ? input.sourceReference.trim() : 'UPSC Standard Reference',
    questionEn: input.questionEn.trim(),
    questionHi: typeof input.questionHi === 'string' && input.questionHi.trim() ? input.questionHi.trim() : input.questionEn.trim(),
    optionsEn: input.optionsEn.map(option => option.trim()),
    optionsHi: Array.isArray(input.optionsHi) && input.optionsHi.length === 4
      ? input.optionsHi.map(option => option.trim())
      : input.optionsEn.map(option => option.trim()),
    correctOptionIndex: input.correctOptionIndex!,
    explanationEn: typeof input.explanationEn === 'string' ? input.explanationEn.trim() : '',
    explanationHi: typeof input.explanationHi === 'string' ? input.explanationHi.trim() : ''
  };
}

app.post('/api/questions', requireAdmin, (req, res) => {
  const nextId = dbState.questions.length ? Math.max(...dbState.questions.map(question => question.id)) + 1 : 1;
  const newQuestion = buildQuestion(req.body ?? {}, nextId);
  if (!newQuestion) return res.status(400).json({ error: 'Enter a question, four options, and a valid correct answer.' });
  dbState.questions.unshift(newQuestion);
  res.status(201).json(newQuestion);
});

app.put('/api/questions/:id', requireAdmin, (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const questionIndex = dbState.questions.findIndex(question => question.id === id);
  if (questionIndex === -1) return res.status(404).json({ error: 'Question not found.' });
  const updatedQuestion = buildQuestion(req.body ?? {}, id);
  if (!updatedQuestion) return res.status(400).json({ error: 'Enter a question, four options, and a valid correct answer.' });
  dbState.questions[questionIndex] = updatedQuestion;
  dbState.mockTests.forEach(test => {
    test.questions = test.questions.map(question => question.id === id ? updatedQuestion : question);
    test.totalQuestions = test.questions.length;
  });
  res.json(updatedQuestion);
});

// Bulk Import from CSV / JSON
app.post('/api/questions/bulk', requireAdmin, (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Questions array is required' });
  }

  let nextId = dbState.questions.length > 0 
    ? Math.max(...dbState.questions.map(x => x.id || 0)) + 1 
    : 1;

  const validQuestions = questions.map((q: any) => ({
    id: nextId++,
    subject: q.subject || 'Polity',
    gsPaper: q.gsPaper || 'GS-2',
    difficulty: q.difficulty || 'Standard UPSC',
    sourceReference: q.sourceReference || 'UPSC Question Bank',
    questionEn: q.questionEn || '',
    questionHi: q.questionHi || q.questionEn || '',
    optionsEn: Array.isArray(q.optionsEn) ? q.optionsEn : ['Option A', 'Option B', 'Option C', 'Option D'],
    optionsHi: Array.isArray(q.optionsHi) ? q.optionsHi : (Array.isArray(q.optionsEn) ? q.optionsEn : ['विकल्प A', 'विकल्प B', 'विकल्प C', 'विकल्प D']),
    correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
    explanationEn: q.explanationEn || 'Detailed analysis by Sankalp IAS faculty.',
    explanationHi: q.explanationHi || 'विस्तृत विश्लेषण।'
  })).filter(q => q.questionEn.trim().length > 0);

  dbState.questions.unshift(...validQuestions);

  res.status(201).json({
    success: true,
    importedCount: validQuestions.length,
    totalQuestions: dbState.questions.length
  });
});

app.delete('/api/questions/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const initialLength = dbState.questions.length;
  dbState.questions = dbState.questions.filter(q => q.id !== id);

  // Also remove from mock tests
  dbState.mockTests.forEach(test => {
    test.questions = test.questions.filter(q => q.id !== id);
    test.totalQuestions = test.questions.length;
  });

  res.json({ success: true, deleted: dbState.questions.length < initialLength });
});

// ----------------------------------------------------------------------------
// LIVE CLASSES API
// ----------------------------------------------------------------------------
function isValidStreamUrl(provider: LiveClass['streamProvider'], value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (provider === 'youtube') return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host);
    if (provider === 'zoom') return host === 'zoom.us' || host.endsWith('.zoom.us');
    if (provider === 'google-meet') return host === 'meet.google.com';
    return provider === 'other';
  } catch {
    return false;
  }
}

app.get('/api/live-classes', (_req, res) => {
  res.json(dbState.liveClasses);
});

app.post('/api/live-classes', requireAdmin, (req, res) => {
  const c = req.body;
  if (!c.title || !c.facultyName) {
    return res.status(400).json({ error: 'Title and faculty name are required' });
  }
  if (c.streamUrl && !isValidStreamUrl(c.streamProvider, c.streamUrl)) {
    return res.status(400).json({ error: 'Provide a valid HTTPS URL for the selected class platform.' });
  }

  const newClass = {
    id: `class-${Date.now()}`,
    title: c.title,
    hindiTitle: c.hindiTitle || c.title,
    facultyName: c.facultyName,
    facultyTitle: c.facultyTitle || '',
    subject: c.subject || 'Polity',
    gsPaper: c.gsPaper || 'GS-2',
    batch: c.batch || '',
    status: c.status || 'upcoming',
    startTime: c.startTime || '',
    duration: c.duration || '',
    attendeesCount: c.attendeesCount || 0,
    coverImage: c.coverImage || '',
    lectureNotesPdf: c.lectureNotesPdf || '',
    streamProvider: c.streamProvider || 'youtube',
    streamUrl: c.streamUrl || '',
    description: c.description || '',
    tags: c.tags || ['UPSC', c.subject || 'GS'],
    chatMessages: []
  };

  dbState.liveClasses.unshift(newClass);
  res.status(201).json(newClass);
});

app.put('/api/live-classes/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const idx = dbState.liveClasses.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Class not found' });

  const updates = req.body as Partial<LiveClass>;
  const nextClass = { ...dbState.liveClasses[idx], ...updates };
  if (nextClass.streamUrl && !isValidStreamUrl(nextClass.streamProvider, nextClass.streamUrl)) {
    return res.status(400).json({ error: 'Provide a valid HTTPS URL for the selected class platform.' });
  }
  dbState.liveClasses[idx] = nextClass;
  res.json(dbState.liveClasses[idx]);
});

app.delete('/api/live-classes/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  dbState.liveClasses = dbState.liveClasses.filter(c => c.id !== id);
  res.json({ success: true });
});

// ----------------------------------------------------------------------------
// MOCK TESTS API
// ----------------------------------------------------------------------------
app.get('/api/mock-tests', (_req, res) => {
  const tests = _req.authUser?.role === 'admin'
    ? dbState.mockTests
    : dbState.mockTests.filter(test =>
      (test.publishStatus ?? 'published') === 'published' && test.questions.length > 0
    );
  res.json(tests.map(test => {
    const testAttempts = dbState.attempts.filter(attempt => attempt.testId === test.id);
    return {
      ...test,
      attemptsCount: testAttempts.length,
      participantsCount: new Set(testAttempts.map(attempt => attempt.userId)).size
    };
  }));
});

app.post('/api/mock-tests', requireAdmin, (req, res) => {
  const t = req.body ?? {};
  if (typeof t.title !== 'string' || !t.title.trim() || t.title.trim().length > 200 || (typeof t.hindiTitle === 'string' && t.hindiTitle.trim().length > 200)) {
    return res.status(400).json({ error: 'Enter a test title of 1 to 200 characters.' });
  }
  if (!Number.isInteger(t.durationMinutes) || t.durationMinutes < 1 || t.durationMinutes > 600 || !Number.isFinite(t.totalMarks) || t.totalMarks <= 0 || t.totalMarks > 1000 || !Number.isFinite(t.negativeMarksPerWrong) || t.negativeMarksPerWrong < 0 || t.negativeMarksPerWrong > 10) {
    return res.status(400).json({ error: 'Enter valid test duration, marks, and negative marking.' });
  }
  const allowedTypes = ['Prelims Full Length', 'Prelims Sectional', 'CSAT', 'Mains Test Series'];
  const allowedCategories = ['GS-1', 'GS-2', 'GS-3', 'GS-4', 'CSAT', 'Full Mock'];
  const allowedDifficulties = ['Standard UPSC', 'Challenging', 'Foundation'];
  const publishStatus = t.publishStatus ?? 'draft';
  if (
    !allowedTypes.includes(t.type ?? 'Prelims Sectional') ||
    !allowedCategories.includes(t.category ?? 'GS-1') ||
    !allowedDifficulties.includes(t.difficulty ?? 'Standard UPSC') ||
    !['draft', 'published'].includes(publishStatus)
  ) {
    return res.status(400).json({ error: 'Select a valid test type, paper, and difficulty.' });
  }
  if (publishStatus === 'published' && (!Array.isArray(t.questions) || t.questions.length === 0)) {
    return res.status(400).json({ error: 'Add questions before publishing this test to learners.' });
  }

  const newTest = {
    id: `test-${randomUUID()}`,
    title: t.title.trim(),
    hindiTitle: typeof t.hindiTitle === 'string' && t.hindiTitle.trim() ? t.hindiTitle.trim() : t.title.trim(),
    type: t.type || 'Prelims Sectional',
    totalQuestions: Array.isArray(t.questions) ? t.questions.length : 0,
    durationMinutes: t.durationMinutes,
    totalMarks: t.totalMarks,
    negativeMarksPerWrong: t.negativeMarksPerWrong,
    category: t.category || 'GS-1',
    difficulty: t.difficulty || 'Standard UPSC',
    publishStatus,
    participantsCount: 0,
    attemptsCount: 0,
    questions: Array.isArray(t.questions) ? t.questions : []
  };

  dbState.mockTests.unshift(newTest);
  res.status(201).json(newTest);
});

app.put('/api/mock-tests/:id', requireAdmin, (req, res) => {
  const test = dbState.mockTests.find(item => item.id === req.params.id);
  if (!test) return res.status(404).json({ error: 'Test not found.' });
  const updates = req.body ?? {};
  const title = typeof updates.title === 'string' ? updates.title.trim() : test.title;
  const hindiTitle = typeof updates.hindiTitle === 'string' ? updates.hindiTitle.trim() : test.hindiTitle;
  const durationMinutes = updates.durationMinutes ?? test.durationMinutes;
  const totalMarks = updates.totalMarks ?? test.totalMarks;
  const negativeMarksPerWrong = updates.negativeMarksPerWrong ?? test.negativeMarksPerWrong;
  const allowedTypes = ['Prelims Full Length', 'Prelims Sectional', 'CSAT', 'Mains Test Series'];
  const allowedCategories = ['GS-1', 'GS-2', 'GS-3', 'GS-4', 'CSAT', 'Full Mock'];
  const allowedDifficulties = ['Standard UPSC', 'Challenging', 'Foundation'];
  const publishStatus = updates.publishStatus ?? test.publishStatus ?? 'published';
  if (!title || title.length > 200 || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600 || !Number.isFinite(totalMarks) || totalMarks <= 0 || totalMarks > 1000 || !Number.isFinite(negativeMarksPerWrong) || negativeMarksPerWrong < 0 || negativeMarksPerWrong > 10) {
    return res.status(400).json({ error: 'Enter a title, a positive duration and marks, and valid negative marking.' });
  }
  if (
    !allowedTypes.includes(updates.type ?? test.type) ||
    !allowedCategories.includes(updates.category ?? test.category) ||
    !allowedDifficulties.includes(updates.difficulty ?? test.difficulty) ||
    !['draft', 'published'].includes(publishStatus)
  ) {
    return res.status(400).json({ error: 'Select a valid test type, paper, and difficulty.' });
  }
  if (publishStatus === 'published' && test.questions.length === 0) {
    return res.status(400).json({ error: 'Add questions before publishing this test to learners.' });
  }
  Object.assign(test, {
    title,
    hindiTitle: hindiTitle || title,
    type: updates.type ?? test.type,
    durationMinutes,
    totalMarks,
    negativeMarksPerWrong,
    category: updates.category ?? test.category,
    difficulty: updates.difficulty ?? test.difficulty,
    publishStatus
  });
  res.json(test);
});

app.post('/api/mock-tests/:id/questions/bulk', requireAdmin, (req, res) => {
  const test = dbState.mockTests.find(item => item.id === req.params.id);
  if (!test) return res.status(404).json({ error: 'Test not found.' });
  const incoming = req.body?.questions;
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > 500) {
    return res.status(400).json({ error: 'Upload between 1 and 500 questions at a time.' });
  }
  const validQuestions: Question[] = [];
  const nextId = Math.max(0, ...dbState.questions.map(item => item.id), ...test.questions.map(item => item.id)) + 1;
  const allowedSubjects = ['Polity', 'Economy', 'History', 'Geography', 'Environment', 'Science & Tech', 'Current Affairs', 'CSAT'];
  const allowedPapers = ['GS-1', 'GS-2', 'GS-3', 'CSAT'];
  const allowedDifficulties = ['Easy', 'Moderate', 'Hard', 'Standard UPSC'];
  for (let index = 0; index < incoming.length; index += 1) {
    const question = incoming[index] as Partial<Question>;
    const optionsEn = question.optionsEn;
    const optionsHi = question.optionsHi;
    const correctOptionIndex = question.correctOptionIndex;
    const questionText = typeof question.questionEn === 'string' ? question.questionEn.trim() : '';
    if (
      !questionText ||
      !Array.isArray(optionsEn) ||
      optionsEn.length !== 4 ||
      optionsEn.some(option => typeof option !== 'string' || !option.trim()) ||
      typeof correctOptionIndex !== 'number' ||
      !Number.isInteger(correctOptionIndex) ||
      correctOptionIndex < 0 ||
      correctOptionIndex > 3 ||
      (question.subject !== undefined && !allowedSubjects.includes(question.subject)) ||
      (question.gsPaper !== undefined && !allowedPapers.includes(question.gsPaper)) ||
      (question.difficulty !== undefined && !allowedDifficulties.includes(question.difficulty)) ||
      (question.questionHi !== undefined && typeof question.questionHi !== 'string') ||
      (question.sourceReference !== undefined && typeof question.sourceReference !== 'string') ||
      (question.explanationEn !== undefined && typeof question.explanationEn !== 'string') ||
      (question.explanationHi !== undefined && typeof question.explanationHi !== 'string') ||
      (optionsHi !== undefined && (!Array.isArray(optionsHi) || optionsHi.length !== 4 || optionsHi.some(option => typeof option !== 'string')))
    ) {
      return res.status(400).json({ error: `Question ${index + 1} contains invalid text, options, subject, paper, difficulty, or correct answer.` });
    }
    validQuestions.push({
      id: nextId + index,
      subject: question.subject || 'Polity',
      gsPaper: question.gsPaper || 'GS-2',
      difficulty: question.difficulty || 'Standard UPSC',
      sourceReference: question.sourceReference || 'Imported question',
      questionEn: questionText,
      questionHi: question.questionHi?.trim() || questionText,
      optionsEn: optionsEn.map(option => option.trim()),
      optionsHi: Array.isArray(optionsHi) && optionsHi.length === 4 ? optionsHi : optionsEn,
      correctOptionIndex,
      explanationEn: question.explanationEn || '',
      explanationHi: question.explanationHi || question.explanationEn || ''
    });
  }
  test.questions.push(...validQuestions);
  test.totalQuestions = test.questions.length;
  dbState.questions.push(...validQuestions);
  res.status(201).json({
    success: true,
    importedCount: validQuestions.length,
    totalQuestions: test.totalQuestions
  });
});

app.delete('/api/mock-tests/:id/questions/:questionId', requireAdmin, (req, res) => {
  const test = dbState.mockTests.find(item => item.id === req.params.id);
  if (!test) return res.status(404).json({ error: 'Test not found.' });
  const questionId = Number.parseInt(req.params.questionId, 10);
  const originalCount = test.questions.length;
  test.questions = test.questions.filter(question => question.id !== questionId);
  if (test.questions.length === originalCount) return res.status(404).json({ error: 'Question not found in this test.' });
  test.totalQuestions = test.questions.length;
  res.json({ success: true, totalQuestions: test.totalQuestions });
});

app.delete('/api/mock-tests/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  dbState.mockTests = dbState.mockTests.filter(t => t.id !== id);
  res.json({ success: true });
});

// ----------------------------------------------------------------------------
// MAINS QUESTIONS API
// ----------------------------------------------------------------------------
app.get('/api/mains-questions', (_req, res) => {
  res.json(dbState.mainsQuestions);
});

app.post('/api/mains-questions', requireAdmin, (req, res) => {
  const mq = req.body;
  if (!mq.questionEn) return res.status(400).json({ error: 'Question text is required' });

  const newMains = {
    id: `mains-${Date.now()}`,
    title: mq.title || 'Mains Daily Practice Prompt',
    gsPaper: mq.gsPaper || 'GS-2',
    subject: mq.subject || 'Polity & Governance',
    marks: mq.marks || 10,
    wordLimit: mq.wordLimit || 150,
    yearReference: mq.yearReference || '',
    questionEn: mq.questionEn,
    questionHi: mq.questionHi || mq.questionEn,
    syllabusTheme: mq.syllabusTheme || '',
    topperAnswer: {
      topperName: typeof mq.topperAnswer?.topperName === 'string' ? mq.topperAnswer.topperName : '',
      airRank: typeof mq.topperAnswer?.airRank === 'string' ? mq.topperAnswer.airRank : '',
      answerHtml: typeof mq.topperAnswer?.answerHtml === 'string' ? mq.topperAnswer.answerHtml : '',
      flowchartTip: typeof mq.topperAnswer?.flowchartTip === 'string' ? mq.topperAnswer.flowchartTip : '',
      valueAddition: Array.isArray(mq.topperAnswer?.valueAddition) ? mq.topperAnswer.valueAddition : []
    },
    rubric: mq.rubric || {
      introMarks: 2,
      bodyMarks: 5,
      conclusionMarks: 2,
      presentationMarks: 1
    },
    attachmentUrls: Array.isArray(mq.attachmentUrls) ? mq.attachmentUrls : []
  };

  dbState.mainsQuestions.unshift(newMains);
  res.status(201).json(newMains);
});

app.delete('/api/mains-questions/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  dbState.mainsQuestions = dbState.mainsQuestions.filter(mq => mq.id !== id);
  res.json({ success: true });
});

// ----------------------------------------------------------------------------
// DIGITAL LIBRARY & EDITORIALS API
// ----------------------------------------------------------------------------
app.get('/api/library', (_req, res) => {
  res.json(dbState.libraryItems);
});

app.post('/api/library', requireAdmin, (req, res) => {
  const item = req.body;
  if (!item.title || !item.summary) {
    return res.status(400).json({ error: 'Title and summary are required' });
  }

  const newItem = {
    id: `lib-${Date.now()}`,
    title: item.title,
    type: item.type || 'Daily Editorial',
    source: item.source || 'The Hindu',
    date: item.date || new Date().toISOString().split('T')[0],
    readingTimeMinutes: item.readingTimeMinutes || 7,
    gsPaper: item.gsPaper || 'GS-2',
    subject: item.subject || 'Current Affairs',
    summary: item.summary,
    prelimsPointers: Array.isArray(item.prelimsPointers) ? item.prelimsPointers : [
      'Constitutional significance and statutory bodies involved.',
      'Key articles and recent international summits mentioned.'
    ],
    mainsAngle: item.mainsAngle || 'Critically analyze the policy implications for cooperative federalism.',
    fullContent: item.fullContent || item.summary,
    pdfUrl: item.pdfUrl || undefined,
    attachmentUrls: Array.isArray(item.attachmentUrls) ? item.attachmentUrls : [],
    isBookmarked: false,
    tags: Array.isArray(item.tags) ? item.tags : ['UPSC', item.subject || 'Editorial']
  };

  dbState.libraryItems.unshift(newItem);
  res.status(201).json(newItem);
});

app.delete('/api/library/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  dbState.libraryItems = dbState.libraryItems.filter(item => item.id !== id);
  res.json({ success: true });
});

// ----------------------------------------------------------------------------
// FORUM API
// ----------------------------------------------------------------------------
app.get('/api/forum', (_req, res) => {
  res.json(dbState.forumPosts);
});

app.post('/api/forum', (req, res) => {
  const { title, category, content, tags } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const newPost = {
    id: `post-${Date.now()}`,
    title,
    category: category || 'GS-2',
    content,
    tags: tags || ['UPSC'],
    author: {
      name: req.authUser?.name || 'Learner',
      role: 'Aspirant' as const,
      avatarBg: 'bg-amber-600'
    },
    upvotes: 1,
    hasUpvoted: true,
    repliesCount: 0,
    timestamp: 'Just now',
    isFacultyEndorsed: false,
    replies: []
  };

  dbState.forumPosts.unshift(newPost);
  res.status(201).json(newPost);
});

app.post('/api/forum/:id/upvote', (req, res) => {
  const { id } = req.params;
  const post = dbState.forumPosts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  post.hasUpvoted = !post.hasUpvoted;
  post.upvotes += post.hasUpvoted ? 1 : -1;

  res.json({ success: true, upvotes: post.upvotes, hasUpvoted: post.hasUpvoted });
});

app.post('/api/forum/:id/reply', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Reply text is required.' });
  }
  const post = dbState.forumPosts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const reply = {
    id: `reply-${Date.now()}`,
    author: {
      name: req.authUser?.name || 'Learner',
      role: 'Aspirant',
      avatarBg: 'bg-amber-600'
    },
    content: content.trim(),
    timestamp: 'Just now',
    upvotes: 0,
    isVerified: false
  };

  if (!post.replies) post.replies = [];
  post.replies.push(reply);
  post.repliesCount = post.replies.length;

  res.status(201).json(reply);
});

// ----------------------------------------------------------------------------
// SYLLABUS API
// ----------------------------------------------------------------------------
function getUserSyllabus(userId: string): SyllabusModule[] {
  if (!dbState.userSyllabus[userId]) {
    dbState.userSyllabus[userId] = structuredClone(dbState.syllabusModules).map(module => ({
      ...module,
      topics: module.topics.map(topic => ({ ...topic, completed: false, revisionCount: 0 }))
    }));
  }
  return dbState.userSyllabus[userId];
}

app.get('/api/syllabus', (req, res) => {
  res.json(getUserSyllabus(req.authUser!.id));
});

app.patch('/api/syllabus/:moduleId/topics/:topicId', (req, res) => {
  const { moduleId, topicId } = req.params;
  const { completed } = req.body;

  if (typeof completed !== 'boolean') return res.status(400).json({ error: 'Completion status must be true or false.' });
  const modules = getUserSyllabus(req.authUser!.id);
  const mod = modules.find(m => m.id === moduleId);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  const topic = mod.topics.find(t => t.id === topicId);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });

  topic.completed = completed;
  res.json(topic);
});

app.post('/api/syllabus/:moduleId/topics/:topicId/revision', (req, res) => {
  const { moduleId, topicId } = req.params;

  const modules = getUserSyllabus(req.authUser!.id);
  const mod = modules.find(m => m.id === moduleId);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  const topic = mod.topics.find(t => t.id === topicId);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });

  topic.revisionCount += 1;
  res.json(topic);
});

// ----------------------------------------------------------------------------
// PROFILE & ATTEMPTS API
// ----------------------------------------------------------------------------
app.get('/api/profile', (_req, res) => {
  const userId = _req.authUser!.id;
  const userAttempts = dbState.attempts.filter(attempt => attempt.userId === userId);
  const uniqueActivityDates = [...new Set(userAttempts.map(attempt => new Date(attempt.completedAt).toISOString().slice(0, 10)))].sort().reverse();
  let streakDays = 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  if (uniqueActivityDates[0] === today || uniqueActivityDates[0] === yesterday) {
    let expectedDate = uniqueActivityDates[0];
    for (const activityDate of uniqueActivityDates) {
      if (activityDate !== expectedDate) break;
      streakDays += 1;
      const previousDate = new Date(`${expectedDate}T00:00:00.000Z`);
      previousDate.setUTCDate(previousDate.getUTCDate() - 1);
      expectedDate = previousDate.toISOString().slice(0, 10);
    }
  }
  const subjectTotals = new Map<string, { correct: number; total: number }>();
  for (const attempt of userAttempts) {
    for (const result of attempt.subjectResults || []) {
      const current = subjectTotals.get(result.subject) || { correct: 0, total: 0 };
      current.correct += result.correct;
      current.total += result.total;
      subjectTotals.set(result.subject, current);
    }
  }
  const answers = userAttempts.reduce((total, attempt) => total + attempt.correct + attempt.incorrect, 0);
  const correctAnswers = userAttempts.reduce((total, attempt) => total + attempt.correct, 0);
  const totalDurationSeconds = userAttempts.reduce((total, attempt) => total + attempt.durationSeconds, 0);
  const averageScore = userAttempts.length
    ? Number((userAttempts.reduce((total, attempt) => total + attempt.score, 0) / userAttempts.length).toFixed(2))
    : null;
  const latestAttempt = userAttempts.at(-1);
  const latestTest = latestAttempt
    ? dbState.mockTests.find(test => test.id === latestAttempt.testId)
    : undefined;
  res.json({
    name: _req.authUser!.name,
    email: _req.authUser!.email,
    totalTestsAttempted: userAttempts.length,
    avgPrelimsScore: averageScore,
    totalQuestionsAnswered: answers,
    correctAnswers,
    totalTestTimeSeconds: totalDurationSeconds,
    streakDays,
    latestAttempt: latestAttempt && latestTest ? {
      score: latestAttempt.score,
      totalMarks: latestTest.totalMarks,
      testTitle: latestTest.title,
      completedAt: latestAttempt.completedAt
    } : null,
    subjectMastery: [...subjectTotals.entries()].map(([subject, stats]) => ({
      subject,
      accuracy: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0,
      totalQuestions: stats.total,
      status: stats.total ? (stats.correct / stats.total >= 0.75 ? 'Strong' : stats.correct / stats.total >= 0.65 ? 'Moderate' : 'Needs Revision') : 'No data'
    }))
  });
});

app.post('/api/submit-attempt', (req, res) => {
  const { testId, answers, durationSeconds } = req.body ?? {};
  const test = dbState.mockTests.find(item => item.id === testId);
  if (typeof testId !== 'string' || !test || !Array.isArray(answers) || answers.length !== test.questions.length ||
      !Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return res.status(400).json({ error: 'A valid completed test attempt is required.' });
  }

  const submittedAnswers = new Map<number, number | null>();
  for (const answer of answers) {
    if (!answer || !Number.isInteger(answer.questionId) ||
        !(answer.selectedOption === null || (Number.isInteger(answer.selectedOption) && answer.selectedOption >= 0 && answer.selectedOption <= 3)) ||
        submittedAnswers.has(answer.questionId)) {
      return res.status(400).json({ error: 'The submitted answers are invalid.' });
    }
    submittedAnswers.set(answer.questionId, answer.selectedOption);
  }
  if (test.questions.some(question => !submittedAnswers.has(question.id))) {
    return res.status(400).json({ error: 'The submitted answers do not match the selected test.' });
  }

  let correct = 0;
  let incorrect = 0;
  const subjectTotals = new Map<string, { correct: number; total: number }>();
  for (const question of test.questions) {
    const selectedOption = submittedAnswers.get(question.id);
    if (selectedOption === null) continue;
    const stats = subjectTotals.get(question.subject) || { correct: 0, total: 0 };
    stats.total += 1;
    if (selectedOption === question.correctOptionIndex) {
      correct += 1;
      stats.correct += 1;
    } else {
      incorrect += 1;
    }
    subjectTotals.set(question.subject, stats);
  }
  const unanswered = test.questions.length - correct - incorrect;
  const marksPerQuestion = test.questions.length ? test.totalMarks / test.questions.length : 0;
  const score = Number((correct * marksPerQuestion - incorrect * test.negativeMarksPerWrong).toFixed(2));
  const attempt = {
    id: dbState.attempts.length + 1,
    userId: req.authUser!.id,
    testId,
    score,
    correct,
    incorrect,
    unanswered,
    totalQuestions: test.questions.length,
    durationSeconds,
    completedAt: new Date().toISOString(),
    subjectResults: [...subjectTotals.entries()].map(([subject, stats]) => ({ subject, ...stats }))
  };
  dbState.attempts.push(attempt);
  res.json({ success: true, attempt: { id: attempt.id, completedAt: attempt.completedAt, score: attempt.score, correct, incorrect, unanswered } });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'This service is unavailable. Restart the app server and refresh the page.' });
});

// ----------------------------------------------------------------------------
// VITE SPA MIDDLEWARE / STATIC SERVE
// ----------------------------------------------------------------------------
async function startServer() {
  try {
    const storedUrl = decryptDatabaseUrl();
    const startupUrl = storedUrl ?? dbUrl;
    if (startupUrl) await switchDatabase(startupUrl, storedUrl !== null);
  } catch (error) {
    console.error('[DB] Startup connection failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      throw new Error('Production build is missing. Run `npm run build` before starting the server.');
    }
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Failed to start the application server:', error);
  process.exitCode = 1;
});
