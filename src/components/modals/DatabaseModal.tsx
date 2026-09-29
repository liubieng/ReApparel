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
} from '../../services/supabaseClient';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
  toast?: (msg: string) => void;
}

const SQL_ANON_PERMISSIVE = `-- ReApparel: Enable Anonymous Prototype Reads & Writes
-- Run this in your Supabase Dashboard -> SQL Editor if you want
-- your remote Supabase PostgreSQL database to directly accept writes.

-- 1. Clothing Items
ALTER TABLE clothing_item ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access clothing_item" ON clothing_item;
CREATE POLICY "Anon full access clothing_item" ON clothing_item FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. Item Tags
ALTER TABLE item_tag ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access item_tag" ON item_tag;
CREATE POLICY "Anon full access item_tag" ON item_tag FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. BSAS Assessments
ALTER TABLE bsas_assessment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access bsas_assessment" ON bsas_assessment;
CREATE POLICY "Anon full access bsas_assessment" ON bsas_assessment FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. Daily Clothing Logs & Items
ALTER TABLE daily_clothing_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access daily_clothing_log" ON daily_clothing_log;
CREATE POLICY "Anon full access daily_clothing_log" ON daily_clothing_log FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE daily_log_item ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access daily_log_item" ON daily_log_item;
CREATE POLICY "Anon full access daily_log_item" ON daily_log_item FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. Friend Requests & Borrows
ALTER TABLE friend_request ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access friend_request" ON friend_request;
CREATE POLICY "Anon full access friend_request" ON friend_request FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE borrow ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access borrow" ON borrow;
CREATE POLICY "Anon full access borrow" ON borrow FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. Users & Tags
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access users" ON users;
CREATE POLICY "Anon full access users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access tag" ON tag;
CREATE POLICY "Anon full access tag" ON tag FOR ALL TO anon USING (true) WITH CHECK (true);

-- 7. Donation Opportunities & Flags
ALTER TABLE donation_opportunity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access donation_opportunity" ON donation_opportunity;
CREATE POLICY "Anon full access donation_opportunity" ON donation_opportunity FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE donation_flag ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access donation_flag" ON donation_flag;
CREATE POLICY "Anon full access donation_flag" ON donation_flag FOR ALL TO anon USING (true) WITH CHECK (true);`;

const SQL_DISABLE_RLS = `-- ReApparel: Quick Disable RLS for Local Prototype
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_tag DISABLE ROW LEVEL SECURITY;
ALTER TABLE bsas_assessment DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_clothing_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_request DISABLE ROW LEVEL SECURITY;
ALTER TABLE borrow DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag DISABLE ROW LEVEL SECURITY;
ALTER TABLE donation_opportunity DISABLE ROW LEVEL SECURITY;
ALTER TABLE donation_flag DISABLE ROW LEVEL SECURITY;`;

const SQL_FULL_SCHEMA = `-- ReApparel Full PostgreSQL Database Schema
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    friend_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bsas_assessment (
    assessment_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 7),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Indicative', 'Non-Indicative')),
    taken_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clothing_item (
    item_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    addition_type TEXT NOT NULL CHECK (addition_type IN ('Old', 'New')),
    wear_count INT DEFAULT 0,
    date_added TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tag (
    tag_id SERIAL PRIMARY KEY,
    tag_name TEXT NOT NULL,
    tag_type TEXT NOT NULL CHECK (tag_type IN ('Category', 'Color'))
);

CREATE TABLE item_tag (
    item_tag_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES clothing_item(item_id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tag(tag_id) ON DELETE CASCADE,
    UNIQUE(item_id, tag_id)
);

CREATE TABLE daily_clothing_log (
    log_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    is_finalized BOOLEAN DEFAULT FALSE,
    finalized_at TIMESTAMPTZ NULL,
    UNIQUE (user_id, log_date)
);

CREATE TABLE daily_log_item (
    daily_log_item_id SERIAL PRIMARY KEY,
    log_id INT NOT NULL REFERENCES daily_clothing_log(log_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES clothing_item(item_id) ON DELETE CASCADE,
    UNIQUE (log_id, item_id)
);

CREATE TABLE friend_request (
    request_id SERIAL PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users(user_id),
    receiver_id UUID NOT NULL REFERENCES users(user_id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (sender_id, receiver_id)
);

CREATE TABLE borrow (
    borrow_id SERIAL PRIMARY KEY,
    borrower_id UUID NOT NULL REFERENCES users(user_id),
    item_id INT NOT NULL REFERENCES clothing_item(item_id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Returned')) DEFAULT 'Pending'
);

CREATE TABLE donation_opportunity (
    donation_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL
);

CREATE TABLE donation_flag (
    flag_id SERIAL PRIMARY KEY,
    donation_id INT NOT NULL REFERENCES donation_opportunity(donation_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id),
    flag_type TEXT NOT NULL CHECK (flag_type IN ('Inactive', 'Inaccurate')),
    flagged_at TIMESTAMPTZ DEFAULT now()
);`;

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

  // Run diagnostics automatically when modal opens
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
      // Re-run diagnostic to show fresh row counts
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
        
        {/* Header */}
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

        {/* Tab switch */}
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

        {/* Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          
          {/* TAB 1: DIAGNOSTICS & SYSTEM HEALTH */}
          {tab === 'diagnostics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Overall Status Banner */}
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

                {/* Explanation of RLS and Zero-Data-Loss architecture */}
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

              {/* Table Status Grid */}
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

              {/* Maintenance & Reset Toolbar */}
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

          {/* TAB 2: SQL MIGRATIONS & RLS FIXES */}
          {tab === 'sql' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                {/* Segmented Subtab Switch */}
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

          {/* TAB 3: CONNECTION CREDENTIALS */}
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
