'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Footer from '@/components/Footer';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--color-text)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[var(--color-text)] tracking-tight">Protoglade</span>
        </div>
        <Link 
          href="/auth/login" 
          className="btn btn-secondary rounded-full"
        >
          Log in
        </Link>
      </header>

      {/* Hero - Centered Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 relative">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-normal text-[var(--color-text)] text-center max-w-3xl leading-tight tracking-tight">
          Protoglade is lightweight project management designed for small dev teams.
        </h1>
        
        <Link 
          href="/auth/login" 
          className="btn btn-primary mt-12 px-8 py-4 rounded-full shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          Go to Dashboard →
        </Link>

        {/* Credit */}
        <div className="absolute bottom-8 right-8 text-sm font-medium text-[var(--color-text)] opacity-80 tracking-wide">
          Made by <span className="font-semibold">Richard Zhang</span>
        </div>
      </main>

      {/* Subtle footer decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-primary)] via-[#FF6B6B] to-[#4ECDC4]" />
      
      <Footer />
    </div>
  );
}
