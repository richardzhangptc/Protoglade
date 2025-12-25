import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService, OnlineUser } from './presence.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://protoglade.com',
      'https://www.protoglade.com',
      'https://protoglade-frontend.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  },
  namespace: '/presence',
})
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private presenceService: PresenceService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        console.log('WebSocket connection rejected: No token provided');
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'dev-secret',
      });

      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        console.log('WebSocket connection rejected: User not found');
        client.disconnect();
        return;
      }

      // Attach user to socket
      client.user = user;
      console.log(`WebSocket connected: ${user.email} (${client.id})`);
    } catch (error) {
      console.log('WebSocket connection rejected: Invalid token', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (!client.user) return;

    console.log(`WebSocket disconnected: ${client.user.email} (${client.id})`);

    // Remove from any project they were viewing
    const projectId = this.presenceService.leaveBySocketId(client.id);
    
    if (projectId) {
      // Notify others in the project
      const onlineUsers = this.presenceService.getOnlineUsers(projectId);
      this.server.to(`project:${projectId}`).emit('presence:update', {
        projectId,
        users: onlineUsers,
      });
    }
  }

  @SubscribeMessage('presence:join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string },
  ): Promise<{ users: OnlineUser[] }> {
    if (!client.user) {
      return { users: [] };
    }

    const { projectId } = data;

    // Leave any previous room
    const previousProjectId = this.presenceService.leaveBySocketId(client.id);
    if (previousProjectId) {
      client.leave(`project:${previousProjectId}`);
      // Notify previous project
      const previousUsers = this.presenceService.getOnlineUsers(previousProjectId);
      this.server.to(`project:${previousProjectId}`).emit('presence:update', {
        projectId: previousProjectId,
        users: previousUsers,
      });
    }

    // Join the new project room
    client.join(`project:${projectId}`);
    
    // Add to presence tracking
    const onlineUsers = this.presenceService.join(
      client.id,
      projectId,
      client.user,
    );

    console.log(
      `User ${client.user.email} joined project ${projectId}. Online users: ${onlineUsers.length}`,
    );

    // Notify all users in the project (including the joiner)
    this.server.to(`project:${projectId}`).emit('presence:update', {
      projectId,
      users: onlineUsers,
    });

    return { users: onlineUsers };
  }

  @SubscribeMessage('presence:leave')
  async handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string },
  ): Promise<void> {
    if (!client.user) return;

    const { projectId } = data;

    // Leave the room
    client.leave(`project:${projectId}`);

    // Remove from presence tracking
    const onlineUsers = this.presenceService.leave(client.id, projectId);

    console.log(
      `User ${client.user.email} left project ${projectId}. Online users: ${onlineUsers.length}`,
    );

    // Notify remaining users
    this.server.to(`project:${projectId}`).emit('presence:update', {
      projectId,
      users: onlineUsers,
    });
  }

  @SubscribeMessage('presence:heartbeat')
  handleHeartbeat(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): { ok: boolean } {
    // Simple heartbeat to keep connection alive
    return { ok: true };
  }

  // ===== Task Sync Events =====

  @SubscribeMessage('task:created')
  handleTaskCreated(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      projectId: string;
      task: {
        id: string;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        position: number;
        projectId: string;
        assignee: { id: string; email: string; name: string | null } | null;
        _count?: { comments: number };
      };
    },
  ): void {
    if (!client.user) return;

    const { projectId, task } = data;

    console.log(
      `Task created by ${client.user.email} in project ${projectId}: ${task.title}`,
    );

    // Broadcast to all OTHER users in the project (exclude sender)
    client.to(`project:${projectId}`).emit('task:created', {
      projectId,
      task,
      createdBy: {
        id: client.user.id,
        email: client.user.email,
        name: client.user.name,
      },
    });
  }

  @SubscribeMessage('task:updated')
  handleTaskUpdated(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      projectId: string;
      task: {
        id: string;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        position: number;
        projectId: string;
        assignee: { id: string; email: string; name: string | null } | null;
        _count?: { comments: number };
      };
    },
  ): void {
    if (!client.user) return;

    const { projectId, task } = data;

    console.log(
      `Task updated by ${client.user.email} in project ${projectId}: ${task.id}`,
    );

    // Broadcast to all OTHER users in the project (exclude sender)
    client.to(`project:${projectId}`).emit('task:updated', {
      projectId,
      task,
      updatedBy: {
        id: client.user.id,
        email: client.user.email,
        name: client.user.name,
      },
    });
  }

  @SubscribeMessage('task:deleted')
  handleTaskDeleted(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      projectId: string;
      taskId: string;
    },
  ): void {
    if (!client.user) return;

    const { projectId, taskId } = data;

    console.log(
      `Task deleted by ${client.user.email} in project ${projectId}: ${taskId}`,
    );

    // Broadcast to all OTHER users in the project (exclude sender)
    client.to(`project:${projectId}`).emit('task:deleted', {
      projectId,
      taskId,
      deletedBy: {
        id: client.user.id,
        email: client.user.email,
        name: client.user.name,
      },
    });
  }

  // ===== Column Sync Events =====

  @SubscribeMessage('column:created')
  handleColumnCreated(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      projectId: string;
      column: {
        id: string;
        name: string;
        color: string;
        position: number;
        projectId: string;
        _count?: { tasks: number };
      };
    },
  ): void {
    if (!client.user) return;

    const { projectId, column } = data;

    console.log(
      `Column created by ${client.user.email} in project ${projectId}: ${column.name}`,
    );

    // Broadcast to all OTHER users in the project (exclude sender)
    client.to(`project:${projectId}`).emit('column:created', {
      projectId,
      column,
      createdBy: {
        id: client.user.id,
        email: client.user.email,
        name: client.user.name,
      },
    });
  }

  @SubscribeMessage('column:updated')
  handleColumnUpdated(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      projectId: string;
      column: {
        id: string;
        name: string;
        color: string;
        position: number;
        projectId: string;
        _count?: { tasks: number };
      };
    },
  ): void {
    if (!client.user) return;

    const { projectId, column } = data;

    console.log(
      `Column updated by ${client.user.email} in project ${projectId}: ${column.id}`,
    );

    // Broadcast to all OTHER users in the project (exclude sender)
    client.to(`project:${projectId}`).emit('column:updated', {
      projectId,
      column,
      updatedBy: {
        id: client.user.id,
        email: client.user.email,
        name: client.user.name,
      },
    });
  }

  @SubscribeMessage('column:deleted')
  handleColumnDeleted(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      projectId: string;
      columnId: string;
    },
  ): void {
    if (!client.user) return;

    const { projectId, columnId } = data;

    console.log(
      `Column deleted by ${client.user.email} in project ${projectId}: ${columnId}`,
    );

    // Broadcast to all OTHER users in the project (exclude sender)
    client.to(`project:${projectId}`).emit('column:deleted', {
      projectId,
      columnId,
      deletedBy: {
        id: client.user.id,
        email: client.user.email,
        name: client.user.name,
      },
    });
  }

  @SubscribeMessage('column:reordered')
  handleColumnReordered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      projectId: string;
      columns: Array<{
        id: string;
        name: string;
        color: string;
        position: number;
        projectId: string;
        _count?: { tasks: number };
      }>;
    },
  ): void {
    if (!client.user) return;

    const { projectId, columns } = data;

    console.log(
      `Columns reordered by ${client.user.email} in project ${projectId}`,
    );

    // Broadcast to all OTHER users in the project (exclude sender)
    client.to(`project:${projectId}`).emit('column:reordered', {
      projectId,
      columns,
      reorderedBy: {
        id: client.user.id,
        email: client.user.email,
        name: client.user.name,
      },
    });
  }

  // ===== Cursor Events =====

  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      projectId: string;
      x: number;
      y: number;
      isDragging: boolean;
      dragTaskId: string | null;
      dragTaskTitle: string | null;
    },
  ): void {
    if (!client.user) return;

    const user = client.user;
    const { projectId, x, y, isDragging, dragTaskId, dragTaskTitle } = data;

    // Get user's color from presence service
    const onlineUsers = this.presenceService.getOnlineUsers(projectId);
    const currentUser = onlineUsers.find((u) => u.id === user.id);

    // Broadcast to all OTHER users in the project (exclude sender)
    client.to(`project:${projectId}`).emit('cursor:move', {
      odataId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        color: currentUser?.color || '#3b82f6',
      },
      x,
      y,
      isDragging,
      dragTaskId,
      dragTaskTitle,
    });
  }

  @SubscribeMessage('cursor:leave')
  handleCursorLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      projectId: string;
    },
  ): void {
    if (!client.user) return;

    const { projectId } = data;

    // Broadcast to all OTHER users that this cursor left
    client.to(`project:${projectId}`).emit('cursor:leave', {
      odataId: client.user.id,
    });
  }
}

