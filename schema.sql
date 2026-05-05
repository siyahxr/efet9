CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    banned INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS profiles (
    username TEXT PRIMARY KEY,
    data TEXT NOT NULL
);
