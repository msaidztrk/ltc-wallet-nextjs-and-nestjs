"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const router = useRouter();

  // Check if the user is already logged in (Persistent Session)
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const validateInputs = () => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorStatus('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      setErrorStatus('Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorStatus(null);

    if (!validateInputs()) {
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorStatus(error.message);
    } else {
      localStorage.setItem('savedEmail', email);
      router.push('/dashboard');
    }

    setIsLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorStatus('Şifre sıfırlama için önce geçerli bir email giriniz.');
      return;
    }
    setIsLoading(true);
    setErrorStatus(null);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    
    if (error) {
      setErrorStatus(error.message);
    } else {
      setErrorStatus('Şifre sıfırlama bağlantısı email adresinize gönderildi.');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorStatus(null);

    if (!validateInputs()) {
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorStatus(error.message);
    } else {
      setErrorStatus("Success! Check your email to verify your account.");
    }

    setIsLoading(false);
  };

  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', padding: '1rem' }}>
      <div className="glass-container" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            Wallut<span style={{ color: 'var(--primary-accent)' }}>.</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Secure Litecoin Cold Storage
          </p>
        </div>

        <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="text-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input-premium"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="text-label" htmlFor="password">Master Password</label>
              <button 
                type="button" 
                onClick={handleResetPassword}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
              >
                Şifremi Unuttum
              </button>
            </div>
            <input
              id="password"
              type="password"
              className="input-premium"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorStatus && (
            <div style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(255, 60, 60, 0.1)', border: '1px solid rgba(255, 60, 60, 0.2)', color: '#ff6b6b', fontSize: '0.85rem', textAlign: 'center' }}>
              {errorStatus}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSignIn}
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Authorizing...' : 'Enter Wallut'}
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }}
              className="btn-primary"
              disabled={isLoading}
            >
              Initialize New Identity
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
              ⚠️ Supabase güvenlik politikası gereği 1 saat içerisinde en fazla 3 kayıt işlemi yapılabilir.
            </p>
          </div>
        </form>

      </div>
    </main>
  );
}
