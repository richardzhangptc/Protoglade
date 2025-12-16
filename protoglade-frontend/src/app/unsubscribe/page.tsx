'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resubscribed'>('loading');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isResubscribing, setIsResubscribing] = useState(false);

  useEffect(() => {
    if (token) {
      handleUnsubscribe();
    } else {
      setStatus('error');
      setError('No unsubscribe token provided');
    }
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    
    try {
      const response = await api.unsubscribe(token);
      setEmail(response.email);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      setStatus('error');
    }
  };

  const handleResubscribe = async () => {
    if (!token) return;
    
    setIsResubscribing(true);
    try {
      const response = await api.resubscribe(token);
      setEmail(response.email);
      setStatus('resubscribed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resubscribe');
    } finally {
      setIsResubscribing(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Unsubscribe Failed</h1>
          <p className="text-[var(--color-text-muted)] mb-6">{error}</p>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'resubscribed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Protoglade
            </h1>
          </div>

          <div className="card text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">You&apos;re Resubscribed!</h2>
            <p className="text-[var(--color-text-muted)] mb-6">
              <strong>{email}</strong> will now receive emails from Protoglade again.
            </p>
            <Link href="/" className="btn btn-primary">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Protoglade
          </h1>
        </div>

        <div className="card text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Unsubscribed Successfully</h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            <strong>{email}</strong> has been unsubscribed from Protoglade emails.
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            You won&apos;t receive any more emails from us. If you change your mind, you can resubscribe below.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleResubscribe}
              disabled={isResubscribing}
              className="btn btn-secondary w-full"
            >
              {isResubscribing ? 'Resubscribing...' : 'Resubscribe to Emails'}
            </button>
            <Link href="/" className="btn btn-ghost w-full block text-center">
              Go Home
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          This action only affects email notifications. You can still use Protoglade normally.
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}

