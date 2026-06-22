PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE languages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE problems (
  id TEXT PRIMARY KEY,
  language_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'code')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  prompt TEXT NOT NULL,
  starter_code TEXT,
  options TEXT,
  correct_answer TEXT,
  test_cases TEXT,
  has_visual_preview INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (language_id) REFERENCES languages(id)
);
CREATE INDEX idx_problems_language ON problems(language_id);
CREATE INDEX idx_problems_difficulty ON problems(language_id, difficulty);

CREATE TABLE custom_language_banks (
  id TEXT PRIMARY KEY,
  language_id TEXT NOT NULL,
  batch_number INTEGER NOT NULL,
  questions TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (language_id) REFERENCES languages(id),
  UNIQUE (language_id, batch_number)
);
CREATE INDEX idx_banks_language ON custom_language_banks(language_id, batch_number);

CREATE TABLE user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  language_id TEXT NOT NULL,
  solved_count INTEGER NOT NULL DEFAULT 0,
  attempted_count INTEGER NOT NULL DEFAULT 0,
  mastery_score REAL NOT NULL DEFAULT 0,
  custom_batch_position INTEGER NOT NULL DEFAULT 0,
  last_active TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (language_id) REFERENCES languages(id),
  UNIQUE (user_id, language_id)
);
CREATE INDEX idx_progress_user ON user_progress(user_id);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  problem_id TEXT,
  language_id TEXT NOT NULL,
  custom_question_ref TEXT,
  code TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0,
  graded_by TEXT NOT NULL CHECK (graded_by IN ('test_case', 'gemini', 'mcq_exact')),
  feedback TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (problem_id) REFERENCES problems(id),
  FOREIGN KEY (language_id) REFERENCES languages(id)
);
CREATE INDEX idx_submissions_user ON submissions(user_id, language_id);
