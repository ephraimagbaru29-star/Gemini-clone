import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SparkleIcon } from './icons';

/**
 * Handles the OAuth redirect from Google/GitHub.
 * Supabase auto-detects the tokens in the URL hash/query,
 * establishes the session, then we redirect home.
 */
export const AuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase handles the token exchange automatically via detectSessionInUrl.
    // We just wait for the session to be established then redirect.
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        window.location.replace('/');
      }
      if (event === 'TOKEN_REFRESHED') {
        window.location.replace('/');
      }
    });

    // Fallback: check immediately if session already exists
    supabase.auth.getSession().then(({ data: { session }, error: err }) => {
      if (err) {
        setError(err.message);
        return;
      }
      if (session) {
        window.location.replace('/');
      }
    });

    // Safety timeout — if nothing happens in 8s, show error
    const timer = setTimeout(() => {
      setError('Sign-in timed out. Please try again.');
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div className="auth-callback">
        <div className="auth-callback__card">
          <p className="auth-callback__error" role="alert">⚠ {error}</p>
          <a href="/" className="auth-callback__back-btn">← Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-callback">
      <div className="auth-callback__card">
        <SparkleIcon size={44} />
        <p className="auth-callback__text">Signing you in…</p>
        <div className="auth-callback__dots" aria-hidden="true">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
};
