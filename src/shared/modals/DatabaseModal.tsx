import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Save,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Upload
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  mockDatabase,
  runDatabaseDiagnostic,
  syncAllLocalDataToSupabase,
  DatabaseDiagnosticResult
} from '../services/supabaseClient';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
  toast?: (msg: string) => void;
}

const SQL_ANON_PERMISSIVE = `-- ReApparel: Instant Real-Time Cloud Sync & Permissive Permissions
-- Run this in your Supabase Dashboard -> SQL Editor.
-- Fixes missing columns, sets full replica identity, and grants instantaneous multi-user reads & writes.

-- 1. Ensure All Columns Exist for Community Donation Drives & Social Posts
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS organizer TEXT;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS post_url TEXT;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS post_platform TEXT DEFAULT 'facebook';
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS post_title TEXT;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS post_snippet TEXT;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS is_live_drive BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS hours TEXT DEFAULT 'Mon-Sun 8:00 AM - 8:00 PM';
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS accepted_types TEXT DEFAULT 'Clothing, Shoes, Linens, Bags';
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS barangay TEXT;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE IF EXISTS donation_opportunity ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 2. Ensure All Columns Exist for Wardrobe Clothing Items & Verification Flags
ALTER TABLE IF EXISTS clothing_item ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE IF EXISTS clothing_item ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE IF EXISTS clothing_item ADD COLUMN IF NOT EXISTS type_tag TEXT;
ALTER TABLE IF EXISTS clothing_item ADD COLUMN IF NOT EXISTS color_tag TEXT;
ALTER TABLE IF EXISTS clothing_item ADD COLUMN IF NOT EXISTS addition_type TEXT DEFAULT 'Old';
ALTER TABLE IF EXISTS clothing_item ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE IF EXISTS clothing_item ADD COLUMN IF NOT EXISTS is_borrowed BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS clothing_item ADD COLUMN IF NOT EXISTS borrower_id UUID;
ALTER TABLE IF EXISTS donation_flag ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Enable Full Replica Identity for Complete Realtime Payloads
ALTER TABLE IF EXISTS users REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS clothing_item REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS item_tag REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS tag REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS bsas_assessment REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS daily_clothing_log REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS daily_log_item REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS friend_request REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS borrow REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS donation_opportunity REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS donation_flag REPLICA IDENTITY FULL;

-- 4. Enable Row Level Security (RLS) with Public Access (both anon and authenticated users)
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

-- 5. Enable Supabase Realtime Publication for Instant Multi-User Updates
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
END $$;`;

const SQL_DISABLE_RLS = `-- ReApparel: Quick Disable RLS for Local Prototype & Defense
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clothing_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS item_tag DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bsas_assessment DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_clothing_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_log_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS friend_request DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS borrow DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tag DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS donation_opportunity DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS donation_flag DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bsas_assessment ADD COLUMN IF NOT EXISTS breakdown JSONB;`;

const SQL_FULL_SCHEMA = `-- ReApparel Full PostgreSQL Database Schema
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    friend_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bsas_assessment (
    assessment_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 7),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Indicative', 'Non-Indicative')),
    breakdown JSONB,
    taken_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clothing_item (
    item_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT,
    color TEXT,
    type_tag TEXT,
    color_tag TEXT,
    addition_type TEXT DEFAULT 'Old',
    cost NUMERIC(10,2) DEFAULT 0,
    wear_count INT DEFAULT 0,
    is_borrowed BOOLEAN DEFAULT FALSE,
    borrower_id UUID,
    date_added TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tag (
    tag_id SERIAL PRIMARY KEY,
    tag_name TEXT NOT NULL,
    tag_type TEXT NOT NULL CHECK (tag_type IN ('Category', 'Color'))
);

CREATE TABLE IF NOT EXISTS item_tag (
    item_tag_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES clothing_item(item_id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tag(tag_id) ON DELETE CASCADE,
    UNIQUE(item_id, tag_id)
);

CREATE TABLE IF NOT EXISTS daily_clothing_log (
    log_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    is_finalized BOOLEAN DEFAULT FALSE,
    finalized_at TIMESTAMPTZ NULL,
    UNIQUE (user_id, log_date)
);

CREATE TABLE IF NOT EXISTS daily_log_item (
    daily_log_item_id SERIAL PRIMARY KEY,
    log_id INT NOT NULL REFERENCES daily_clothing_log(log_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES clothing_item(item_id) ON DELETE CASCADE,
    UNIQUE (log_id, item_id)
);

CREATE TABLE IF NOT EXISTS friend_request (
    request_id SERIAL PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users(user_id),
    receiver_id UUID NOT NULL REFERENCES users(user_id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS borrow (
    borrow_id SERIAL PRIMARY KEY,
    borrower_id UUID NOT NULL REFERENCES users(user_id),
    item_id INT NOT NULL REFERENCES clothing_item(item_id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Returned')) DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS donation_opportunity (
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

CREATE TABLE IF NOT EXISTS donation_flag (
    flag_id SERIAL PRIMARY KEY,
    donation_id INT NOT NULL REFERENCES donation_opportunity(donation_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id),
    flag_type TEXT NOT NULL CHECK (flag_type IN ('Inactive', 'Inaccurate')),
    notes TEXT,
    flagged_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes for High-Frequency Queries and RLS Subqueries
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

-- Enable Replica Identity Full for Realtime
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

-- Enable Supabase Realtime
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
END $$;`;

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
  toast
}) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [copiedSql, setCopiedSql] = useState(false);
  const [tab, setTab] = useState<'diagnostics' | 'sql' | 'config'>('diagnostics');
  const [sqlSubtab, setSqlSubtab] = useState<'permissive' | 'disable' | 'ddl'>('permissive');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DatabaseDiagnosticResult | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const notify = (msg: string) => {
    if (toast) toast(msg);
    else alert(msg);
  };

  const handleRunDiagnostics = async () => {
    setIsRunningDiag(true);
    try {
      const res = await runDatabaseDiagnostic();
      setDiagnostic(res);
    } catch (err: any) {
      notify(`Diagnostics failed: ${err?.message || 'Unknown network error'}`);
    } finally {
      setIsRunningDiag(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleRunDiagnostics();
    }
  }, [isOpen]);

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await syncAllLocalDataToSupabase();
      notify(res.message);

      await handleRunDiagnostics();
      onConfigUpdated();
    } catch (err: any) {
      notify(`Sync error: ${err?.message || 'Check connection'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredSupabaseConfig(url.trim(), key.trim());
    onConfigUpdated();
    notify('Supabase credentials saved! Testing connection...');
    handleRunDiagnostics();
  };

  const getActiveSql = () => {
    if (sqlSubtab === 'permissive') return SQL_ANON_PERMISSIVE;
    if (sqlSubtab === 'disable') return SQL_DISABLE_RLS;
    return SQL_FULL_SCHEMA;
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(getActiveSql());
    setCopiedSql(true);
    notify('SQL script copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleExecuteClear = () => {
    mockDatabase.clearAllData();
    onConfigUpdated();
    setIsConfirmingClear(false);
    handleRunDiagnostics();
    notify('Database successfully purged. All local tables are now clean.');
  };

  const handleExecuteReset = () => {
    mockDatabase.resetToFactorySeeds();
    onConfigUpdated();
    setIsConfirmingReset(false);
    handleRunDiagnostics();
    notify('Reset to curated prototype seed data successfully.');
  };

  if (!isOpen) return null;

  return (
    <div className="modalScrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 740, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0 }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database className="ico" style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                Database Architecture &amp; Live Connectivity
              </h3>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)' }}>
                11 Normalized Tables &middot; Supabase PostgreSQL &middot; Persistent Local Relational Store
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icobtn"
            aria-label="Close dialog"
          >
            <X className="ico" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: '10px 20px 0', display: 'flex', gap: 16, borderBottom: '1px solid var(--border)', fontSize: 13, background: 'var(--surface)' }}>
          <button
            type="button"
            onClick={() => setTab('diagnostics')}
            style={{
              padding: '0 4px 10px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === 'diagnostics' ? 'var(--primary)' : 'transparent'}`,
              color: tab === 'diagnostics' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Activity className="ico" style={{ width: 14, height: 14 }} />
            <span>Connection Health &amp; Tables</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('sql')}
            style={{
              padding: '0 4px 10px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === 'sql' ? 'var(--primary)' : 'transparent'}`,
              color: tab === 'sql' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Terminal className="ico" style={{ width: 14, height: 14 }} />
            <span>SQL Migrations &amp; RLS Policies</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('config')}
            style={{
              padding: '0 4px 10px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === 'config' ? 'var(--primary)' : 'transparent'}`,
              color: tab === 'config' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            API Credentials
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>

          {tab === 'diagnostics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: diagnostic?.isConnected ? 'var(--surface-2)' : 'var(--danger-soft)',
                border: `1px solid ${diagnostic?.isConnected ? 'var(--border)' : 'var(--danger)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {diagnostic?.isConnected ? (
                      <CheckCircle2 style={{ width: 18, height: 18, color: 'var(--primary)' }} />
                    ) : (
                      <AlertTriangle style={{ width: 18, height: 18, color: 'var(--danger)' }} />
                    )}
                    <div>
                      <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                        {diagnostic?.isConnected
                          ? 'Supabase Cloud PostgreSQL Connected (Dual-Engine Live)'
                          : 'Supabase Offline &middot; Using Local Persistent Engine'}
                      </strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {diagnostic?.projectUrl || 'Client-side LocalStorage Active'}
                        {diagnostic?.latencyMs ? ` &middot; Latency: ${diagnostic.latencyMs}ms` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleRunDiagnostics}
                      disabled={isRunningDiag}
                      className="btn btn-g"
                      style={{ fontSize: 11.5, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RefreshCw className={`ico ${isRunningDiag ? 'spin' : ''}`} style={{ width: 12, height: 12 }} />
                      <span>{isRunningDiag ? 'Auditing...' : 'Run Diagnostics'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncToCloud}
                      disabled={isSyncing || !diagnostic?.isConnected}
                      className="btn btn-p"
                      style={{ fontSize: 11.5, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Upload className="ico" style={{ width: 12, height: 12 }} />
                      <span>{isSyncing ? 'Syncing...' : 'Push Local to Cloud'}</span>
                    </button>
                  </div>
                </div>

                {diagnostic?.writePermission === 'rls_blocked' && (
                  <div style={{
                    padding: 10,
                    borderRadius: 6,
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border)',
                    fontSize: 11.5,
                    lineHeight: 1.5,
                    color: 'var(--text)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#f59e0b', marginBottom: 2 }}>
                      <Lock style={{ width: 13, height: 13 }} />
                      <span>PostgreSQL Row-Level Security (RLS) Active on Supabase</span>
                    </div>
                    <p style={{ margin: '0 0 4px', color: 'var(--text-muted)' }}>
                      Supabase protects tables by default when using the public anonymous key without user login sessions.
                      <strong> Zero data was lost:</strong> ReApparel automatically stored your items, daily outfits, and BSAS check-ins in the local persistent store.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                        Want items to sync directly into Supabase Table Editor?
                      </span>
                      <button
                        type="button"
                        onClick={() => { setTab('sql'); setSqlSubtab('permissive'); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: 0
                        }}
                      >
                        View 1-Click RLS Script &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {diagnostic?.writePermission === 'allowed' && (
                  <div style={{
                    padding: 8,
                    borderRadius: 6,
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    fontSize: 11.5,
                    color: '#22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <Unlock style={{ width: 13, height: 13 }} />
                    <span>Supabase Cloud write permissions verified! Remote cloud synchronization is fully functional.</span>
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    All 11 Normalized PostgreSQL Tables
                  </h4>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Cloud: {diagnostic?.totalRemoteRows ?? 0} rows &middot; Local: {diagnostic?.totalLocalRows ?? 0} records
                  </span>
                </div>

                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'var(--surface)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 600 }}>Table Name</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600 }}>Schema Role</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Cloud Rows</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Local Cache</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(diagnostic?.tables || []).map((t, idx) => (
                        <tr
                          key={t.name}
                          style={{
                            borderBottom: idx === (diagnostic?.tables.length || 0) - 1 ? 'none' : '1px solid var(--border)',
                            background: idx % 2 === 0 ? 'transparent' : 'var(--surface-2)'
                          }}
                        >
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)' }}>
                            {t.name}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                            {t.role}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: t.remoteRows > 0 ? 'rgba(34, 197, 94, 0.15)' : 'var(--surface-3)',
                              color: t.remoteRows > 0 ? 'var(--primary)' : 'var(--text-muted)'
                            }}>
                              {t.remoteRows}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: t.localRows > 0 ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface-3)',
                              color: t.localRows > 0 ? '#3b82f6' : 'var(--text-muted)'
                            }}>
                              {t.localRows}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {t.status === 'ok' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontWeight: 600 }}>
                                <CheckCircle2 style={{ width: 12, height: 12 }} />
                                <span>Connected</span>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--danger)', fontWeight: 600 }}>
                                <AlertTriangle style={{ width: 12, height: 12 }} />
                                <span>Offline</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{
                paddingTop: 8,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {isConfirmingClear ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>Purge all local records?</span>
                      <button
                        type="button"
                        onClick={handleExecuteClear}
                        className="btn btn-d"
                        style={{ fontSize: 11, padding: '3px 8px' }}
                      >
                        Yes, Purge
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClear(false)}
                        className="btn btn-g"
                        style={{ fontSize: 11, padding: '3px 6px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingClear(true)}
                      className="btn btn-g"
                      style={{ fontSize: 11, color: 'var(--danger)', padding: '5px 10px' }}
                    >
                      <RefreshCw className="ico" style={{ width: 11, height: 11 }} />
                      <span>Purge Local Database</span>
                    </button>
                  )}

                  {isConfirmingReset ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>Restore default prototype seeds?</span>
                      <button
                        type="button"
                        onClick={handleExecuteReset}
                        className="btn btn-p"
                        style={{ fontSize: 11, padding: '3px 8px' }}
                      >
                        Confirm Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingReset(false)}
                        className="btn btn-g"
                        style={{ fontSize: 11, padding: '3px 6px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingReset(true)}
                      className="btn btn-g"
                      style={{ fontSize: 11, padding: '5px 10px' }}
                    >
                      <span>Reset to Demo Seeds</span>
                    </button>
                  )}
                </div>

                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Auto-sync: Instant local cache &middot; Safe cloud sync
                </span>
              </div>

            </div>
          )}

          {tab === 'sql' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>

                <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setSqlSubtab('permissive')}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      background: sqlSubtab === 'permissive' ? 'var(--surface)' : 'transparent',
                      color: sqlSubtab === 'permissive' ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    1. Allow Anon Prototype Access (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSqlSubtab('disable')}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      background: sqlSubtab === 'disable' ? 'var(--surface)' : 'transparent',
                      color: sqlSubtab === 'disable' ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    2. Disable RLS (Simple)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSqlSubtab('ddl')}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      background: sqlSubtab === 'ddl' ? 'var(--surface)' : 'transparent',
                      color: sqlSubtab === 'ddl' ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    3. Full Schema DDL
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="btn btn-p"
                  style={{ fontSize: 11.5, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {copiedSql ? <Check className="ico" style={{ width: 13, height: 13 }} /> : <Copy className="ico" style={{ width: 13, height: 13 }} />}
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
                </button>
              </div>

              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-muted)',
                lineHeight: 1.5
              }}>
                <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 2 }}>
                  How to execute this script in Supabase:
                </strong>
                <span>
                  1. Log into your Supabase Dashboard (<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>supabase.com/dashboard</a>).<br />
                  2. Open the <strong>SQL Editor</strong> on the left navigation bar.<br />
                  3. Paste this script and click <strong>Run</strong>. Once executed, public anonymous writes to your Supabase tables will be enabled!
                </span>
              </div>

              <pre style={{
                padding: 14,
                borderRadius: 8,
                background: '#0B140E',
                color: '#8FCB93',
                fontFamily: 'monospace',
                fontSize: 11,
                lineHeight: 1.5,
                overflowX: 'auto',
                maxHeight: 340,
                border: '1px solid var(--border)',
                margin: 0
              }}>
                {getActiveSql()}
              </pre>
            </div>
          )}

          {tab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontWeight: 700, marginBottom: 4 }}>
                  <ShieldCheck className="ico" style={{ color: 'var(--primary)' }} />
                  <span>Dual Mode: Supabase Cloud &amp; Resilient Client Store</span>
                </div>
                <p style={{ margin: 0 }}>
                  ReApparel includes a fully persistent client-side relational mock engine that runs out-of-the-box. You can connect your live Supabase project by verifying your credentials below.
                </p>
              </div>

              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'block' }}>
                    Supabase Project URL (VITE_SUPABASE_URL)
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    style={{ fontSize: 12, fontFamily: 'monospace' }}
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'block' }}>
                    Supabase Anon Public API Key (VITE_SUPABASE_ANON_KEY)
                  </label>
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    style={{ fontSize: 12, fontFamily: 'monospace' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
                  <button
                    type="submit"
                    className="btn btn-p"
                    style={{ fontSize: 12, padding: '7px 16px' }}
                  >
                    <Save className="ico" style={{ width: 13, height: 13 }} />
                    <span>Save &amp; Test Connection</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
