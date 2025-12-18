import Link from 'next/link';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text)] mb-4">
            Privacy Policy
          </h1>
          
          <p className="text-[var(--color-text-muted)] mb-12">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="prose max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                Introduction
              </h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                Protoglade ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our project management platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                Information We Collect
              </h2>
              <h3 className="text-xl font-semibold text-[var(--color-text)] mb-3 mt-6">
                Personal Information
              </h3>
              <p className="text-[var(--color-text-muted)] mb-3">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 mb-4">
                <li>Name and email address when you create an account</li>
                <li>Workspace and project information you create</li>
                <li>Tasks, comments, and other content you add to the platform</li>
              </ul>

              <h3 className="text-xl font-semibold text-[var(--color-text)] mb-3 mt-6">
                Usage Information
              </h3>
              <p className="text-[var(--color-text-muted)] mb-3">
                We automatically collect certain information about your device and how you interact with our service:
              </p>
              <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 mb-4">
                <li>Log data (IP address, browser type, pages visited)</li>
                <li>Device information (operating system, device identifiers)</li>
                <li>Usage patterns and preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                How We Use Your Information
              </h2>
              <p className="text-[var(--color-text-muted)] mb-3">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 mb-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                Information Sharing and Disclosure
              </h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 mb-4">
                <li><strong className="text-[var(--color-text)]">Within workspaces:</strong> Information you add to shared workspaces is visible to workspace members</li>
                <li><strong className="text-[var(--color-text)]">Service providers:</strong> With vendors who perform services on our behalf</li>
                <li><strong className="text-[var(--color-text)]">Legal requirements:</strong> When required by law or to protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                Data Security
              </h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                Data Retention
              </h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                We retain your information for as long as your account is active or as needed to provide you services. You can request deletion of your account and associated data at any time by contacting richardzhangptc@gmail.com.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                Your Rights
              </h2>
              <p className="text-[var(--color-text-muted)] mb-3">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-2 mb-4">
                <li>Access and receive a copy of your personal data</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                Cookies and Tracking
              </h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                Children's Privacy
              </h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                Our Services are intended for general audiences and are not directed at children. If we become aware that we have collected data without legally valid parental consent from children under an age where such consent is required, we will take reasonable steps to delete it as soon as possible.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                Changes to This Privacy Policy
              </h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
                Contact Us
              </h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <ul className="list-none text-[var(--color-text-muted)] space-y-2">
                <li>Email: <a href="mailto:privacy@protoglade.com" className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">richardzhangptc@gmail.com</a></li>
                <li>Contact page: <Link href="/contact" className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">/contact</Link></li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
