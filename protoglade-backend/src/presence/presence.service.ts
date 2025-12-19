import { Injectable } from '@nestjs/common';

export interface OnlineUser {
  id: string;
  email: string;
  name: string | null;
  color: string;
}

interface PresenceEntry {
  user: OnlineUser;
  socketId: string;
  projectId: string;
  joinedAt: Date;
}

@Injectable()
export class PresenceService {
  // Map of projectId -> Map of odataId -> PresenceEntry
  private projectPresence = new Map<string, Map<string, PresenceEntry>>();
  
  // Map of socketId -> { odataId, projectId } for cleanup on disconnect
  private socketToUser = new Map<string, { odataId: string; projectId: string }>();

  // Generate a consistent color based on user id
  private generateColor(userId: string): string {
    const colors = [
      '#ef4444', // red
      '#f97316', // orange
      '#eab308', // yellow
      '#22c55e', // green
      '#14b8a6', // teal
      '#3b82f6', // blue
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
    ];
    
    // Simple hash of user ID to get consistent color
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  }

  join(
    socketId: string,
    projectId: string,
    user: { id: string; email: string; name: string | null },
  ): OnlineUser[] {
    // Create a unique data ID for this socket/project combo
    const odataId = `${user.id}-${socketId}`;
    
    // First, leave any existing project this socket was viewing
    this.leaveBySocketId(socketId);

    // Get or create the project's presence map
    if (!this.projectPresence.has(projectId)) {
      this.projectPresence.set(projectId, new Map());
    }
    const projectUsers = this.projectPresence.get(projectId)!;

    // Add the user
    const onlineUser: OnlineUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      color: this.generateColor(user.id),
    };

    projectUsers.set(odataId, {
      user: onlineUser,
      socketId,
      projectId,
      joinedAt: new Date(),
    });

    // Track socket -> user mapping for cleanup
    this.socketToUser.set(socketId, { odataId, projectId });

    // Return all online users for this project (deduplicated by user ID)
    return this.getOnlineUsers(projectId);
  }

  leave(socketId: string, projectId: string): OnlineUser[] {
    this.leaveBySocketId(socketId);
    return this.getOnlineUsers(projectId);
  }

  leaveBySocketId(socketId: string): string | null {
    const mapping = this.socketToUser.get(socketId);
    if (!mapping) return null;

    const { odataId, projectId } = mapping;
    const projectUsers = this.projectPresence.get(projectId);
    
    if (projectUsers) {
      projectUsers.delete(odataId);
      
      // Clean up empty project maps
      if (projectUsers.size === 0) {
        this.projectPresence.delete(projectId);
      }
    }

    this.socketToUser.delete(socketId);
    return projectId;
  }

  getOnlineUsers(projectId: string): OnlineUser[] {
    const projectUsers = this.projectPresence.get(projectId);
    if (!projectUsers) return [];

    // Deduplicate by user ID (same user might have multiple tabs)
    const userMap = new Map<string, OnlineUser>();
    for (const entry of projectUsers.values()) {
      userMap.set(entry.user.id, entry.user);
    }

    return Array.from(userMap.values());
  }

  getSocketsInProject(projectId: string): string[] {
    const projectUsers = this.projectPresence.get(projectId);
    if (!projectUsers) return [];

    return Array.from(projectUsers.values()).map((entry) => entry.socketId);
  }
}

