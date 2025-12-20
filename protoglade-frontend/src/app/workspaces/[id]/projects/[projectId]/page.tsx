'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// This page now redirects to the workspace page with the project selected
// The workspace page handles displaying projects inline
export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const projectId = params.projectId as string;

  useEffect(() => {
    // Redirect to workspace page - the project will need to be selected from sidebar
    // In the future, we could pass the projectId as a query param to auto-select
    router.replace(`/workspaces/${workspaceId}?project=${projectId}`);
  }, [router, workspaceId, projectId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-text-muted)] border-t-transparent" />
    </div>
  );
}
