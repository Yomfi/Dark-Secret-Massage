import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Alert, Button } from '../components/ui';

type State = 'missing' | 'pending' | 'verified' | 'failed' | 'inbox';
type ResendState = {
  status: 'idle' | 'sending' | 'sent' | 'error';
  message?: string;
  demoToken?: string;
};

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshSession, isAuthenticated } = useAuth();
  const token = params.get('token') || '';
  const sentParam = params.get('sent');

  const [state, setState] = useState<State>(
    token ? 'pending' : sentParam !== null ? 'inbox' : 'missing',
  );
  const [error, setError] = useState<string | null>(null);
  const [resend, setResend] = useState<ResendState>({ status: 'idle' });
  const attempted = useRef(false);

  useEffect(() => {
    document.title = 'Confirm email — Massager Studio';
  }, []);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    authApi
      .verifyEmail(token)
      .then(() => setState('verified'))
      .catch((err) => {
        setError(getAuthErrorMessage(err));
        setState('failed');
      });
  }, [token]);

  const onResend = async () => {
    setError(null);
    setResend({ status: 'sending' });
    try {
      const res = await authApi.resendVerification();
      if (res.alreadyVerified) {
        setResend({ status: 'sent', message: res.message });
        await refreshSession();
        return;
      }
      setResend({ status: 'sent', message: res.message, demoToken: res.demoToken });
    } catch (err) {
      setResend({ status: 'error', message: getAuthErrorMessage(err) });
    }
  };

  const onContinue = async () => {
    setError(null);
    try {
      const data = await authApi.me();
      await refreshSession();
      if (data.user.emailVerifiedAt) {
        navigate('/onboarding', { replace: true });
        return;
      }
      setError(
        'We have not seen your confirmation yet. Open the link in your email, then check again.',
      );
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  if (state === 'pending') {
    return (
      <AuthLayout title="Confirming your email" description="This only takes a moment.">
        <Alert variant="info">Checking your confirmation link…</Alert>
      </AuthLayout>
    );
  }

  if (state === 'inbox') {
    return (
      <AuthLayout
        title="Confirm your email"
        description="We use email to confirm your account and to send booking and account notices."
        footer={
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center font-semibold text-brand-gold-light hover:text-brand-gold"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4">
          <Alert variant={sentParam === '1' ? 'success' : 'warning'} title="Check your inbox">
            {sentParam === '1'
              ? `We sent a single-use confirmation link to ${user?.email || 'your email address'}. It expires in 24 hours.`
              : `Email delivery is not available in this environment yet, so no message was sent to ${
                  user?.email || 'your address'
                }. Ask an administrator to finish the mail configuration, then resend.`}
          </Alert>

          <p className="text-[13px] leading-relaxed text-zinc-500">
            The link can be used once. Open it in this browser to confirm, then return here.
          </p>

          {resend.status === 'sent' && resend.message ? (
            <Alert variant="success">{resend.message}</Alert>
          ) : null}
          {resend.status === 'error' && resend.message ? (
            <Alert variant="error">{resend.message}</Alert>
          ) : null}
          {resend.demoToken ? (
            <Alert variant="warning" title="Demo mode (email delivery not configured)">
              <span className="break-all">{resend.demoToken}</span>
            </Alert>
          ) : null}
          {error ? <Alert variant="error">{error}</Alert> : null}

          {isAuthenticated ? (
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button
                onClick={onContinue}
                loading={false}
                className="w-full sm:w-auto"
              >
                I&apos;ve confirmed my email
              </Button>
              <Button
                variant="secondary"
                onClick={onResend}
                loading={resend.status === 'sending'}
                loadingLabel="Sending"
                className="w-full sm:w-auto"
              >
                Resend email
              </Button>
            </div>
          ) : (
            <Button fullWidth onClick={() => navigate('/login')}>
              Sign in to resend
            </Button>
          )}
        </div>
      </AuthLayout>
    );
  }

  if (state === 'verified') {
    return (
      <AuthLayout
        title="Email confirmed"
        description="Your Massager Studio email address is verified. You can continue where you left off."
        footer={
          <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-brand-gold-light hover:text-brand-gold">
            Back to home
          </Link>
        }
      >
        {isAuthenticated ? (
          <Button fullWidth onClick={() => navigate('/onboarding', { replace: true })}>
            Continue
          </Button>
        ) : (
          <Button
            fullWidth
            onClick={() => {
              window.location.href = '/login';
            }}
          >
            Sign in
          </Button>
        )}
      </AuthLayout>
    );
  }

  if (state === 'failed') {
    return (
      <AuthLayout
        title="Link could not be used"
        description="Sign in to request a new confirmation email. Links expire after 24 hours and can only be used once."
        footer={
          <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-gold-light hover:text-brand-gold">
            Back to sign in
          </Link>
        }
      >
        <Alert variant="error">
          {error || 'This confirmation link is invalid or has expired.'}
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Confirmation link incomplete"
      description="This page needs the token from your verification email."
      footer={
        <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-gold-light hover:text-brand-gold">
          Back to sign in
        </Link>
      }
    >
      <Alert variant="warning">Open the link in your confirmation email to verify your address.</Alert>
    </AuthLayout>
  );
};
