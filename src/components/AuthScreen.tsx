import React, { useState } from 'react';
import { SparkleIcon } from './icons';
import { signInWithProvider, isSupabaseConfigured, type Provider } from '../lib/supabase';

export const AuthScreen: React.FC = () => {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: Provider) => {
    setError(null);
    setLoading(provider);
    try {
      await signInWithProvider(provider);
      // Page will redirect to OAuth provider — no further action needed
    } catch (err) {
      setError((err as Error).message ?? 'Sign-in failed. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-screen__card">
        <div className="auth-screen__logo">
          <SparkleIcon size={52} />
        </div>

        <h1 className="auth-screen__title">Nova'sChat</h1>
        <p className="auth-screen__subtitle">Sign in to start your conversation</p>

        {!isSupabaseConfigured ? (
          <div className="auth-screen__setup-notice">
            <p className="auth-screen__setup-title">⚙️ Setup required</p>
            <p className="auth-screen__setup-text">
              Add your Supabase credentials to enable sign-in:
            </p>
            <code className="auth-screen__setup-code">
              VITE_SUPABASE_URL<br />
              VITE_SUPABASE_ANON_KEY
            </code>
            <p className="auth-screen__setup-text">
              Create a free project at{' '}
              <a href="https://supabase.com" target="_blank" rel="noreferrer">
                supabase.com
              </a>{' '}
              then add both variables to Vercel → Settings → Environment Variables.
            </p>
          </div>
        ) : (
          <div className="auth-screen__buttons">
            <button
              className="auth-screen__btn auth-screen__btn--google"
              onClick={() => handleSignIn('google')}
              disabled={loading !== null}
              aria-label="Sign in with Google"
            >
              {loading === 'google' ? (
                <span className="auth-screen__spinner" aria-hidden="true" />
              ) : (
                <GoogleIcon />
              )}
              <span>{loading === 'google' ? 'Redirecting…' : 'Continue with Google'}</span>
            </button>

            <button
              className="auth-screen__btn auth-screen__btn--github"
              onClick={() => handleSignIn('github')}
              disabled={loading !== null}
              aria-label="Sign in with GitHub"
            >
              {loading === 'github' ? (
                <span className="auth-screen__spinner" aria-hidden="true" />
              ) : (
                <GitHubIcon />
              )}
              <span>{loading === 'github' ? 'Redirecting…' : 'Continue with GitHub'}</span>
            </button>
          </div>
        )}

        {error && (
          <p className="auth-screen__error" role="alert">{error}</p>
        )}

        <p className="auth-screen__disclaimer">
          Nova'sChat is an independent demo — not affiliated with Google.
        </p>
      </div>
    </div>
  );
};

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

const GoogleIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const GitHubIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);
