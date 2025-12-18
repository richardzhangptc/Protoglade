import Link from 'next/link';
import Footer from '@/components/Footer';

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--color-text)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[var(--color-text)] tracking-tight">Protoglade</span>
          </Link>
          <Link 
            href="/auth/login" 
            className="btn btn-secondary rounded-full"
          >
            Log in
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text)] mb-6">
            Get in Touch
          </h1>
          
          <p className="text-lg text-[var(--color-text-muted)] mb-12">
            Have questions, feedback, or need help? Feel free to reach out to me.
          </p>

          <div className="space-y-8">
            {/* Email */}
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Email</h3>
                  <p className="text-[var(--color-text-muted)] mb-2">
                    For general inquiries and support
                  </p>
                  <a 
                    href="mailto:hello@protoglade.com" 
                    className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors font-medium"
                  >
                    richrdzhangptc@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Support 
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#4ECDC4]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#4ECDC4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Support</h3>
                  <p className="text-[var(--color-text-muted)] mb-2">
                    Need help with your account or have technical issues?
                  </p>
                  <a 
                    href="mailto:support@protoglade.com" 
                    className="text-[#4ECDC4] hover:text-[#3DB5AD] transition-colors font-medium"
                  >
                    support@protoglade.com
                  </a>
                </div>
              </div>
            </div>
            */}
            {/* Community */}
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FF6B6B]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Community</h3>
                  <p className="text-[var(--color-text-muted)] mb-3">
                    Join the Protoglade community to connect with other users and share feedback
                  </p>
                  <div className="flex gap-3">
                    <a 
                      href="https://discord.gg/m5pBv47KCw" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors font-medium"
                    >
                      Discord
                    </a>

                    {/* 
                    <span className="text-[var(--color-border)]">•</span>
                    <a 
                      href="https://twitter.com" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors font-medium"
                    >
                      Twitter
                    </a>
                    <span className="text-[var(--color-border)]">•</span>
                    <a 
                      href="https://github.com" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors font-medium"
                    >
                      GitHub
                    </a>
                    */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Response time note 
          <div className="mt-12 p-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg">
            <p className="text-sm text-[var(--color-text-muted)]">
              💡 We typically respond within 24 hours on business days.
            </p>
          </div>
          */}
        </div>
      </main>

      <Footer />
    </div>
  );
}
