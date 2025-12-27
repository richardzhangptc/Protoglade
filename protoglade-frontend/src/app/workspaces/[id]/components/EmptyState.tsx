interface EmptyStateProps {
  userName?: string;
  userEmail?: string;
}

export function EmptyState({ userName, userEmail }: EmptyStateProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserDisplayName = () => {
    if (userName) return userName;
    if (userEmail) return userEmail.split('@')[0];
    return 'there';
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-light text-[var(--color-text)]">
        {getGreeting()}, <span className="font-medium">{getUserDisplayName()}</span>
      </h1>
      <p className="mt-4 text-[var(--color-text-muted)]">
        Select a project from the sidebar to get started
      </p>
    </main>
  );
}

