-- ============================================================================
-- SANKALP IAS - UPSC CSE PREPARATION PLATFORM
-- PRODUCTION DATABASE SCHEMA (PostgreSQL / Relational Compatible)
-- ============================================================================

-- Extensions (if using PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 0. AUTHENTICATED LEARNER ACCOUNTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(320) UNIQUE NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'learner' CHECK (role = 'learner'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Application content snapshot used by the server's durable content store.
CREATE TABLE IF NOT EXISTS app_content_state (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 1. ASPIRANTS / USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aspirants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    aspirant_id VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    medium VARCHAR(20) DEFAULT 'English',
    optional_subject VARCHAR(255) DEFAULT 'PSIR',
    target_year VARCHAR(10) DEFAULT '2026',
    target_prelims_date DATE DEFAULT '2026-05-24',
    streak_days INTEGER DEFAULT 0,
    total_tests_attempted INTEGER DEFAULT 0,
    avg_prelims_score NUMERIC(5,2) DEFAULT 0.00,
    estimated_rank_percentile NUMERIC(5,2) DEFAULT 0.00,
    hours_studied_this_week NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subject Mastery for Aspirants
CREATE TABLE IF NOT EXISTS aspirant_subject_mastery (
    id SERIAL PRIMARY KEY,
    aspirant_id VARCHAR(64) REFERENCES aspirants(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    accuracy INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Needs Revision',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. QUESTIONS REPOSITORY (PRELIMS BILINGUAL MCQS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(100) NOT NULL,
    gs_paper VARCHAR(20) NOT NULL,
    difficulty VARCHAR(30) DEFAULT 'Moderate',
    source_reference TEXT,
    question_en TEXT NOT NULL,
    question_hi TEXT NOT NULL,
    options_en JSONB NOT NULL,
    options_hi JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    explanation_en TEXT NOT NULL,
    explanation_hi TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_gs_paper ON questions(gs_paper);

-- ----------------------------------------------------------------------------
-- 3. MOCK TESTS (PRELIMS & CSAT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mock_tests (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    hindi_title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Prelims Full Length', 'Prelims Sectional', 'CSAT'
    total_questions INTEGER NOT NULL DEFAULT 100,
    duration_minutes INTEGER NOT NULL DEFAULT 120,
    total_marks NUMERIC(5,2) NOT NULL DEFAULT 200.00,
    negative_marks_per_wrong NUMERIC(4,2) NOT NULL DEFAULT 0.66,
    category VARCHAR(50) NOT NULL, -- 'Full Mock', 'GS-1', 'GS-2', 'GS-3', 'GS-4', 'CSAT'
    difficulty VARCHAR(50) DEFAULT 'Standard UPSC',
    enrolled_count INTEGER DEFAULT 0,
    attempts_count INTEGER DEFAULT 0,
    avg_score NUMERIC(5,2) DEFAULT 0.00,
    topper_score NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Association Table: Mock Test to Questions
CREATE TABLE IF NOT EXISTS mock_test_questions (
    id SERIAL PRIMARY KEY,
    mock_test_id VARCHAR(64) REFERENCES mock_tests(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    UNIQUE(mock_test_id, question_id)
);

-- ----------------------------------------------------------------------------
-- 4. MAINS DAILY ANSWER WRITING REPOSITORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mains_questions (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    gs_paper VARCHAR(20) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    marks INTEGER NOT NULL DEFAULT 10,
    word_limit INTEGER NOT NULL DEFAULT 150,
    year_reference VARCHAR(100),
    question_en TEXT NOT NULL,
    question_hi TEXT NOT NULL,
    syllabus_theme TEXT,
    topper_name VARCHAR(150),
    topper_air_rank VARCHAR(50),
    topper_answer_html TEXT,
    flowchart_tip TEXT,
    value_addition JSONB,
    rubric JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mains_gs_paper ON mains_questions(gs_paper);

-- ----------------------------------------------------------------------------
-- 5. LIVE CLASSES & STREAMING SCHEDULE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS live_classes (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    hindi_title VARCHAR(255) NOT NULL,
    faculty_name VARCHAR(150) NOT NULL,
    faculty_title VARCHAR(255),
    subject VARCHAR(100) NOT NULL,
    gs_paper VARCHAR(20) NOT NULL,
    batch VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'upcoming', -- 'live', 'upcoming', 'completed'
    start_time VARCHAR(100) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    attendees_count INTEGER DEFAULT 0,
    cover_image TEXT,
    lecture_notes_pdf VARCHAR(255),
    description TEXT,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Real-time Class Chat & Doubt Log
CREATE TABLE IF NOT EXISTS live_class_messages (
    id VARCHAR(64) PRIMARY KEY,
    live_class_id VARCHAR(64) REFERENCES live_classes(id) ON DELETE CASCADE,
    sender VARCHAR(150) NOT NULL,
    avatar VARCHAR(10),
    text TEXT NOT NULL,
    message_time VARCHAR(50),
    is_faculty BOOLEAN DEFAULT FALSE,
    is_doubt BOOLEAN DEFAULT FALSE,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_class_messages ON live_class_messages(live_class_id);

-- ----------------------------------------------------------------------------
-- 6. DIGITAL LIBRARY & EDITORIAL DOSSIERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS library_items (
    id VARCHAR(64) PRIMARY KEY,
    title TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Daily Editorial', 'Monthly Magazine', 'NCERT Summary', 'Standard Book Note', 'PIB Digest'
    source VARCHAR(100) NOT NULL,
    date VARCHAR(50) NOT NULL,
    reading_time_minutes INTEGER DEFAULT 10,
    gs_paper VARCHAR(20) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    summary TEXT NOT NULL,
    prelims_pointers JSONB NOT NULL,
    mains_angle TEXT,
    full_content TEXT NOT NULL,
    pdf_url TEXT,
    is_bookmarked BOOLEAN DEFAULT FALSE,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_library_gs_paper ON library_items(gs_paper);
CREATE INDEX IF NOT EXISTS idx_library_type ON library_items(type);

-- ----------------------------------------------------------------------------
-- 7. DISCUSSION FORUM (MANTHAN PEER NETWORK)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_posts (
    id VARCHAR(64) PRIMARY KEY,
    title TEXT NOT NULL,
    author_name VARCHAR(150) NOT NULL,
    author_role VARCHAR(50) DEFAULT 'Aspirant',
    author_avatar_bg VARCHAR(50) DEFAULT 'bg-slate-700',
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    timestamp VARCHAR(50),
    is_faculty_endorsed BOOLEAN DEFAULT FALSE,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forum_replies (
    id VARCHAR(64) PRIMARY KEY,
    post_id VARCHAR(64) REFERENCES forum_posts(id) ON DELETE CASCADE,
    author_name VARCHAR(150) NOT NULL,
    author_role VARCHAR(50) DEFAULT 'Aspirant',
    author_avatar_bg VARCHAR(50) DEFAULT 'bg-slate-700',
    content TEXT NOT NULL,
    timestamp VARCHAR(50),
    upvotes INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forum_category ON forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_replies ON forum_replies(post_id);

-- ----------------------------------------------------------------------------
-- 8. SYLLABUS TRACKING & REVISION MODULES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS syllabus_modules (
    id VARCHAR(20) PRIMARY KEY,
    gs_paper VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    display_order INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS syllabus_topics (
    id VARCHAR(64) PRIMARY KEY,
    module_id VARCHAR(20) REFERENCES syllabus_modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    revision_count INTEGER DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'Medium',
    display_order INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_topics_module ON syllabus_topics(module_id);

-- ----------------------------------------------------------------------------
-- 9. ASPIRANT TEST ATTEMPTS & SCORECARDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aspirant_test_attempts (
    id SERIAL PRIMARY KEY,
    aspirant_id VARCHAR(64) REFERENCES aspirants(id) ON DELETE CASCADE,
    test_id VARCHAR(64) REFERENCES mock_tests(id) ON DELETE CASCADE,
    raw_positive NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    raw_negative NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    net_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    correct_count INTEGER NOT NULL DEFAULT 0,
    incorrect_count INTEGER NOT NULL DEFAULT 0,
    unattempted_count INTEGER NOT NULL DEFAULT 0,
    accuracy_percentage NUMERIC(5,2) DEFAULT 0.00,
    time_taken_seconds INTEGER DEFAULT 0,
    user_responses JSONB,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- OPTIONAL SEED DATA (Can be executed to populate the database initially)
-- ============================================================================

-- Aspirant Default Profile
INSERT INTO aspirants (
    id, name, aspirant_id, email, medium, optional_subject, target_year, streak_days, total_tests_attempted, avg_prelims_score, estimated_rank_percentile, hours_studied_this_week
) VALUES (
    'user-aarav-01', 'Aarav Singhania', 'UPSC-2026-9842', 'aarav.singhania@upscprep.org', 'English', 'Political Science & International Relations (PSIR)', '2026', 24, 19, 98.40, 94.60, 42.50
) ON CONFLICT (id) DO NOTHING;

INSERT INTO aspirant_subject_mastery (aspirant_id, subject, accuracy, total_questions, status) VALUES
('user-aarav-01', 'Polity & Governance', 82, 340, 'Strong'),
('user-aarav-01', 'Environment & Ecology', 78, 220, 'Strong'),
('user-aarav-01', 'Modern History', 72, 280, 'Moderate'),
('user-aarav-01', 'Indian Economy', 64, 310, 'Needs Revision'),
('user-aarav-01', 'Geography', 70, 190, 'Moderate'),
('user-aarav-01', 'Science & Tech', 58, 150, 'Needs Revision'),
('user-aarav-01', 'CSAT (Paper II)', 76, 180, 'Comfortable')
ON CONFLICT DO NOTHING;

-- Syllabus Modules
INSERT INTO syllabus_modules (id, gs_paper, title, display_order) VALUES
('gs1', 'GS-1', 'GS Paper I: Indian Heritage, Culture, History & Geography', 1),
('gs2', 'GS-2', 'GS Paper II: Governance, Constitution, Polity & International Relations', 2),
('gs3', 'GS-3', 'GS Paper III: Technology, Economic Development, Biodiversity & Security', 3),
('gs4', 'GS-4', 'GS Paper IV: Ethics, Integrity and Aptitude', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO syllabus_topics (id, module_id, name, completed, revision_count, priority, display_order) VALUES
('t1', 'gs1', 'Art & Culture: Architecture, Sculpture & Temples (Nagara/Dravida)', true, 3, 'High', 1),
('t2', 'gs1', 'Modern Indian History: 1857 Revolt to Indian Independence 1947', true, 4, 'High', 2),
('t3', 'gs1', 'Post-Independence Consolidation & Reorganization', false, 1, 'Medium', 3),
('t4', 'gs1', 'Physical Geography: Geomorphology, Oceanography, Climatology', true, 2, 'High', 4),
('t5', 'gs1', 'Indian Society: Diversity, Globalization, Secularism & Caste', false, 0, 'Medium', 5),
('t6', 'gs2', 'Constitutional Framework: Preamble, Fundamental Rights & DPSP', true, 5, 'High', 6),
('t7', 'gs2', 'Parliament & State Legislatures: Functioning & Parliamentary Committees', true, 3, 'High', 7),
('t8', 'gs2', 'Judiciary: Judicial Review, Collegium System & Judicial Activism', true, 4, 'High', 8),
('t9', 'gs2', 'Statutory & Quasi-Judicial Bodies (CBI, CVC, CAG, ECI, NHRC)', false, 1, 'Medium', 9),
('t10', 'gs2', 'International Relations: India & Neighbourhood, Quad, BRICS, IMEC', true, 2, 'High', 10),
('t11', 'gs3', 'Indian Economy: Macroeconomics, Inflation, Banking & Fiscal Policy', true, 3, 'High', 11),
('t12', 'gs3', 'Agriculture: MSP, Food Processing, Subsidies & Supply Chains', false, 1, 'High', 12),
('t13', 'gs3', 'Environment & Climate Change: Paris Agreement, Ramsar Sites, COP30', true, 3, 'High', 13),
('t14', 'gs3', 'Science & Tech: AI, Space Exploration (Gaganyaan, Aditya-L1), Biotech', false, 1, 'Medium', 14),
('t15', 'gs3', 'Internal Security: Border Management, Cyber Threat & Left-Wing Extremism', true, 2, 'High', 15),
('t16', 'gs4', 'Ethics in Public Administration: Nolan Committee Principles', true, 3, 'High', 16),
('t17', 'gs4', 'Attitude, Emotional Intelligence & Foundational Values for Civil Services', true, 2, 'High', 17),
('t18', 'gs4', 'Moral Thinkers & Philosophers: Western & Indian Thinkers', false, 1, 'Medium', 18),
('t19', 'gs4', 'Case Studies: Resolution Matrices & Dilemmas in Bureaucracy', true, 3, 'High', 19)
ON CONFLICT (id) DO NOTHING;
