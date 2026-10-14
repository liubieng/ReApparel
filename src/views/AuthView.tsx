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
import { mockDatabase, getSupabase } from '../services/supabaseClient';

/**
 * ============================================================================
 * AUTHENTICATION VIEW (AuthView.tsx)
 * ============================================================================
 * 
 * CAPSTONE CONTEXT:
 * - Implements verified email authentication using Supabase Auth to guarantee
 *   that every registered email address is authentic and deliverable.
 * - Supports 6-digit OTP verification codes and one-click email confirmation links.
 * - Provides graceful fallback to presentation accounts (e.g. Elena Vance)
 *   and Friend Code logins for capstone defense demonstrations.
 */

interface AuthViewProps {
  onLoginSuccess: (user: User, isNewUser: boolean) => void;
  toast: (message: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, toast }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>('login');
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

  // Email Verification State
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [pendingFirstName, setPendingFirstName] = useState('');
  const [pendingLastName, setPendingLastName] = useState('');
  const [, setPendingUserId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Primary Login & Registration Form Submission Handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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
        const supabase = getSupabase();

        // 1. If identifier is an email and Supabase is configured, authenticate via Supabase Auth
        if (!isFriendCode && supabase) {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: identifier.toLowerCase(),
            password: pwd
          });

          // Check if Supabase rejected because email is not confirmed
          if (authError) {
            const isUnconfirmed = 
              authError.code === 'email_not_confirmed' || 
              authError.message?.toLowerCase().includes('email not confirmed');

            if (isUnconfirmed) {
              setPendingEmail(identifier.toLowerCase());
              setPendingPassword(pwd);
              setResendCooldown(0);
              setAuthMode('verify');
              setErrorMsg('Your email address has not been verified yet. Please check your inbox for the confirmation email or enter the 6-digit code below.');
              return;
            }

            // If Supabase rejected for invalid credentials, check if this is an existing demo account (e.g. Elena Vance)
            const localResult = mockDatabase.authenticateUser(identifier, pwd);
            if (localResult.user) {
              toast(`Welcome back, ${localResult.user.first_name}!`);
              onLoginSuccess(localResult.user, false);
              return;
            }

            // Check if user exists in public.users table (legacy account created before Supabase Auth was enforced)
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
            } catch {}

            setErrorMsg('The login credentials are invalid. Please check your password.');
            return;
          }

          if (authData.user) {
            const authUser = authData.user;
            let appUser = mockDatabase.findUserByIdentifier(authUser.email || authUser.id);

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
              } catch {}
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

              try {
                await supabase.from('users').upsert({
                  user_id: appUser.user_id,
                  email: appUser.email,
                  first_name: appUser.first_name,
                  last_name: appUser.last_name,
                  friend_code: appUser.friend_code,
                  password: pwd,
                  created_at: appUser.created_at
                });
              } catch {}
            } else {
              if (pwd && !appUser.password) appUser.password = pwd;
              mockDatabase.upsertUser(appUser);
              mockDatabase.setCurrentUserId(appUser.user_id);
            }

            toast(`Welcome back, ${appUser.first_name}!`);
            onLoginSuccess(appUser, false);
            return;
          }
        }

        // 2. Friend Code or Local Demo Access Fallback
        const authResult = mockDatabase.authenticateUser(identifier, pwd);
        let user = authResult.user;

        // TC_LOGIN_05: Incorrect password (local match, wrong password)
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
          } catch {}
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

      // Validate password confirmation match
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please verify your confirmation password.');
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

      // Check if email already registered locally
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

        // Register user via Supabase Auth — Supabase dispatches a confirmation email to the address!
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
          setErrorMsg(signUpError.message);
          return;
        }

        // Supabase returns user with empty identities when the email is already in auth.users
        if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
          setErrorMsg(`An account with the email "${trimmedEmail}" already exists. Please sign in instead.`);
          return;
        }

        // Account registered and confirmation email sent!
        setPendingEmail(trimmedEmail);
        setPendingPassword(password);
        setPendingFirstName(trimmedFirst);
        setPendingLastName(trimmedLast);
        setPendingUserId(signUpData.user?.id || null);
        setResendCooldown(60);
        setOtpCode('');
        setSuccessMsg(`Verification email dispatched to ${trimmedEmail}! Please check your inbox or spam folder for your confirmation code and link.`);
        setAuthMode('verify');
      } catch (err: any) {
        setErrorMsg(err?.message || 'Registration failed. Please check your details and try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Handler for OTP Verification Code Submission
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const code = otpCode.trim();
    if (!code) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    if (code.length < 6) {
      setErrorMsg('Verification code must contain 6 digits.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMsg('Database connection unavailable. Please check your network.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify OTP with Supabase Auth (type: 'signup')
      let { data, error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: code,
        type: 'signup'
      });

      // Fallback: If 'signup' fails, attempt 'email' type
      if (error && (error.message?.toLowerCase().includes('token') || error.message?.toLowerCase().includes('invalid') || error.message?.toLowerCase().includes('expired'))) {
        const fallback = await supabase.auth.verifyOtp({
          email: pendingEmail,
          token: code,
          type: 'email'
        });
        if (!fallback.error) {
          data = fallback.data;
          error = null;
        }
      }

      if (error) {
        setErrorMsg(error.message || 'The verification code is invalid or has expired. Please try again or request a new one.');
        return;
      }

      const authUser = data.user;
      if (authUser) {
        const finalFirst = pendingFirstName || authUser.user_metadata?.first_name || 'Member';
        const finalLast = pendingLastName || authUser.user_metadata?.last_name || '';

        // Register and sync in local mock store
        const appUser = mockDatabase.registerUser({
          user_id: authUser.id,
          email: pendingEmail,
          first_name: finalFirst,
          last_name: finalLast,
          password: pendingPassword
        });

        // Persist to public.users table in Supabase
        try {
          await supabase.from('users').upsert({
            user_id: appUser.user_id,
            email: appUser.email,
            first_name: appUser.first_name,
            last_name: appUser.last_name,
            friend_code: appUser.friend_code,
            password: pendingPassword,
            created_at: appUser.created_at
          });
        } catch (syncErr) {
          console.warn('Could not sync verified user to public.users:', syncErr);
        }

        toast(`Email verified successfully! Welcome to ReApparel, ${appUser.first_name}.`);
        onLoginSuccess(appUser, true);
      } else {
        setErrorMsg('Verification successful! Please log in with your credentials.');
        setAuthMode('login');
        setEmailOrCode(pendingEmail);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Checking Email Link Confirmation Status
  const handleCheckEmailLink = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // 1. Check if Supabase session is already hydrated
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user && sessionData.session.user.email?.toLowerCase() === pendingEmail.toLowerCase()) {
        const authUser = sessionData.session.user;
        const appUser = mockDatabase.registerUser({
          user_id: authUser.id,
          email: pendingEmail,
          first_name: pendingFirstName || authUser.user_metadata?.first_name || 'Member',
          last_name: pendingLastName || authUser.user_metadata?.last_name || '',
          password: pendingPassword
        });

        try {
          await supabase.from('users').upsert({
            user_id: appUser.user_id,
            email: appUser.email,
            first_name: appUser.first_name,
            last_name: appUser.last_name,
            friend_code: appUser.friend_code,
            created_at: appUser.created_at
          });
        } catch {}

        toast(`Email confirmed! Welcome to ReApparel, ${appUser.first_name}.`);
        onLoginSuccess(appUser, true);
        return;
      }

      // 2. Try sign in with stored pending password
      if (pendingPassword) {
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email: pendingEmail,
          password: pendingPassword
        });

        if (!loginErr && loginData?.user) {
          const authUser = loginData.user;
          const appUser = mockDatabase.registerUser({
            user_id: authUser.id,
            email: pendingEmail,
            first_name: pendingFirstName || authUser.user_metadata?.first_name || 'Member',
            last_name: pendingLastName || authUser.user_metadata?.last_name || '',
            password: pendingPassword
          });

          try {
            await supabase.from('users').upsert({
              user_id: appUser.user_id,
              email: appUser.email,
              first_name: appUser.first_name,
              last_name: appUser.last_name,
              friend_code: appUser.friend_code,
              created_at: appUser.created_at
            });
          } catch {}

          toast(`Email confirmed! Welcome to ReApparel, ${appUser.first_name}.`);
          onLoginSuccess(appUser, true);
          return;
        }

        if (loginErr?.code === 'email_not_confirmed' || loginErr?.message?.toLowerCase().includes('not confirmed')) {
          setErrorMsg('Email has not been confirmed yet. Please click the link in your email or enter the 6-digit code above.');
          return;
        }
      }

      setErrorMsg('We have not detected your email confirmation yet. Please click the link in your email or enter the 6-digit code.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification check failed. Please enter the 6-digit code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Resending Verification Email
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

  // --------------------------------------------------------------------------
  // RENDER: EMAIL VERIFICATION VIEW (authMode === 'verify')
  // --------------------------------------------------------------------------
  if (authMode === 'verify') {
    return (
      <div className="center-shell">
        <div className="card" style={{ maxWidth: 460, width: '100%', padding: '32px 26px', boxShadow: 'var(--shadow)' }}>
          
          {/* Header Badge */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--primary-soft, rgba(5, 150, 105, 0.12))',
              color: 'var(--primary)',
              marginBottom: 12
            }}>
              <MailCheck style={{ width: 28, height: 28 }} />
            </div>
            <h1 style={{ fontSize: 22, margin: '0 0 6px', fontFamily: 'var(--font-display)' }}>
              Verify Your Email
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              We sent a verification email to:
            </p>
            <div style={{
              marginTop: 4,
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--text)',
              wordBreak: 'break-all'
            }}>
              {pendingEmail}
            </div>
          </div>

          {/* Success Message Alert */}
          {successMsg && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              fontSize: 12.5,
              marginBottom: 16,
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8
            }}>
              <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--danger-soft)',
              color: 'var(--danger)',
              fontSize: 12.5,
              marginBottom: 16,
              border: '1px solid var(--danger)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8
            }}>
              <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* OTP Code Form */}
          <form onSubmit={handleVerifyOtp} noValidate>
            <div className="field" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                6-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                style={{
                  textAlign: 'center',
                  fontSize: 22,
                  letterSpacing: '0.3em',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  padding: '10px 14px'
                }}
                autoFocus
              />
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Enter the 6-digit confirmation code included in your email.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otpCode.trim().length < 6}
              className="btn btn-p"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '10px 14px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 20,
                marginTop: 6
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  Verifying code...
                </>
              ) : (
                <>
                  <ShieldCheck style={{ width: 16, height: 16 }} />
                  Verify Code &amp; Continue
                </>
              )}
            </button>
          </form>

          {/* Alternate Confirmation: Email Link Checker */}
          <div style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 12.5, color: 'var(--text-muted)' }}>
              Or if you clicked the confirmation link in your email:
            </p>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCheckEmailLink}
              className="btn btn-s"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 20
              }}
            >
              <CheckCircle2 style={{ width: 15, height: 15 }} />
              I&apos;ve Confirmed via Link &mdash; Check Status
            </button>
          </div>

          {/* Resend Verification Email Section */}
          <div style={{
            marginTop: 18,
            padding: '12px 14px',
            borderRadius: 8,
            background: 'var(--surface-2, rgba(0, 0, 0, 0.02))',
            border: '1px solid var(--border)',
            textAlign: 'center',
            fontSize: 12.5
          }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
              Didn&apos;t receive the email? Check your spam/junk folder.
            </div>
            <button
              type="button"
              disabled={isSubmitting || resendCooldown > 0}
              onClick={handleResendVerification}
              style={{
                background: 'none',
                border: 'none',
                color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--primary)',
                fontWeight: 600,
                cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                padding: 0,
                textDecoration: resendCooldown > 0 ? 'none' : 'underline',
                fontSize: 12.5
              }}
            >
              {resendCooldown > 0 ? `Resend email available in ${resendCooldown}s` : 'Resend Verification Email'}
            </button>
          </div>

          {/* Back to Login / Change Email */}
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
                setOtpCode('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Back to Login / Change Email
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: LOGIN & REGISTRATION VIEW (authMode === 'login' | 'register')
  // --------------------------------------------------------------------------
  return (
    <div className="center-shell">
      <div className="card" style={{ maxWidth: 440, width: '100%', padding: '28px 24px', boxShadow: 'var(--shadow)' }}>
        
        {/* Branding & Identity */}
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

        {/* Switch mode link */}
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
