-- GameRex Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Events table (pre-populated, no titles for confidentiality)
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('oral', 'poster', 'plenaria')),
  day INT NOT NULL CHECK (day BETWEEN 1 AND 3),
  room TEXT,
  time_slot TEXT,
  track_code TEXT,
  subtrilha TEXT
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event checkins
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_id TEXT NOT NULL REFERENCES events(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Friend checkins (mutual scans)
CREATE TABLE friend_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  friend_id UUID NOT NULL REFERENCES users(id),
  day INT NOT NULL CHECK (day BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id, day)
);

-- Indexes
CREATE INDEX idx_checkins_user ON checkins(user_id);
CREATE INDEX idx_checkins_event ON checkins(event_id);
CREATE INDEX idx_friend_checkins_user ON friend_checkins(user_id);
CREATE INDEX idx_friend_checkins_friend ON friend_checkins(friend_id);

-- RPC: Register or login
CREATE OR REPLACE FUNCTION register_or_login(p_name TEXT, p_email TEXT)
RETURNS TABLE(id UUID, name TEXT, email TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users WHERE users.email = lower(trim(p_email));
  IF FOUND THEN
    RETURN QUERY SELECT v_user.id, v_user.name, v_user.email, v_user.created_at;
  ELSE
    INSERT INTO users (name, email)
    VALUES (trim(p_name), lower(trim(p_email)))
    RETURNING * INTO v_user;
    RETURN QUERY SELECT v_user.id, v_user.name, v_user.email, v_user.created_at;
  END IF;
END;
$$;

-- RPC: Scan friend (creates mutual checkins)
CREATE OR REPLACE FUNCTION scan_friend(p_scanner_id UUID, p_scanned_id UUID, p_day INT)
RETURNS TABLE(friend_name TEXT, already_scanned BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_friend_name TEXT;
  v_existing INT;
BEGIN
  -- Prevent self-scan
  IF p_scanner_id = p_scanned_id THEN
    RAISE EXCEPTION 'Cannot scan yourself';
  END IF;

  -- Get friend name
  SELECT u.name INTO v_friend_name FROM users u WHERE u.id = p_scanned_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if already scanned today
  SELECT 1 INTO v_existing
  FROM friend_checkins
  WHERE user_id = p_scanner_id AND friend_id = p_scanned_id AND day = p_day;

  IF FOUND THEN
    RETURN QUERY SELECT v_friend_name, true;
    RETURN;
  END IF;

  -- Insert mutual checkins
  INSERT INTO friend_checkins (user_id, friend_id, day)
  VALUES (p_scanner_id, p_scanned_id, p_day)
  ON CONFLICT DO NOTHING;

  INSERT INTO friend_checkins (user_id, friend_id, day)
  VALUES (p_scanned_id, p_scanner_id, p_day)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_friend_name, false;
END;
$$;

-- RLS Policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_checkins ENABLE ROW LEVEL SECURITY;

-- Events: anyone can read
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT USING (true);

-- Users: anyone can read (for friend names)
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT USING (true);

-- Checkins: anyone can read, anyone can insert
CREATE POLICY "Checkins are viewable by everyone"
  ON checkins FOR SELECT USING (true);

CREATE POLICY "Anyone can create checkins"
  ON checkins FOR INSERT WITH CHECK (true);

-- Friend checkins: anyone can read
CREATE POLICY "Friend checkins are viewable by everyone"
  ON friend_checkins FOR SELECT USING (true);
