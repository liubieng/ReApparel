import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw, 
  Save, 
  Terminal, 
  ExternalLink 
} from 'lucide-react';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig, mockDatabase } from '../services/supabaseClient';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

const SCHEMA_SQL_PREVIEW = `-- ReApparel Database Schema (PostgreSQL / Supabase)
-- 11 Normalized Tables, RLS, & Midnight Finalization Job

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
);

-- Midnight Finalization Stored Procedure
CREATE OR REPLACE FUNCTION finalize_daily_clothing_logs()
RETURNS INT AS $$
...
$$ LANGUAGE plpgsql;`;

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  if (!isOpen) return null;

  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [copiedSql, setCopiedSql] = useState(false);
  const [tab, setTab] = useState<'config' | 'sql'>('config');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredSupabaseConfig(url.trim(), key.trim());
    onConfigUpdated();
    alert('Supabase credentials saved. The app will now communicate with your project.');
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SCHEMA_SQL_PREVIEW);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleClearDatabase = () => {
    if (window.confirm('Purge all clothing items, daily logs, assessments, and community records to completely empty the database?')) {
      mockDatabase.clearAllData();
      onConfigUpdated();
      alert('Database successfully emptied. All tables are now clean.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 font-display">
                Supabase & Relational PostgreSQL Architecture
              </h3>
              <p className="text-xs text-slate-500">
                11 Normalized Tables, Row-Level Security & Midnight pg_cron
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-3 flex gap-2 border-b border-slate-100 text-xs">
          <button
            onClick={() => setTab('config')}
            className={`pb-2.5 font-semibold transition cursor-pointer border-b-2 ${
              tab === 'config'
                ? 'border-emerald-600 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Connection Settings
          </button>
          <button
            onClick={() => setTab('sql')}
            className={`pb-2.5 font-semibold transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
              tab === 'sql'
                ? 'border-emerald-600 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Schema SQL & Migrations</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'config' ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Dual Mode: Supabase Cloud & Resilient In-Memory Simulator</span>
                </div>
                <p>
                  ReApparel includes a fully persistent client-side relational mock engine that runs out-of-the-box. You can connect your live Supabase project by pasting your credentials below.
                </p>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supabase Project URL (VITE_SUPABASE_URL)
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supabase Anon Public API Key (VITE_SUPABASE_ANON_KEY)
                  </label>
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleClearDatabase}
                    className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 border border-rose-200 px-3 py-2 rounded-xl hover:bg-rose-50 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Empty All Database Tables</span>
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Connection</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Target: Supabase PostgreSQL (SQL Editor)
                </span>
                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-96">
                {SCHEMA_SQL_PREVIEW}
              </pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
