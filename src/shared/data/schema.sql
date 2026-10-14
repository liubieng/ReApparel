-- ====================================================================
-- ReApparel Database Schema Migration
-- Responsible Consumption and Wardrobe Recovery
-- Target: PostgreSQL / Supabase
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. Drop existing tables if needed (Clean teardown)
DROP TABLE IF EXISTS donation_flag CASCADE;
DROP TABLE IF EXISTS donation_opportunity CASCADE;
DROP TABLE IF EXISTS borrow CASCADE;
DROP TABLE IF EXISTS friend_request CASCADE;
DROP TABLE IF EXISTS daily_log_item CASCADE;
DROP TABLE IF EXISTS daily_clothing_log CASCADE;
DROP TABLE IF EXISTS item_tag CASCADE;
DROP TABLE IF EXISTS tag CASCADE;
DROP TABLE IF EXISTS clothing_item CASCADE;
DROP TABLE IF EXISTS bsas_assessment CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- --------------------------------------------------------------------
-- 1. USER Table
-- --------------------------------------------------------------------
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    friend_code TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT 'Password123!',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 2. BSAS_ASSESSMENT Table (Bergen Shopping Addiction Scale)
-- --------------------------------------------------------------------
CREATE TABLE bsas_assessment (
    assessment_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 7),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Indicative', 'Non-Indicative')),
    breakdown JSONB,
    taken_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bsas_user_taken ON bsas_assessment(user_id, taken_at DESC);

-- --------------------------------------------------------------------
-- 3. CLOTHING_ITEM Table
-- --------------------------------------------------------------------
CREATE TABLE clothing_item (
    item_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Garment',
    image_url TEXT NOT NULL,
    category TEXT,
    color TEXT,
    type_tag TEXT,
    color_tag TEXT,
    addition_type TEXT DEFAULT 'Old',
    cost NUMERIC(10,2) DEFAULT 0,
    wear_count INT DEFAULT 0 CHECK (wear_count >= 0),
    is_borrowed BOOLEAN DEFAULT FALSE,
    borrower_id UUID,
    date_added TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clothing_user ON clothing_item(user_id);

-- --------------------------------------------------------------------
-- 4. TAG Catalog Table
-- --------------------------------------------------------------------
CREATE TABLE tag (
    tag_id SERIAL PRIMARY KEY,
    tag_name TEXT NOT NULL,
    tag_type TEXT NOT NULL CHECK (tag_type IN ('Category', 'Color')),
    UNIQUE(tag_name, tag_type)
);

-- --------------------------------------------------------------------
-- 5. ITEM_TAG Mapping Table
-- --------------------------------------------------------------------
CREATE TABLE item_tag (
    item_tag_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES clothing_item(item_id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tag(tag_id) ON DELETE CASCADE,
    UNIQUE(item_id, tag_id)
);

CREATE INDEX idx_item_tag_item ON item_tag(item_id);
CREATE INDEX idx_item_tag_tag ON item_tag(tag_id);

-- --------------------------------------------------------------------
-- 6. DAILY_CLOTHING_LOG Table
-- --------------------------------------------------------------------
CREATE TABLE daily_clothing_log (
    log_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    is_finalized BOOLEAN DEFAULT FALSE,
    finalized_at TIMESTAMPTZ NULL,
    UNIQUE (user_id, log_date)
);

CREATE INDEX idx_daily_log_user_date ON daily_clothing_log(user_id, log_date);

-- --------------------------------------------------------------------
-- 7. DAILY_LOG_ITEM Mapping Table
-- --------------------------------------------------------------------
CREATE TABLE daily_log_item (
    daily_log_item_id SERIAL PRIMARY KEY,
    log_id INT NOT NULL REFERENCES daily_clothing_log(log_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES clothing_item(item_id) ON DELETE CASCADE,
    UNIQUE (log_id, item_id)
);

CREATE INDEX idx_daily_log_item_log ON daily_log_item(log_id);

-- --------------------------------------------------------------------
-- 8. FRIEND_REQUEST Table
-- --------------------------------------------------------------------
CREATE TABLE friend_request (
    request_id SERIAL PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (sender_id, receiver_id),
    CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_friend_req_receiver ON friend_request(receiver_id, status);

-- --------------------------------------------------------------------
-- 9. BORROW Table (Community Wardrobe Sharing)
-- --------------------------------------------------------------------
CREATE TABLE borrow (
    borrow_id SERIAL PRIMARY KEY,
    borrower_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES clothing_item(item_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Returned')) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    CHECK (end_date >= start_date)
);

CREATE INDEX idx_borrow_borrower ON borrow(borrower_id);
CREATE INDEX idx_borrow_item ON borrow(item_id);

-- --------------------------------------------------------------------
-- 10. DONATION_OPPORTUNITY Table
-- --------------------------------------------------------------------
CREATE TABLE donation_opportunity (
    donation_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL,
    hours TEXT DEFAULT 'Mon-Sun 8:00 AM - 8:00 PM',
    accepted_types TEXT DEFAULT 'Clothing, Shoes, Linens, Bags',
    city TEXT,
    province TEXT,
    barangay TEXT,
    organizer TEXT,
    post_url TEXT,
    post_platform TEXT DEFAULT 'facebook',
    post_title TEXT,
    post_snippet TEXT,
    is_live_drive BOOLEAN DEFAULT TRUE,
    created_by UUID,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 11. DONATION_FLAG Table (Community Verification)
-- --------------------------------------------------------------------
CREATE TABLE donation_flag (
    flag_id SERIAL PRIMARY KEY,
    donation_id INT NOT NULL REFERENCES donation_opportunity(donation_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('Inactive', 'Inaccurate')),
    notes TEXT,
    flagged_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_donation_flag_id ON donation_flag(donation_id);

-- --------------------------------------------------------------------
-- Stored Procedure: Finalize Daily Logs & Increment Wear Counts
-- Can be triggered nightly via pg_cron or edge worker
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION finalize_daily_clothing_logs()
RETURNS INT AS $$
DECLARE
    finalized_count INT := 0;
    r RECORD;
BEGIN
    FOR r IN
        SELECT log_id FROM daily_clothing_log
        WHERE log_date < CURRENT_DATE AND is_finalized = FALSE
    LOOP
        -- Increment wear counts for all items attached to this log
        UPDATE clothing_item ci
        SET wear_count = ci.wear_count + 1
        FROM daily_log_item dli
        WHERE dli.log_id = r.log_id AND ci.item_id = dli.item_id;

        -- Mark log as finalized
        UPDATE daily_clothing_log
        SET is_finalized = TRUE, finalized_at = now()
        WHERE log_id = r.log_id;

        finalized_count := finalized_count + 1;
    END LOOP;

    RETURN finalized_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Revoke public execution of maintenance cron job from client roles
REVOKE EXECUTE ON FUNCTION finalize_daily_clothing_logs() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION finalize_daily_clothing_logs() TO postgres, service_role;

-- Schedule midnight run via pg_cron (runs at 00:01 daily)
-- SELECT cron.schedule('midnight_finalization_job', '1 0 * * *', 'SELECT finalize_daily_clothing_logs()');

-- --------------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- --------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bsas_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_clothing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_opportunity ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_flag ENABLE ROW LEVEL SECURITY;

-- Tags & Tables accessible for multi-user prototype sync
ALTER TABLE clothing_item ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access clothing_item" ON clothing_item;
DROP POLICY IF EXISTS "Full access clothing_item" ON clothing_item;
CREATE POLICY "Full access clothing_item" ON clothing_item FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE item_tag ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access item_tag" ON item_tag;
DROP POLICY IF EXISTS "Full access item_tag" ON item_tag;
CREATE POLICY "Full access item_tag" ON item_tag FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE bsas_assessment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access bsas_assessment" ON bsas_assessment;
DROP POLICY IF EXISTS "Full access bsas_assessment" ON bsas_assessment;
CREATE POLICY "Full access bsas_assessment" ON bsas_assessment FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE daily_clothing_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access daily_clothing_log" ON daily_clothing_log;
DROP POLICY IF EXISTS "Full access daily_clothing_log" ON daily_clothing_log;
CREATE POLICY "Full access daily_clothing_log" ON daily_clothing_log FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE daily_log_item ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access daily_log_item" ON daily_log_item;
DROP POLICY IF EXISTS "Full access daily_log_item" ON daily_log_item;
CREATE POLICY "Full access daily_log_item" ON daily_log_item FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE friend_request ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access friend_request" ON friend_request;
DROP POLICY IF EXISTS "Full access friend_request" ON friend_request;
CREATE POLICY "Full access friend_request" ON friend_request FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE borrow ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access borrow" ON borrow;
DROP POLICY IF EXISTS "Full access borrow" ON borrow;
CREATE POLICY "Full access borrow" ON borrow FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access users" ON users;
DROP POLICY IF EXISTS "Full access users" ON users;
CREATE POLICY "Full access users" ON users FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access tag" ON tag;
DROP POLICY IF EXISTS "Full access tag" ON tag;
CREATE POLICY "Full access tag" ON tag FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE donation_opportunity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access donation_opportunity" ON donation_opportunity;
DROP POLICY IF EXISTS "Full access donation_opportunity" ON donation_opportunity;
CREATE POLICY "Full access donation_opportunity" ON donation_opportunity FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE donation_flag ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access donation_flag" ON donation_flag;
DROP POLICY IF EXISTS "Full access donation_flag" ON donation_flag;
CREATE POLICY "Full access donation_flag" ON donation_flag FOR ALL TO public USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------
-- Performance Indexes for High-Frequency Queries and RLS Subqueries
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_friend_code ON users (friend_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_clothing_item_user ON clothing_item (user_id);
CREATE INDEX IF NOT EXISTS idx_friend_request_receiver ON friend_request (receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_request_sender ON friend_request (sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_request_status_users ON friend_request (status, sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_daily_clothing_log_user_date ON daily_clothing_log (user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_daily_log_item_log_id ON daily_log_item (log_id);
CREATE INDEX IF NOT EXISTS idx_borrow_borrower ON borrow (borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrow_item ON borrow (item_id);
CREATE INDEX IF NOT EXISTS idx_donation_flag_donation_id ON donation_flag (donation_id);
CREATE INDEX IF NOT EXISTS idx_item_tag_item_id ON item_tag (item_id);
CREATE INDEX IF NOT EXISTS idx_bsas_assessment_user ON bsas_assessment (user_id);

-- Enable Replica Identity Full for Realtime Broadcast
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE clothing_item REPLICA IDENTITY FULL;
ALTER TABLE item_tag REPLICA IDENTITY FULL;
ALTER TABLE tag REPLICA IDENTITY FULL;
ALTER TABLE bsas_assessment REPLICA IDENTITY FULL;
ALTER TABLE daily_clothing_log REPLICA IDENTITY FULL;
ALTER TABLE daily_log_item REPLICA IDENTITY FULL;
ALTER TABLE friend_request REPLICA IDENTITY FULL;
ALTER TABLE borrow REPLICA IDENTITY FULL;
ALTER TABLE donation_opportunity REPLICA IDENTITY FULL;
ALTER TABLE donation_flag REPLICA IDENTITY FULL;

-- Enable Supabase Realtime Publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE clothing_item;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE item_tag;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE tag;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE bsas_assessment;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE daily_clothing_log;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE daily_log_item;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE friend_request;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE borrow;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE donation_opportunity;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE donation_flag;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- --------------------------------------------------------------------
-- Compatibility Views for Exact Spec Nomenclature
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW "USER" WITH (security_invoker = true) AS SELECT * FROM users;

-- --------------------------------------------------------------------
-- Seed Data: TAG Catalog (Categories & 14 Curated Core Color Families)
-- --------------------------------------------------------------------
INSERT INTO tag (tag_name, tag_type) VALUES
    ('Tops', 'Category'),
    ('Bottoms', 'Category'),
    ('Outerwear', 'Category'),
    ('Shoes', 'Category'),
    ('Dresses', 'Category'),
    ('Knitwear', 'Category'),
    ('Accessories', 'Category'),
    ('Shirt', 'Category'),
    ('Pants', 'Category'),
    ('Skirt', 'Category'),
    ('Shorts', 'Category'),
    ('One-Piece', 'Category'),
    ('Black', 'Color'),
    ('White', 'Color'),
    ('Gray', 'Color'),
    ('Navy', 'Color'),
    ('Blue', 'Color'),
    ('Red', 'Color'),
    ('Burgundy', 'Color'),
    ('Green', 'Color'),
    ('Olive', 'Color'),
    ('Brown', 'Color'),
    ('Beige', 'Color'),
    ('Yellow', 'Color'),
    ('Pink', 'Color'),
    ('Neutral', 'Color')
ON CONFLICT (tag_name, tag_type) DO NOTHING;

-- --------------------------------------------------------------------
-- Row Level Security (RLS) Configuration for Anon Client Connection
-- --------------------------------------------------------------------
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clothing_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS item_tag DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tag DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS friend_request DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS borrow DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS donation_opportunity DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS donation_flag DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_clothing_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_log_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bsas_assessment DISABLE ROW LEVEL SECURITY;


