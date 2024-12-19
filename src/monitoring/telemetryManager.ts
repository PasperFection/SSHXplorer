import * as vscode from 'vscode';
import * as os from 'os';
import { Logger } from '../utils/logger';
import { performance } from 'perf_hooks';

interface OperationMetrics {
    operation: string;
    duration: number;
    success: boolean;
    errorType?: string;
    fileSize?: number;
    timestamp: number;
}

interface PerformanceMetrics {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    openFiles: number;
    timestamp: number;
}

export class TelemetryManager {
    private static instance: TelemetryManager;
    private logger = Logger.getInstance();
    private metricsBuffer: Array<OperationMetrics | PerformanceMetrics> = [];
    private flushInterval: NodeJS.Timeout;
    private performanceInterval!: NodeJS.Timeout;
    private operationTimers: Map<string, number> = new Map();
    private enabled: boolean;

    private constructor() {
        this.enabled = vscode.workspace
            .getConfiguration('sshxplorer')
            .get('telemetry.enabled', true);

        this.flushInterval = setInterval(() => {
            this.flushMetrics();
        }, 5 * 60 * 1000); // Flush every 5 minutes

        this.startPerformanceMonitoring();
    }

    public static getInstance(): TelemetryManager {
        if (!TelemetryManager.instance) {
            TelemetryManager.instance = new TelemetryManager();
        }
        return TelemetryManager.instance;
    }

    startOperation(operation: string): string {
        const operationId = `${operation}-${Date.now()}`;
        this.operationTimers.set(operationId, performance.now());
        return operationId;
    }

    endOperation(
        operationId: string,
        success: boolean,
        details?: {
            errorType?: string;
            fileSize?: number;
        }
    ): void {
        const startTime = this.operationTimers.get(operationId);
        if (!startTime) {
            return;
        }

        const duration = performance.now() - startTime;
        this.operationTimers.delete(operationId);

        const metrics: OperationMetrics = {
            operation: operationId.split('-')[0],
            duration,
            success,
            errorType: details?.errorType,
            fileSize: details?.fileSize,
            timestamp: Date.now()
        };

        this.logOperationMetrics(metrics);
    }

    private startPerformanceMonitoring(): void {
        this.performanceInterval = setInterval(() => {
            const metrics: PerformanceMetrics = {
                memoryUsage: process.memoryUsage().heapUsed,
                cpuUsage: os.loadavg()[0] / os.cpus().length,
                activeConnections: this.getActiveConnections(),
                openFiles: this.getOpenFiles(),
                timestamp: Date.now()
            };

            this.logPerformanceMetrics(metrics);
        }, 60 * 1000); // Monitor every minute
    }

    private async flushMetrics(): Promise<void> {
        if (!this.enabled || this.metricsBuffer.length === 0) {
            return;
        }

        try {
            // Here you would typically send metrics to your analytics service
            this.metricsBuffer = [];
        } catch (error) {
            this.logger.error('Failed to flush metrics:', error instanceof Error ? error : new Error(String(error)));
        }
    }

    private getActiveConnections(): number {
        // Implementation would depend on your connection manager
        return 0;
    }

    private getOpenFiles(): number {
        // Implementation would depend on your file system provider
        return 0;
    }

    private logOperationMetrics(metrics: OperationMetrics): void {
        if (!this.enabled) {
            return;
        }

        this.metricsBuffer.push(metrics);
        this.logger.debug('Operation metrics:', {
            operation: metrics.operation,
            duration: `${metrics.duration.toFixed(2)}ms`,
            success: metrics.success,
            errorType: metrics.errorType,
            fileSize: metrics.fileSize ? `${(metrics.fileSize / 1024).toFixed(2)}KB` : undefined
        });
    }

    private logPerformanceMetrics(metrics: PerformanceMetrics): void {
        if (!this.enabled) {
            return;
        }

        this.metricsBuffer.push(metrics);
        this.logger.debug('Performance metrics:', {
            memoryUsage: `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
            cpuUsage: `${(metrics.cpuUsage * 100).toFixed(2)}%`,
            activeConnections: metrics.activeConnections,
            openFiles: metrics.openFiles
        });
    }

    dispose(): void {
        clearInterval(this.flushInterval);
        clearInterval(this.performanceInterval);
    }
}
