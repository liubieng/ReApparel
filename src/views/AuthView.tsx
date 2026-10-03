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
      const pwd = password.trim();

      // TC_LOGIN_06: Logging in without required credentials
      if (!identifier && !pwd) {
        setErrorMsg('Email address and password are required.');
        return;
      }
      if (!identifier) {
        setErrorMsg('Email address is required.');
        return;
      }
      if (!pwd) {
        setErrorMsg('Password is required.');
        return;
      }

      // TC_LOGIN_04: Logging in with an invalid email address
      const isFriendCode = /^RP-[A-Z0-9]+-\d+$/i.test(identifier) || /^RA-[A-Z0-9]+/i.test(identifier);
      if (!isFriendCode) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(identifier)) {
          setErrorMsg('Please enter a valid email address.');
          return;
        }
      }

      // TC_LOGIN_03: Password containing fewer than 8 characters
      if (pwd.length < 8) {
        setErrorMsg('Password is invalid. Password must contain at least 8 characters.');
        return;
      }

      setIsSubmitting(true);
      try {
        const authResult = mockDatabase.authenticateUser(identifier, pwd);
        let user = authResult.user;

        // TC_LOGIN_05: Incorrect password (local match, wrong password)
        if (authResult.wrongPassword) {
          setErrorMsg('The login credentials are invalid. Please check your password.');
          return;
        }

        // 2. If not found locally, query Supabase users table (cross-device login)
        if (!user) {
          const supabase = getSupabase();
          if (supabase) {
            try {
              const isCode = /^RP-/i.test(identifier);
              const query = supabase.from('users').select('*').limit(1);
              const { data } = isCode
                ? await query.ilike('friend_code', identifier)
                : await query.ilike('email', identifier);

              if (data && data.length > 0) {
                const remoteUser = data[0] as User;
                // Password is stored locally only — accept login and save password for next time
                remoteUser.password = pwd;
                mockDatabase.upsertUser(remoteUser);
                mockDatabase.setCurrentUserId(remoteUser.user_id);
                user = remoteUser;
              }
            } catch {
              // Network unavailable — fall through to "not found" error
            }
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

      // TC_ACCOUNT_07: Creating an account without an email address
      if (!trimmedEmail) {
        setErrorMsg('Creating an account requires an email address.');
        return;
      }

      // TC_ACCOUNT_08: Creating an account without a password
      if (!password) {
        setErrorMsg('A password is required to create an account.');
        return;
      }

      // TC_ACCOUNT_04: Password fewer than 8 characters
      if (password.length < 8) {
        setErrorMsg('Password must be at least 8 characters.');
        return;
      }

      if (!trimmedFirst) {
        setErrorMsg('First name is required.');
        return;
      }

      // TC_ACCOUNT_06: Invalid email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
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

        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match. Please verify your confirmation password.');
          return;
        }

        const newUser = mockDatabase.registerUser({
          email: trimmedEmail,
          first_name: trimmedFirst,
          last_name: trimmedLast,
          password: password
        });

        // Persist to Supabase if available so the account is accessible cross-device
        if (supabase) {
          try {
            const { error: insertError } = await supabase.from('users').insert([{
              user_id: newUser.user_id,
              email: newUser.email,
              first_name: newUser.first_name,
              last_name: newUser.last_name,
              friend_code: newUser.friend_code,
              created_at: newUser.created_at
            }]);

            if (insertError) {
              // Ignore duplicate-key errors (user somehow already exists remotely)
              if (insertError.code !== '23505') {
                // Non-fatal: user is saved locally; warn but proceed
                console.warn('Supabase user sync warning:', insertError.message);
              }
            }
          } catch (syncErr) {
            // Network failure — user is saved locally; app still works offline
            console.warn('Could not sync user to Supabase:', syncErr);
          }
        }

        toast(`Account created! Welcome to ReApparel, ${newUser.first_name}.`);
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
        
        {/* Branding & Identity (Figure .1.1 & .1.2) */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#ffffff',
            marginBottom: 12
          }}>
            <Shirt style={{ width: 24, height: 24 }} />
          </div>
          <h1 style={{ fontSize: 24, margin: '0 0 6px', fontFamily: 'var(--font-display)' }}>
            ReApparel
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            A calmer home for your closet.
          </p>
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
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} noValidate>
          {authMode === 'register' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>First Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Maria"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Santos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="field" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Email
            </label>
            <input
              type={authMode === 'login' ? 'text' : 'email'}
              placeholder="you@example.com"
              value={emailOrCode}
              onChange={(e) => setEmailOrCode(e.target.value)}
              required
            />
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Password
            </label>
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
            <div className="field" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Confirm Password *
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {/* Full-width submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-p"
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              padding: '10px 14px', 
              fontSize: 14, 
              fontWeight: 600,
              borderRadius: 20,
              marginTop: 10 
            }}
          >
            {authMode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        {/* Switch mode link (Figure .1.2: "New to Verdant? Create an account") */}
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12.5, color: 'var(--text-muted)' }}>
          {authMode === 'login' ? (
            <>
              New to ReApparel?{' '}
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setErrorMsg(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Log in
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
