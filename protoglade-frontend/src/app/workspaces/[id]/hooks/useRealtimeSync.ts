import { useCallback } from 'react';
import { Task, KanbanColumn, WhiteboardStroke, WhiteboardPoint } from '@/types';
import {
  usePresence,
  TaskSyncEvent,
  TaskDeleteEvent,
  ColumnSyncEvent,
  ColumnDeleteEvent,
  ColumnsReorderedEvent,
  StrokeStartEvent,
  StrokePointEvent,
  StrokeEndEvent,
  StrokeUndoEvent,
  CanvasClearEvent,
} from '@/hooks/usePresence';
import { RemoteStroke } from './useWhiteboardPageState';

export interface UseRealtimeSyncOptions {
  selectedProjectId: string | null;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setSelectedTask: React.Dispatch<React.SetStateAction<Task | null>>;
  setColumns: React.Dispatch<React.SetStateAction<KanbanColumn[]>>;
  setStrokes: React.Dispatch<React.SetStateAction<WhiteboardStroke[]>>;
  setRemoteStrokes: React.Dispatch<React.SetStateAction<Map<string, RemoteStroke>>>;
}

export function useRealtimeSync({
  selectedProjectId,
  setTasks,
  setSelectedTask,
  setColumns,
  setStrokes,
  setRemoteStrokes,
}: UseRealtimeSyncOptions) {
  // Task sync handlers
  const handleRemoteTaskCreated = useCallback((event: TaskSyncEvent) => {
    setTasks((prev) => {
      if (prev.some((t) => t.id === event.task.id)) {
        return prev;
      }
      return [...prev, event.task];
    });
  }, [setTasks]);

  const handleRemoteTaskUpdated = useCallback((event: TaskSyncEvent) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === event.task.id ? event.task : t))
    );
    setSelectedTask((prev) =>
      prev?.id === event.task.id ? event.task : prev
    );
  }, [setTasks, setSelectedTask]);

  const handleRemoteTaskDeleted = useCallback((event: TaskDeleteEvent) => {
    setTasks((prev) => prev.filter((t) => t.id !== event.taskId));
    setSelectedTask((prev) => (prev?.id === event.taskId ? null : prev));
  }, [setTasks, setSelectedTask]);

  // Column sync handlers
  const handleRemoteColumnCreated = useCallback((event: ColumnSyncEvent) => {
    setColumns((prev) => {
      if (prev.some((c) => c.id === event.column.id)) {
        return prev;
      }
      return [...prev, event.column].sort((a, b) => a.position - b.position);
    });
  }, [setColumns]);

  const handleRemoteColumnUpdated = useCallback((event: ColumnSyncEvent) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === event.column.id ? event.column : c))
    );
  }, [setColumns]);

  const handleRemoteColumnDeleted = useCallback((event: ColumnDeleteEvent) => {
    setColumns((prev) => prev.filter((c) => c.id !== event.columnId));
  }, [setColumns]);

  const handleRemoteColumnsReordered = useCallback((event: ColumnsReorderedEvent) => {
    setColumns(event.columns.sort((a, b) => a.position - b.position));
  }, [setColumns]);

  // Whiteboard stroke sync handlers
  const handleRemoteStrokeStart = useCallback((event: StrokeStartEvent) => {
    setRemoteStrokes((prev) => {
      const next = new Map(prev);
      next.set(event.strokeId, {
        id: event.strokeId,
        points: [event.point],
        color: event.color,
        size: event.size,
        userId: event.userId,
      });
      return next;
    });
  }, [setRemoteStrokes]);

  const handleRemoteStrokePoint = useCallback((event: StrokePointEvent) => {
    setRemoteStrokes((prev) => {
      const stroke = prev.get(event.strokeId);
      if (!stroke) return prev;
      const next = new Map(prev);
      next.set(event.strokeId, {
        ...stroke,
        points: [...stroke.points, event.point],
      });
      return next;
    });
  }, [setRemoteStrokes]);

  const handleRemoteStrokeEnd = useCallback((event: StrokeEndEvent) => {
    // Remove from remote strokes
    setRemoteStrokes((prev) => {
      const next = new Map(prev);
      next.delete(event.strokeId);
      return next;
    });
    // Add to saved strokes
    setStrokes((prev) => {
      // Defensive: avoid duplicating strokes if we ever receive the same event twice,
      // or if the stroke was already loaded/persisted elsewhere.
      if (prev.some((s) => s.id === event.strokeId)) return prev;
      return [
        ...prev,
        {
          id: event.strokeId,
          points: event.points,
          color: event.color,
          size: event.size,
          zIndex: event.zIndex ?? 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: event.userId,
          projectId: event.projectId,
        },
      ];
    });
  }, [setRemoteStrokes, setStrokes]);

  const handleRemoteStrokeUndo = useCallback((event: StrokeUndoEvent) => {
    setStrokes((prev) => prev.filter((s) => s.id !== event.strokeId));
  }, [setStrokes]);

  const handleRemoteCanvasClear = useCallback((_event: CanvasClearEvent) => {
    setStrokes([]);
    setRemoteStrokes(new Map());
  }, [setStrokes, setRemoteStrokes]);

  // Real-time presence and task sync
  const presence = usePresence(selectedProjectId, {
    onTaskCreated: handleRemoteTaskCreated,
    onTaskUpdated: handleRemoteTaskUpdated,
    onTaskDeleted: handleRemoteTaskDeleted,
    onColumnCreated: handleRemoteColumnCreated,
    onColumnUpdated: handleRemoteColumnUpdated,
    onColumnDeleted: handleRemoteColumnDeleted,
    onColumnsReordered: handleRemoteColumnsReordered,
    onStrokeStart: handleRemoteStrokeStart,
    onStrokePoint: handleRemoteStrokePoint,
    onStrokeEnd: handleRemoteStrokeEnd,
    onStrokeUndo: handleRemoteStrokeUndo,
    onCanvasClear: handleRemoteCanvasClear,
  });

  return presence;
}

export type RealtimeSync = ReturnType<typeof useRealtimeSync>;
