'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import throttle from 'lodash.throttle';
import { api } from '@/lib/api';
import { Task, KanbanColumn, WhiteboardPoint } from '@/types';

export interface OnlineUser {
  id: string;
  email: string;
  name: string | null;
  color: string;
}

export interface TaskSyncEvent {
  projectId: string;
  task: Task;
  createdBy?: OnlineUser;
  updatedBy?: OnlineUser;
}

export interface TaskDeleteEvent {
  projectId: string;
  taskId: string;
  deletedBy?: OnlineUser;
}

export interface ColumnSyncEvent {
  projectId: string;
  column: KanbanColumn;
  createdBy?: OnlineUser;
  updatedBy?: OnlineUser;
}

export interface ColumnDeleteEvent {
  projectId: string;
  columnId: string;
  deletedBy?: OnlineUser;
}

export interface ColumnsReorderedEvent {
  projectId: string;
  columns: KanbanColumn[];
  reorderedBy?: OnlineUser;
}

// Whiteboard stroke events
export interface StrokeStartEvent {
  projectId: string;
  strokeId: string;
  userId: string;
  point: WhiteboardPoint;
  color: string;
  size: number;
}

export interface StrokePointEvent {
  projectId: string;
  strokeId: string;
  userId: string;
  point: WhiteboardPoint;
}

export interface StrokeEndEvent {
  projectId: string;
  strokeId: string;
  userId: string;
  points: WhiteboardPoint[];
  color: string;
  size: number;
}

export interface StrokeUndoEvent {
  projectId: string;
  strokeId: string;
  userId: string;
}

export interface CanvasClearEvent {
  projectId: string;
  userId: string;
}

export interface RemoteCursor {
  odataId: string;
  user: OnlineUser;
  x: number;
  y: number;
  isDragging: boolean;
  dragTaskId: string | null;
  dragTaskTitle: string | null;
  lastUpdate: number;
}

interface CursorMoveEvent {
  odataId: string;
  user: OnlineUser;
  x: number;
  y: number;
  isDragging: boolean;
  dragTaskId: string | null;
  dragTaskTitle: string | null;
}

interface CursorLeaveEvent {
  odataId: string;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const CURSOR_THROTTLE_MS = 50; // 20 updates per second max
const CURSOR_TIMEOUT_MS = 5000; // Remove cursor if no update for 5 seconds

interface UsePresenceOptions {
  onTaskCreated?: (event: TaskSyncEvent) => void;
  onTaskUpdated?: (event: TaskSyncEvent) => void;
  onTaskDeleted?: (event: TaskDeleteEvent) => void;
  onColumnCreated?: (event: ColumnSyncEvent) => void;
  onColumnUpdated?: (event: ColumnSyncEvent) => void;
  onColumnDeleted?: (event: ColumnDeleteEvent) => void;
  onColumnsReordered?: (event: ColumnsReorderedEvent) => void;
  // Whiteboard events
  onStrokeStart?: (event: StrokeStartEvent) => void;
  onStrokePoint?: (event: StrokePointEvent) => void;
  onStrokeEnd?: (event: StrokeEndEvent) => void;
  onStrokeUndo?: (event: StrokeUndoEvent) => void;
  onCanvasClear?: (event: CanvasClearEvent) => void;
}

export function usePresence(projectId: string | null, options?: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const currentProjectIdRef = useRef<string | null>(null);
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    const token = api.getToken();
    if (!token) {
      console.log('No token available for WebSocket connection');
      return null;
    }

    const socket = io(`${SOCKET_URL}/presence`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Rejoin the current project if we had one
      if (currentProjectIdRef.current) {
        socket.emit('presence:join', { projectId: currentProjectIdRef.current });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      setRemoteCursors(new Map()); // Clear cursors on disconnect
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setIsConnected(false);
    });

    // Presence events
    socket.on('presence:update', (data: { projectId: string; users: OnlineUser[] }) => {
      if (data.projectId === currentProjectIdRef.current) {
        setOnlineUsers(data.users);
      }
    });

    // Task sync events
    socket.on('task:created', (event: TaskSyncEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        console.log('Received task:created event', event);
        optionsRef.current?.onTaskCreated?.(event);
      }
    });

    socket.on('task:updated', (event: TaskSyncEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        console.log('Received task:updated event', event);
        optionsRef.current?.onTaskUpdated?.(event);
      }
    });

    socket.on('task:deleted', (event: TaskDeleteEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        console.log('Received task:deleted event', event);
        optionsRef.current?.onTaskDeleted?.(event);
      }
    });

    // Column sync events
    socket.on('column:created', (event: ColumnSyncEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        console.log('Received column:created event', event);
        optionsRef.current?.onColumnCreated?.(event);
      }
    });

    socket.on('column:updated', (event: ColumnSyncEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        console.log('Received column:updated event', event);
        optionsRef.current?.onColumnUpdated?.(event);
      }
    });

    socket.on('column:deleted', (event: ColumnDeleteEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        console.log('Received column:deleted event', event);
        optionsRef.current?.onColumnDeleted?.(event);
      }
    });

    socket.on('column:reordered', (event: ColumnsReorderedEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        console.log('Received column:reordered event', event);
        optionsRef.current?.onColumnsReordered?.(event);
      }
    });

    // Cursor events
    socket.on('cursor:move', (event: CursorMoveEvent) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(event.odataId, {
          ...event,
          lastUpdate: Date.now(),
        });
        return next;
      });
    });

    socket.on('cursor:leave', (event: CursorLeaveEvent) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(event.odataId);
        return next;
      });
    });

    // Whiteboard stroke events
    socket.on('stroke:start', (event: StrokeStartEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        optionsRef.current?.onStrokeStart?.(event);
      }
    });

    socket.on('stroke:point', (event: StrokePointEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        optionsRef.current?.onStrokePoint?.(event);
      }
    });

    socket.on('stroke:end', (event: StrokeEndEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        optionsRef.current?.onStrokeEnd?.(event);
      }
    });

    socket.on('stroke:undo', (event: StrokeUndoEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        optionsRef.current?.onStrokeUndo?.(event);
      }
    });

    socket.on('canvas:clear', (event: CanvasClearEvent) => {
      if (event.projectId === currentProjectIdRef.current) {
        optionsRef.current?.onCanvasClear?.(event);
      }
    });

    return socket;
  }, []);

  useEffect(() => {
    // Connect to WebSocket
    const socket = connect();
    if (socket) {
      socketRef.current = socket;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    if (!socketRef.current || !projectId) return;

    currentProjectIdRef.current = projectId;

    // Join the project room
    if (socketRef.current.connected) {
      socketRef.current.emit(
        'presence:join',
        { projectId },
        (response: { users: OnlineUser[] }) => {
          if (response?.users) {
            setOnlineUsers(response.users);
          }
        }
      );
    }

    return () => {
      // Emit cursor leave before leaving project
      if (socketRef.current?.connected && currentProjectIdRef.current) {
        socketRef.current.emit('cursor:leave', { projectId: currentProjectIdRef.current });
        socketRef.current.emit('presence:leave', { projectId: currentProjectIdRef.current });
      }
      currentProjectIdRef.current = null;
      setOnlineUsers([]);
      setRemoteCursors(new Map());
    };
  }, [projectId]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!socketRef.current) return;

    const interval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('presence:heartbeat');
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Clean up stale cursors periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteCursors((prev) => {
        const now = Date.now();
        let hasChanges = false;
        const next = new Map(prev);
        
        for (const [id, cursor] of next) {
          if (now - cursor.lastUpdate > CURSOR_TIMEOUT_MS) {
            next.delete(id);
            hasChanges = true;
          }
        }
        
        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Methods to emit task sync events
  const emitTaskCreated = useCallback((task: Task) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('task:created', {
        projectId: currentProjectIdRef.current,
        task,
      });
    }
  }, []);

  const emitTaskUpdated = useCallback((task: Task) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('task:updated', {
        projectId: currentProjectIdRef.current,
        task,
      });
    }
  }, []);

  const emitTaskDeleted = useCallback((taskId: string) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('task:deleted', {
        projectId: currentProjectIdRef.current,
        taskId,
      });
    }
  }, []);

  // Methods to emit column sync events
  const emitColumnCreated = useCallback((column: KanbanColumn) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('column:created', {
        projectId: currentProjectIdRef.current,
        column,
      });
    }
  }, []);

  const emitColumnUpdated = useCallback((column: KanbanColumn) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('column:updated', {
        projectId: currentProjectIdRef.current,
        column,
      });
    }
  }, []);

  const emitColumnDeleted = useCallback((columnId: string) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('column:deleted', {
        projectId: currentProjectIdRef.current,
        columnId,
      });
    }
  }, []);

  const emitColumnsReordered = useCallback((columns: KanbanColumn[]) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('column:reordered', {
        projectId: currentProjectIdRef.current,
        columns,
      });
    }
  }, []);

  // Throttled cursor move emitter
  const emitCursorMoveThrottled = useMemo(
    () =>
      throttle(
        (data: {
          x: number;
          y: number;
          isDragging: boolean;
          dragTaskId: string | null;
          dragTaskTitle: string | null;
        }) => {
          if (socketRef.current?.connected && currentProjectIdRef.current) {
            socketRef.current.emit('cursor:move', {
              projectId: currentProjectIdRef.current,
              ...data,
            });
          }
        },
        CURSOR_THROTTLE_MS,
        { leading: true, trailing: true }
      ),
    []
  );

  const emitCursorMove = useCallback(
    (data: {
      x: number;
      y: number;
      isDragging: boolean;
      dragTaskId: string | null;
      dragTaskTitle: string | null;
    }) => {
      emitCursorMoveThrottled(data);
    },
    [emitCursorMoveThrottled]
  );

  const emitCursorLeave = useCallback(() => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('cursor:leave', {
        projectId: currentProjectIdRef.current,
      });
    }
  }, []);

  // Methods to emit whiteboard stroke events
  const emitStrokeStart = useCallback((strokeId: string, point: WhiteboardPoint, color: string, size: number) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('stroke:start', {
        projectId: currentProjectIdRef.current,
        strokeId,
        point,
        color,
        size,
      });
    }
  }, []);

  const emitStrokePoint = useCallback((strokeId: string, point: WhiteboardPoint) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('stroke:point', {
        projectId: currentProjectIdRef.current,
        strokeId,
        point,
      });
    }
  }, []);

  const emitStrokeEnd = useCallback((strokeId: string, points: WhiteboardPoint[], color: string, size: number) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('stroke:end', {
        projectId: currentProjectIdRef.current,
        strokeId,
        points,
        color,
        size,
      });
    }
  }, []);

  const emitStrokeUndo = useCallback((strokeId: string) => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('stroke:undo', {
        projectId: currentProjectIdRef.current,
        strokeId,
      });
    }
  }, []);

  const emitCanvasClear = useCallback(() => {
    if (socketRef.current?.connected && currentProjectIdRef.current) {
      socketRef.current.emit('canvas:clear', {
        projectId: currentProjectIdRef.current,
      });
    }
  }, []);

  // Convert Map to array for easier consumption
  const remoteCursorsArray = useMemo(
    () => Array.from(remoteCursors.values()),
    [remoteCursors]
  );

  return {
    onlineUsers,
    isConnected,
    remoteCursors: remoteCursorsArray,
    emitTaskCreated,
    emitTaskUpdated,
    emitTaskDeleted,
    emitColumnCreated,
    emitColumnUpdated,
    emitColumnDeleted,
    emitColumnsReordered,
    emitCursorMove,
    emitCursorLeave,
    // Whiteboard stroke emitters
    emitStrokeStart,
    emitStrokePoint,
    emitStrokeEnd,
    emitStrokeUndo,
    emitCanvasClear,
  };
}
