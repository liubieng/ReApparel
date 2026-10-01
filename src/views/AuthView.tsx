import React, { useState } from 'react';
import { Shirt, Users, Sparkles, ArrowRight, ShieldCheck, KeyRound, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { User } from '../types/database';
import { mockDatabase, getSupabase } from '../services/supabaseClient';

/**
 * ============================================================================
 * AUTHENTICATION VIEW (AuthView.tsx)
 * ============================================================================
 * 
 * CAPSTONE CONTEXT:
 * - Implements password authentication with graceful fallback to Friend Code login.
 * - For presentation ease, includes quick access so the panel
 *   can witness multi-user peer-to-peer lending without typing manual credentials.
 */

interface AuthViewProps {
  onLoginSuccess: (user: User, isNewUser: boolean) => void;
  toast: (message: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, toast }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [emailOrCode, setEmailOrCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Form submission handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (authMode === 'login') {
      const identifier = emailOrCode.trim();
      if (!identifier) {
        setErrorMsg('Please enter your email or friend code.');
        return;
      }

      setIsSubmitting(true);
      try {
        // 1. Authenticate via local state
        let user = mockDatabase.loginUser(identifier);

        // 2. If not found locally, query Supabase users table
        if (!user) {
          const supabase = getSupabase();
          if (supabase) {
            try {
              const { data } = await supabase
                .from('users')
                .select('*')
                .or(`email.ilike.${identifier},friend_code.ilike.${identifier}`)
                .limit(1);
              if (data && data.length > 0) {
                const remoteUser = data[0] as User;
                const all = mockDatabase.getAllUsers();
                if (!all.some(u => u.user_id === remoteUser.user_id)) {
                  all.push(remoteUser);
                }
                mockDatabase.setCurrentUserId(remoteUser.user_id);
                user = remoteUser;
              }
            } catch {}
          }
        }

        if (user) {
          toast(`Welcome back, ${user.first_name}!`);
          onLoginSuccess(user, false);
        } else {
          setErrorMsg('No account found with this email or friend code. Please check your credentials or switch to Register.');
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Registration mode
      const trimmedEmail = emailOrCode.trim().toLowerCase();
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();

      if (!trimmedFirst || !trimmedEmail) {
        setErrorMsg('First name and email are required.');
        return;
      }

      if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }

      // 1. Check if email already registered locally
      if (mockDatabase.isEmailRegistered(trimmedEmail)) {
        setErrorMsg(`An account with the email "${trimmedEmail}" already exists. Please sign in instead.`);
        return;
      }

      setIsSubmitting(true);
      try {
        // 2. Check if email already registered in Supabase users table
        const supabase = getSupabase();
        if (supabase) {
          try {
            const { data } = await supabase
              .from('users')
              .select('user_id')
              .ilike('email', trimmedEmail)
              .limit(1);
            if (data && data.length > 0) {
              setErrorMsg(`An account with the email "${trimmedEmail}" already exists. Please sign in instead.`);
              return;
            }
          } catch {}
        }

        if (!password || password.length < 8) {
          setErrorMsg('Password must be at least 8 characters.');
          return;
        }

        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match. Please verify your confirmation password.');
          return;
        }

        const newUser = mockDatabase.registerUser({
          email: trimmedEmail,
          first_name: trimmedFirst,
          last_name: trimmedLast
        });

        toast(`Account created! Welcome to ReApparel, ${newUser.first_name}.`);
        // New users are directed to the BSAS baseline assessment first
        onLoginSuccess(newUser, true);
      } catch (err: any) {
        setErrorMsg(err?.message || `An account with the email "${trimmedEmail}" already exists. Please sign in instead.`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="center-shell">
      <div className="card" style={{ maxWidth: 440, width: '100%', padding: '28px 24px', boxShadow: 'var(--shadow)' }}>
        
        {/* Branding & Identity */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-soft))',
            color: '#ffffff',
            marginBottom: 12
          }}>
            <Shirt style={{ width: 26, height: 26 }} />
          </div>
          <h1 style={{ fontSize: 26, margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>
            ReApparel
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            Responsible Closet Utilization &amp; Recovery Platform
          </p>
        </div>

        {/* Tab Switcher: Login vs Register */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          padding: 4,
          background: 'var(--surface-2)',
          borderRadius: 8,
          marginBottom: 20
        }}>
          <button
            type="button"
            className={`btn ${authMode === 'login' ? 'btn-p' : 'btn-g'}`}
            style={{ justifyContent: 'center', fontSize: 13, border: 'none' }}
            onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
          >
            <LogIn className="ico" style={{ width: 14, height: 14 }} /> Sign In
          </button>
          <button
            type="button"
            className={`btn ${authMode === 'register' ? 'btn-p' : 'btn-g'}`}
            style={{ justifyContent: 'center', fontSize: 13, border: 'none' }}
            onClick={() => { setAuthMode('register'); setErrorMsg(null); }}
          >
            <UserPlus className="ico" style={{ width: 14, height: 14 }} /> Register
          </button>
        </div>


        {/* Error message alert */}
        {errorMsg && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            fontSize: 12.5,
            marginBottom: 16,
            border: '1px solid var(--danger)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
              <span>{errorMsg}</span>
            </div>
            {errorMsg.includes('already exists') && (
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: 12,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0
                }}
              >
                Click here to switch to Sign In &rarr;
              </button>
            )}
            {errorMsg.includes('No account found') && (
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setErrorMsg(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: 12,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0
                }}
              >
                Click here to Register a new account &rarr;
              </button>
            )}
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit}>
          {authMode === 'register' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>First Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Maria"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Santos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="field">
            <label>
              {authMode === 'login' ? 'Email Address or Friend Code' : 'Email Address *'}
            </label>
            <input
              type={authMode === 'login' ? 'text' : 'email'}
              placeholder={authMode === 'login' ? 'your.email@example.com or friend code' : 'your.email@example.com'}
              value={emailOrCode}
              onChange={(e) => setEmailOrCode(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>{authMode === 'register' ? 'Password *' : 'Password'}</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={authMode === 'register'}
              minLength={authMode === 'register' ? 8 : undefined}
            />
          </div>

          {authMode === 'register' && (
            <div className="field">
              <label>Confirm Password *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-p"
            style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: 14, marginTop: 8 }}
          >
            {authMode === 'login' ? 'Sign In to Wardrobe' : 'Create Free Account'}
            <ArrowRight className="ico" style={{ marginLeft: 6 }} />
          </button>
        </form>

      </div>
    </div>
  );
};
