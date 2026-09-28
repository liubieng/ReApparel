import React, { useState } from 'react';
import { Shirt, Leaf, Users, Sparkles, ArrowRight, ShieldCheck, KeyRound, UserPlus, LogIn } from 'lucide-react';
import { User } from '../../types/database';
import { mockDatabase } from '../../services/supabaseClient';

/**
 * ============================================================================
 * AUTHENTICATION VIEW (AuthView.tsx)
 * ============================================================================
 * 
 * CAPSTONE DEFENSE CONTEXT:
 * - Addresses UN Sustainable Development Goal 12 (Responsible Consumption & Production).
 * - Implements password authentication with graceful fallback to Friend Code login.
 * - For presentation ease, includes "Quick Demo Profiles" so the defense panel
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

  // Form submission handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (authMode === 'login') {
      const identifier = emailOrCode.trim();
      if (!identifier) {
        setErrorMsg('Please enter your email or friend code.');
        return;
      }

      // Authenticate via mockDatabase or registered user
      const user = mockDatabase.loginUser(identifier);
      if (user) {
        toast(`Welcome back, ${user.first_name}!`);
        onLoginSuccess(user, false);
      } else {
        // Create an account on the fly if testing a new email/code
        const fallbackUser = mockDatabase.registerUser({
          email: identifier.includes('@') ? identifier : `${identifier.toLowerCase()}@reapparel.local`,
          first_name: identifier.split('@')[0],
          last_name: ''
        });
        toast(`Logged in as ${fallbackUser.first_name}`);
        onLoginSuccess(fallbackUser, true);
      }
    } else {
      // Registration mode
      const trimmedEmail = emailOrCode.trim();
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();

      if (!trimmedFirst || !trimmedEmail) {
        setErrorMsg('First name and email are required.');
        return;
      }

      if (!trimmedEmail.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }

      if (password && password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
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
    }
  };

  // Quick switch for panel demonstration
  const handleQuickDemoLogin = (userId: string) => {
    const user = mockDatabase.getAllUsers().find(u => u.user_id === userId);
    if (user) {
      mockDatabase.setCurrentUserId(user.user_id);
      toast(`Switched to demo profile: ${user.first_name} ${user.last_name}`);
      onLoginSuccess(user, false);
    }
  };

  return (
    <div className="center-shell">
      <div className="card" style={{ maxWidth: 440, width: '100%', padding: '28px 24px', boxShadow: 'var(--shadow)' }}>
        
        {/* Branding & SDG 12 Identity */}
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
          <div style={{ marginTop: 8 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '3px 8px',
              borderRadius: 6,
              background: 'var(--surface-2)',
              color: 'var(--primary)',
              border: '1px solid var(--border)'
            }}>
              <Leaf style={{ width: 12, height: 12 }} /> UN SDG 12: Target 12.5
            </span>
          </div>
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
            border: '1px solid var(--danger)'
          }}>
            {errorMsg}
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
              placeholder={authMode === 'login' ? 'mario@example.com or RP-MARI-1024' : 'your.email@example.com'}
              value={emailOrCode}
              onChange={(e) => setEmailOrCode(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={authMode === 'register'}
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

        {/* Quick Demo Login (Helpful during panel defense) */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
            🎯 Thesis Defense Demo Profiles:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 11.5, padding: '6px 8px', justifyContent: 'center' }}
              onClick={() => handleQuickDemoLogin('u-mario-01')}
            >
              Mario (Lender)
            </button>
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 11.5, padding: '6px 8px', justifyContent: 'center' }}
              onClick={() => handleQuickDemoLogin('u-liu-02')}
            >
              Liu (Borrower)
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0', textAlign: 'center' }}>
            Tip: Switch between Mario &amp; Liu to demonstrate peer-to-peer wardrobe sharing.
          </p>
        </div>

      </div>
    </div>
  );
};
