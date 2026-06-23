PRAGMA foreign_keys = ON;

-- ============================================================
-- Built-in Languages Seeding
-- ============================================================
INSERT OR IGNORE INTO languages (id, name, is_builtin) VALUES
  ('lang-html-css',   'HTML & CSS',  1),
  ('lang-javascript', 'JavaScript',  1),
  ('lang-python',     'Python',      1),
  ('lang-cpp',        'C++',         1),
  ('lang-java',       'Java',        1),
  ('lang-rust',       'Rust',        1),
  ('lang-golang',     'Golang',      1),
  ('lang-jumbolang',  'JumboLang',   1);
