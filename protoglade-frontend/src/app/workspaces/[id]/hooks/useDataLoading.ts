import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Workspace, Project, Invitation, Task, KanbanColumn, WhiteboardShape, WhiteboardText, WhiteboardStickyNote, WhiteboardStroke } from '@/types';
import { api } from '@/lib/api';
import { RemoteStroke } from './useWhiteboardPageState';

export interface UseDataLoadingOptions {
  workspaceId: string;
  setWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setInvitations: React.Dispatch<React.SetStateAction<Invitation[]>>;
  setAllWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>;
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLoadingProject: React.Dispatch<React.SetStateAction<boolean>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>;
  setStrokes: React.Dispatch<React.SetStateAction<WhiteboardStroke[]>>;
  setShapes: React.Dispatch<React.SetStateAction<WhiteboardShape[]>>;
  setTexts: React.Dispatch<React.SetStateAction<WhiteboardText[]>>;
  setStickyNotes: React.Dispatch<React.SetStateAction<WhiteboardStickyNote[]>>;
  setRemoteStrokes: React.Dispatch<React.SetStateAction<Map<string, RemoteStroke>>>;
}

export function useDataLoading({
  workspaceId,
  setWorkspace,
  setProjects,
  setInvitations,
  setAllWorkspaces,
  setIsLoading,
  setSelectedProject,
  setSelectedProjectId,
  setIsLoadingProject,
  setTasks,
  setColumns,
  setStrokes,
  setShapes,
  setTexts,
  setStickyNotes,
  setRemoteStrokes,
}: UseDataLoadingOptions) {
  const router = useRouter();

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [workspaceData, projectsData, invitationsData, workspacesData] = await Promise.all([
        api.getWorkspace(workspaceId),
        api.getProjects(workspaceId),
        api.getWorkspaceInvitations(workspaceId).catch(() => []),
        api.getWorkspaces(),
      ]);
      setWorkspace(workspaceData);
      setProjects(projectsData);
      setInvitations(invitationsData);
      setAllWorkspaces(workspacesData);
    } catch (error) {
      console.error('Failed to load workspace:', error);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, setWorkspace, setProjects, setInvitations, setAllWorkspaces, setIsLoading, router]);

  const loadProjectData = useCallback(async (projectId: string) => {
    setIsLoadingProject(true);
    try {
      const projectData = await api.getProject(projectId);
      setSelectedProject(projectData);

      if (projectData.type === 'whiteboard') {
        // Load whiteboard strokes and elements
        const [strokesData, elementsData] = await Promise.all([
          api.getWhiteboardStrokes(projectId),
          api.getWhiteboardElements(projectId).catch(() => ({ shapes: [], texts: [], stickyNotes: [] })),
        ]);
        setStrokes(strokesData);
        setShapes(elementsData.shapes);
        setTexts(elementsData.texts);
        setStickyNotes(elementsData.stickyNotes || []);
        setTasks([]);
        setColumns([]);
        setRemoteStrokes(new Map());
      } else {
        // Load kanban data
        const [tasksData, columnsData] = await Promise.all([
          api.getTasks(projectId),
          api.getColumns(projectId),
        ]);
        setTasks(tasksData);
        setColumns(columnsData.sort((a, b) => a.position - b.position));
        setStrokes([]);
        setShapes([]);
        setTexts([]);
        setStickyNotes([]);
        setRemoteStrokes(new Map());
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      setSelectedProjectId(null);
    } finally {
      setIsLoadingProject(false);
    }
  }, [
    setIsLoadingProject,
    setSelectedProject,
    setSelectedProjectId,
    setTasks,
    setColumns,
    setStrokes,
    setShapes,
    setTexts,
    setStickyNotes,
    setRemoteStrokes,
  ]);

  return {
    loadWorkspaceData,
    loadProjectData,
  };
}
