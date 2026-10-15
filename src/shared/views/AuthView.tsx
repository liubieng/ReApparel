import React, { useState, useEffect } from 'react';
import {
  Shirt,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  UserPlus,
  LogIn,
  AlertCircle,
  Mail,
  MailCheck,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import { User } from '../types/database';
import { mockDatabase, getSupabase, generateUUID, ensureUserSyncedToSupabase } from '../services/supabaseClient';
import { closetService } from '../../modules/VirtualCloset';

interface AuthViewProps {
  onLoginSuccess: (user: User, isNewUser: boolean) => void;
  toast: (message: string) => void;
}

// Renders user authentication interface supporting login, registration, and email verification
export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, toast }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      if (search.includes('auth=verify') || window.location.hash.includes('verify')) return 'verify';
      if (search.includes('auth=register') || window.location.hash.includes('register')) return 'register';
    }
    return 'login';
  });
  const [emailOrCode, setEmailOrCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [pendingEmail, setPendingEmail] = useState(() => {
    if (typeof window !== 'undefined' && (window.location.search.includes('auth=verify') || window.location.hash.includes('verify'))) {
      return 'user@example.com';
    }
    return '';
  });
  const [pendingPassword, setPendingPassword] = useState('Password123!');
  const [pendingFirstName, setPendingFirstName] = useState('Alex');
  const [pendingLastName, setPendingLastName] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Decrements the verification email resend cooldown countdown every second
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handles user login authentication or dispatches account registration to Supabase
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (authMode === 'login') {
      const identifier = emailOrCode.trim();
      const pwd = password.trim();

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

      const isFriendCode = /^RP-[A-Z0-9]+-\d+$/i.test(identifier) || /^RA-[A-Z0-9]+/i.test(identifier);
      if (!isFriendCode) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(identifier)) {
          setErrorMsg('Please enter a valid email address.');
          return;
        }
      }

      if (pwd.length < 8) {
        setErrorMsg('Password is invalid. Password must contain at least 8 characters.');
        return;
      }

      setIsSubmitting(true);
      try {
        const supabase = getSupabase();

        if (!isFriendCode && supabase) {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: identifier.toLowerCase(),
            password: pwd
          });

          if (authError) {
            const isUnconfirmed =
              authError.code === 'email_not_confirmed' ||
              authError.message?.toLowerCase().includes('email not confirmed');

            if (isUnconfirmed) {
              setPendingEmail(identifier.toLowerCase());
              setPendingPassword(pwd);
              setResendCooldown(0);
              setAuthMode('verify');
              setErrorMsg('Your email address has not been verified yet. Please check your inbox for the confirmation email.');
              return;
            }

            const localResult = mockDatabase.authenticateUser(identifier, pwd);
            if (localResult.user) {
              toast(`Welcome back, ${localResult.user.first_name}!`);
              onLoginSuccess(localResult.user, false);
              return;
            }

            try {
              const { data: remoteUsers } = await supabase
                .from('users')
                .select('*')
                .ilike('email', identifier)
                .limit(1);

              if (remoteUsers && remoteUsers.length > 0) {
                const remoteUser = remoteUsers[0] as User;
                if (remoteUser.password && remoteUser.password !== pwd) {
                  setErrorMsg('The login credentials are invalid. Please check your password.');
                  return;
                }
                mockDatabase.upsertUser(remoteUser);
                mockDatabase.setCurrentUserId(remoteUser.user_id);
                toast(`Welcome back, ${remoteUser.first_name}!`);
                onLoginSuccess(remoteUser, false);
                return;
              }
            } catch { }

            setErrorMsg('The login credentials are invalid. Please check your password.');
            return;
          }

          if (authData.user) {
            const authUser = authData.user;
            let appUser = mockDatabase.findUserByIdentifier(authUser.email || authUser.id);
            if (appUser && appUser.user_id !== authUser.id) {
              mockDatabase.realignUserId(appUser.user_id, authUser.id);
              appUser = mockDatabase.getUser(authUser.id);
            }

            if (!appUser) {
              try {
                const { data: dbUsers } = await supabase
                  .from('users')
                  .select('*')
                  .eq('user_id', authUser.id)
                  .limit(1);

                if (dbUsers && dbUsers.length > 0) {
                  appUser = dbUsers[0] as User;
                } else {
                  const { data: byEmail } = await supabase
                    .from('users')
                    .select('*')
                    .ilike('email', authUser.email || '')
                    .limit(1);
                  if (byEmail && byEmail.length > 0) {
                    appUser = byEmail[0] as User;
                  }
                }
              } catch { }
            }

            if (!appUser) {
              const fName = authUser.user_metadata?.first_name || authUser.email?.split('@')[0] || 'Member';
              const lName = authUser.user_metadata?.last_name || '';
              appUser = mockDatabase.registerUser({
                user_id: authUser.id,
                email: authUser.email || identifier,
                first_name: fName,
                last_name: lName,
                password: pwd
              });
            } else {
              if (pwd && !appUser.password) appUser.password = pwd;
            }

            appUser = await ensureUserSyncedToSupabase(appUser);
            mockDatabase.upsertUser(appUser);
            mockDatabase.setCurrentUserId(appUser.user_id);
            closetService.syncLocalDataToSupabase(appUser.user_id).catch(() => {});

            toast(`Welcome back, ${appUser.first_name}!`);
            onLoginSuccess(appUser, false);
            return;
          }
        }

        const authResult = mockDatabase.authenticateUser(identifier, pwd);
        let user = authResult.user;

        if (authResult.wrongPassword) {
          setErrorMsg('The login credentials are invalid. Please check your password.');
          return;
        }

        if (!user && supabase) {
          try {
            const isCode = /^RP-/i.test(identifier);
            const query = supabase.from('users').select('*').limit(1);
            const { data } = isCode
              ? await query.ilike('friend_code', identifier)
              : await query.ilike('email', identifier);

            if (data && data.length > 0) {
              const remoteUser = data[0] as User;
              if (remoteUser.password && remoteUser.password !== pwd) {
                setErrorMsg('The login credentials are invalid. Please check your password.');
                return;
              }
              mockDatabase.upsertUser(remoteUser);
              mockDatabase.setCurrentUserId(remoteUser.user_id);
              user = remoteUser;
            }
          } catch { }
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

      const trimmedEmail = emailOrCode.trim().toLowerCase();
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();

      if (!trimmedEmail) {
        setErrorMsg('Creating an account requires an email address.');
        return;
      }

      if (!password) {
        setErrorMsg('A password is required to create an account.');
        return;
      }

      if (password.length < 8) {
        setErrorMsg('Password must be at least 8 characters.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please verify your confirmation password.');
        return;
      }

      if (!trimmedFirst) {
        setErrorMsg('First name is required.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }

      if (mockDatabase.isEmailRegistered(trimmedEmail)) {
        setErrorMsg(`An account with the email "${trimmedEmail}" already exists. Please sign in instead.`);
        return;
      }

      setIsSubmitting(true);
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setErrorMsg('Supabase client is not available. Please check your network or configuration.');
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
          options: {
            data: {
              first_name: trimmedFirst,
              last_name: trimmedLast
            },
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
          }
        });

        if (signUpError) {
          if (signUpError.message?.toLowerCase().includes('already registered') || signUpError.message?.toLowerCase().includes('already exists')) {
            setErrorMsg(`An account with the email "${trimmedEmail}" already exists. Please sign in instead.`);
            return;
          }

          const isLimitHit = signUpError.status === 429 ||
            signUpError.message?.toLowerCase().includes('rate limit') ||
            signUpError.message?.toLowerCase().includes('security purposes') ||
            signUpError.message?.toLowerCase().includes('too many requests') ||
            signUpError.message?.toLowerCase().includes('limit') ||
            signUpError.message?.toLowerCase().includes('quota') ||
            signUpError.message?.toLowerCase().includes('exceeded');

          if (isLimitHit) {
            setPendingEmail(trimmedEmail);
            setPendingPassword(password);
            setPendingFirstName(trimmedFirst);
            setPendingLastName(trimmedLast);
            setPendingUserId(generateUUID());
            setResendCooldown(60);
            setAuthMode('verify');
            return;
          }

          setErrorMsg(signUpError.message);
          return;
        }

        if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
          setErrorMsg(`An account with the email "${trimmedEmail}" already exists. Please sign in instead.`);
          return;
        }

        setPendingEmail(trimmedEmail);
        setPendingPassword(password);
        setPendingFirstName(trimmedFirst);
        setPendingLastName(trimmedLast);
        setPendingUserId(signUpData.user?.id || null);
        setResendCooldown(60);
        setSuccessMsg(`Verification email dispatched to ${trimmedEmail}! Please check your inbox or spam folder for your confirmation link.`);
        setAuthMode('verify');
      } catch (err: any) {
        setErrorMsg(err?.message || 'Registration failed. Please check your details and try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Checks whether the user confirmed their email link and completes account login
  const handleCheckEmailLink = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user && sessionData.session.user.email?.toLowerCase() === pendingEmail.toLowerCase()) {
        const authUser = sessionData.session.user;
        let appUser = mockDatabase.registerUser({
          user_id: authUser.id,
          email: pendingEmail,
          first_name: pendingFirstName || authUser.user_metadata?.first_name || 'Member',
          last_name: pendingLastName || authUser.user_metadata?.last_name || '',
          password: pendingPassword
        });

        appUser = await ensureUserSyncedToSupabase(appUser);
        mockDatabase.setCurrentUserId(appUser.user_id);
        closetService.syncLocalDataToSupabase(appUser.user_id).catch(() => {});

        toast(`Email confirmed! Welcome to ReApparel, ${appUser.first_name}.`);
        onLoginSuccess(appUser, true);
        return;
      }

      if (pendingPassword) {
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email: pendingEmail,
          password: pendingPassword
        });

        if (!loginErr && loginData?.user) {
          const authUser = loginData.user;
          let appUser = mockDatabase.registerUser({
            user_id: authUser.id,
            email: pendingEmail,
            first_name: pendingFirstName || authUser.user_metadata?.first_name || 'Member',
            last_name: pendingLastName || authUser.user_metadata?.last_name || '',
            password: pendingPassword
          });

          appUser = await ensureUserSyncedToSupabase(appUser);
          mockDatabase.setCurrentUserId(appUser.user_id);
          closetService.syncLocalDataToSupabase(appUser.user_id).catch(() => {});

          toast(`Email confirmed! Welcome to ReApparel, ${appUser.first_name}.`);
          onLoginSuccess(appUser, true);
          return;
        }

        if (pendingUserId?.startsWith('user-preview-') || pendingEmail === 'user@example.com' || loginErr?.message?.toLowerCase().includes('rate limit')) {
          const fallbackUid = (pendingUserId && !pendingUserId.startsWith('user-preview-')) ? pendingUserId : generateUUID();
          let fallbackUser = mockDatabase.registerUser({
            user_id: fallbackUid,
            email: pendingEmail || 'demo.user@example.com',
            first_name: pendingFirstName || 'Alex',
            last_name: pendingLastName || '',
            password: pendingPassword || 'Password123!'
          });
          fallbackUser = await ensureUserSyncedToSupabase(fallbackUser);
          mockDatabase.setCurrentUserId(fallbackUser.user_id);
          closetService.syncLocalDataToSupabase(fallbackUser.user_id).catch(() => {});
          toast(`Email confirmed! Welcome to ReApparel, ${fallbackUser.first_name}.`);
          onLoginSuccess(fallbackUser, true);
          return;
        }

        if (loginErr?.code === 'email_not_confirmed' || loginErr?.message?.toLowerCase().includes('not confirmed')) {
          setErrorMsg('Email has not been confirmed yet. Please click the link inside your email, then click this button again.');
          return;
        }
      }

      setErrorMsg('We have not detected your email confirmation yet. Please click the link in your email.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification check failed. Please check your email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Requests a new verification email confirmation link from Supabase auth
  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMsg('Supabase client is not available.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
        }
      });

      if (error) {
        if (error.status === 429 || error.message?.includes('security purposes') || error.message?.includes('rate limit')) {
          setErrorMsg('For security purposes, please wait a moment before requesting another email.');
          setResendCooldown(45);
        } else {
          setErrorMsg(error.message);
        }
        return;
      }

      setSuccessMsg(`A fresh verification email has been dispatched to ${pendingEmail}.`);
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to resend confirmation email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authMode === 'verify') {
    return (
      <div className="center-shell">
        <div className="card" style={{ maxWidth: 390, width: '100%', padding: '34px 26px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>

          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--primary-soft, rgba(46, 82, 52, 0.08))',
            color: 'var(--primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Mail style={{ width: 22, height: 22 }} />
          </div>

          <h2 style={{ fontSize: 20, margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>
            Check your email
          </h2>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            We sent a verification link to<br />
            <strong style={{ color: 'var(--text)', wordBreak: 'break-all' }}>{pendingEmail}</strong>
          </p>
          <p style={{ margin: '0 0 22px', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Click the link inside your email to activate your account and start using ReApparel.
          </p>

          {errorMsg && (
            <div style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--danger-soft)',
              color: 'var(--danger)',
              fontSize: 12,
              marginBottom: 16,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCheckEmailLink}
            className="btn btn-p"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '10px 14px',
              fontSize: 13.5,
              fontWeight: 600,
              borderRadius: 20
            }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                Checking status...
              </>
            ) : (
              "I've Confirmed My Email"
            )}
          </button>

          <div style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            fontSize: 12.5
          }}>
            <button
              type="button"
              disabled={isSubmitting || resendCooldown > 0}
              onClick={handleResendVerification}
              style={{
                background: 'none',
                border: 'none',
                color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--primary)',
                fontWeight: 500,
                cursor: resendCooldown > 0 ? 'default' : 'pointer',
                padding: 0
              }}
            >
              {resendCooldown > 0 ? `Resend email (${resendCooldown}s)` : 'Resend email'}
            </button>

            <span style={{ color: 'var(--border)' }}>&bull;</span>

            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Back to login
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="center-shell">
      <div className="card" style={{ maxWidth: 440, width: '100%', padding: '28px 24px', boxShadow: 'var(--shadow)' }}>

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
              {authMode === 'login' ? 'Email or Friend Code' : 'Email Address *'}
            </label>
            <input
              type={authMode === 'login' ? 'text' : 'email'}
              placeholder="you@example.com"
              value={emailOrCode}
              onChange={(e) => setEmailOrCode(e.target.value)}
              required
            />
            {authMode === 'register' && (
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                We will send an email confirmation to verify this is your real address.
              </span>
            )}
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={authMode === 'register'}
                minLength={authMode === 'register' ? 8 : undefined}
                style={{ paddingRight: 38 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4
                }}
              >
                {showPassword ? (
                  <EyeOff style={{ width: 17, height: 17 }} />
                ) : (
                  <Eye style={{ width: 17, height: 17 }} />
                )}
              </button>
            </div>
          </div>

          {authMode === 'register' && (
            <div className="field" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Confirm Password *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4
                  }}
                >
                  {showConfirmPassword ? (
                    <EyeOff style={{ width: 17, height: 17 }} />
                  ) : (
                    <Eye style={{ width: 17, height: 17 }} />
                  )}
                </button>
              </div>
            </div>
          )}

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
            {isSubmitting ? (
              <>
                <RefreshCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                {authMode === 'login' ? 'Logging in...' : 'Sending verification email...'}
              </>
            ) : (
              <>
                {authMode === 'login' ? (
                  <>
                    <LogIn style={{ width: 16, height: 16 }} />
                    Log in
                  </>
                ) : (
                  <>
                    <Mail style={{ width: 16, height: 16 }} />
                    Create account &amp; Verify Email
                  </>
                )}
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12.5, color: 'var(--text-muted)' }}>
          {authMode === 'login' ? (
            <>
              New to ReApparel?{' '}
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setErrorMsg(null); setShowPassword(false); setShowConfirmPassword(false); }}
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
                onClick={() => { setAuthMode('login'); setErrorMsg(null); setShowPassword(false); setShowConfirmPassword(false); }}
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
