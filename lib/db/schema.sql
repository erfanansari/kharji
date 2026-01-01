-- Expenses table schema
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price_toman REAL NOT NULL,
  price_usd REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- Tags table for reusable tags
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for many-to-many relationship between expenses and tags
CREATE TABLE IF NOT EXISTS expense_tags (
  expense_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (expense_id, tag_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Index for faster tag lookups
CREATE INDEX IF NOT EXISTS idx_expense_tags_expense ON expense_tags(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_tags_tag ON expense_tags(tag_id);
