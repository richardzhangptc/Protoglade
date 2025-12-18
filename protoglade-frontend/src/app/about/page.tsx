import Link from 'next/link';
import Footer from '@/components/Footer';

export default function AboutPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text)] mb-6">
            About Protoglade
          </h1>
          
          <div className="prose max-w-none">
            <p className="text-lg text-[var(--color-text-muted)] mb-8">
              Protoglade is lightweight project management created by Richard Zhang for small dev teams who need to move fast without the overhead of complex tools.
            </p>

            {/* 
            <h2 className="text-2xl font-bold text-[var(--color-text)] mt-12 mb-4">
              Mission
            </h2>
            <p className="text-[var(--color-text-muted)] mb-6">
              We believe that project management shouldn't slow you down. Most tools are bloated with features that small teams never use. Protoglade focuses on the essentials: workspaces, projects, tasks, and collaboration.
            </p>
            */}

            <h2 className="text-2xl font-bold text-[var(--color-text)] mt-12 mb-4">
              Features
            </h2>
            {/* 
            <p className="text-[var(--color-text-muted)] mb-6">
              We understand how developers work. That's why Protoglade offers:
            </p>
            */}
            <ul className="list-disc list-inside text-[var(--color-text-muted)] mb-6 space-y-2">
              <li>Clean, distraction-free interface</li>
              <li>Kanban boards with drag-and-drop</li>
              <li>Easy email invites for external collaborators</li>
              <li>Role based permissions for owners, admins, and members</li>
            </ul>

            <div className="mt-12 card">
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">
                Ready to get started?
              </h3>
              <Link 
                href="/auth/register" 
                className="btn btn-primary rounded-full"
              >
                Get Started Free →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
