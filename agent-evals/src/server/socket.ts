/**
 * Socket.io Server (Task 31)
 * Real-time updates for evaluation progress
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

// ============================================================================
// Types
// ============================================================================

export interface EvalProgressEvent {
  type: 'eval-started' | 'task-started' | 'task-completed' | 'trial-result' | 'eval-completed';
  evalId: string;
  taskId?: string;
  trialId?: string;
  data?: {
    taskIndex?: number;
    totalTasks?: number;
    score?: number;
    passed?: boolean;
    status?: string;
    error?: string;
  };
  timestamp: Date;
}

export interface SocketServerOptions {
  httpServer: HttpServer;
  corsOrigin?: string | string[];
}

// ============================================================================
// Socket Server
// ============================================================================

export class EvalSocketServer {
  private io: Server;
  private evalSubscriptions: Map<string, Set<string>> = new Map(); // evalId -> Set of socketIds

  constructor(options: SocketServerOptions) {
    this.io = new Server(options.httpServer, {
      cors: {
        origin: options.corsOrigin || '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      // Subscribe to eval updates
      socket.on('subscribe:eval', (evalId: string) => {
        this.subscribeToEval(socket.id, evalId);
        socket.join(`eval:${evalId}`);
        console.log(`[Socket] ${socket.id} subscribed to eval: ${evalId}`);
      });

      // Unsubscribe from eval updates
      socket.on('unsubscribe:eval', (evalId: string) => {
        this.unsubscribeFromEval(socket.id, evalId);
        socket.leave(`eval:${evalId}`);
        console.log(`[Socket] ${socket.id} unsubscribed from eval: ${evalId}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.cleanupSubscriptions(socket.id);
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });
  }

  private subscribeToEval(socketId: string, evalId: string): void {
    if (!this.evalSubscriptions.has(evalId)) {
      this.evalSubscriptions.set(evalId, new Set());
    }
    this.evalSubscriptions.get(evalId)!.add(socketId);
  }

  private unsubscribeFromEval(socketId: string, evalId: string): void {
    const subscribers = this.evalSubscriptions.get(evalId);
    if (subscribers) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.evalSubscriptions.delete(evalId);
      }
    }
  }

  private cleanupSubscriptions(socketId: string): void {
    for (const [evalId, subscribers] of this.evalSubscriptions.entries()) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.evalSubscriptions.delete(evalId);
      }
    }
  }

  // ============================================================================
  // Public API for emitting events
  // ============================================================================

  /**
   * Emit an evaluation started event
   */
  emitEvalStarted(evalId: string, data?: { totalTasks?: number }): void {
    this.emit({
      type: 'eval-started',
      evalId,
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Emit a task started event
   */
  emitTaskStarted(evalId: string, taskId: string, taskIndex: number): void {
    this.emit({
      type: 'task-started',
      evalId,
      taskId,
      data: { taskIndex },
      timestamp: new Date(),
    });
  }

  /**
   * Emit a task completed event
   */
  emitTaskCompleted(
    evalId: string,
    taskId: string,
    data: { score: number; passed: boolean }
  ): void {
    this.emit({
      type: 'task-completed',
      evalId,
      taskId,
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Emit a trial result event
   */
  emitTrialResult(
    evalId: string,
    taskId: string,
    trialId: string,
    data: { score: number; passed: boolean }
  ): void {
    this.emit({
      type: 'trial-result',
      evalId,
      taskId,
      trialId,
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Emit an evaluation completed event
   */
  emitEvalCompleted(evalId: string, data: { status: string; error?: string }): void {
    this.emit({
      type: 'eval-completed',
      evalId,
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Emit a generic event to eval subscribers
   */
  private emit(event: EvalProgressEvent): void {
    this.io.to(`eval:${event.evalId}`).emit('eval:progress', event);
  }

  /**
   * Get the Socket.io server instance
   */
  getIO(): Server {
    return this.io;
  }

  /**
   * Close the server
   */
  close(): void {
    this.io.close();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let socketServer: EvalSocketServer | null = null;

/**
 * Initialize the socket server
 */
export function initSocketServer(options: SocketServerOptions): EvalSocketServer {
  if (socketServer) {
    return socketServer;
  }
  socketServer = new EvalSocketServer(options);
  return socketServer;
}

/**
 * Get the socket server instance
 */
export function getSocketServer(): EvalSocketServer | null {
  return socketServer;
}

// ============================================================================
// Client Helper
// ============================================================================

/**
 * Create a progress callback that emits socket events
 */
export function createSocketProgressCallback(evalId: string) {
  return (event: {
    type: string;
    taskId?: string;
    trialId?: string;
    score?: number;
    passed?: boolean;
    status?: string;
  }): void => {
    const server = getSocketServer();
    if (!server) return;

    switch (event.type) {
      case 'task-started':
        if (event.taskId) {
          server.emitTaskStarted(evalId, event.taskId, 0);
        }
        break;
      case 'task-completed':
        if (event.taskId && event.score !== undefined && event.passed !== undefined) {
          server.emitTaskCompleted(evalId, event.taskId, {
            score: event.score,
            passed: event.passed,
          });
        }
        break;
      case 'trial-result':
        if (
          event.taskId &&
          event.trialId &&
          event.score !== undefined &&
          event.passed !== undefined
        ) {
          server.emitTrialResult(evalId, event.taskId, event.trialId, {
            score: event.score,
            passed: event.passed,
          });
        }
        break;
      case 'eval-completed':
        server.emitEvalCompleted(evalId, { status: event.status || 'completed' });
        break;
    }
  };
}
