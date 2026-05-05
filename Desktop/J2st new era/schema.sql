CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    banned INTEGER DEFAULT 0,
    last_username_change TEXT -- ISO Date
);

CREATE TABLE IF NOT EXISTS profiles (
    username TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    views INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS view_logs (
    username TEXT,
    ip TEXT,
    timestamp INTEGER,
    PRIMARY KEY (username, ip)
);
