import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      if (!supabase) {
        setError('Supabase not configured');
        return;
      }

      // Get the auth code from the URL hash or query params
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        setError(error.message);
        return;
      }

      if (data.session) {
        // Session exists, redirect to home
        navigate('/');
      } else {
        // No session, redirect to landing
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-mc-darker flex items-center justify-center">
        <div className="mc-card p-8 max-w-md text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-mc-text mb-2">Authentication Error</h1>
          <p className="text-mc-text-muted mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-mc-accent text-white font-bold rounded hover:bg-mc-accent-hover transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mc-darker flex items-center justify-center">
      <div className="mc-card p-8 max-w-md text-center">
        <div className="animate-spin text-4xl mb-4">⚙️</div>
        <h1 className="text-xl font-bold text-mc-text mb-2">Completing Login...</h1>
        <p className="text-mc-text-muted">Please wait while we verify your account.</p>
      </div>
    </div>
  );
}
