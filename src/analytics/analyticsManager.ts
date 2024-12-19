import * as vscode from 'vscode';

export interface AnalyticsStats {
    activeConnections: number;
    totalConnections: number;
    readOperations: number;
    writeOperations: number;
    successRate: number;
    averageResponseTime: number;
}

export class AnalyticsManager {
    private static instance: AnalyticsManager;
    private stats: AnalyticsStats = {
        activeConnections: 0,
        totalConnections: 0,
        readOperations: 0,
        writeOperations: 0,
        successRate: 1.0,
        averageResponseTime: 0
    };

    private operationTimes: number[] = [];
    private readonly maxTimeHistorySize = 1000;

    private constructor() {}

    static getInstance(): AnalyticsManager {
        if (!AnalyticsManager.instance) {
            AnalyticsManager.instance = new AnalyticsManager();
        }
        return AnalyticsManager.instance;
    }

    incrementConnections(): void {
        this.stats.totalConnections++;
        this.stats.activeConnections++;
    }

    decrementConnections(): void {
        this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);
    }

    recordOperation(type: 'read' | 'write', duration: number, success: boolean): void {
        if (type === 'read') {
            this.stats.readOperations++;
        } else {
            this.stats.writeOperations++;
        }

        this.operationTimes.push(duration);
        if (this.operationTimes.length > this.maxTimeHistorySize) {
            this.operationTimes.shift();
        }

        // Update success rate
        const totalOps = this.stats.readOperations + this.stats.writeOperations;
        this.stats.successRate = ((this.stats.successRate * (totalOps - 1)) + (success ? 1 : 0)) / totalOps;

        // Update average response time
        this.stats.averageResponseTime = this.operationTimes.reduce((a, b) => a + b, 0) / this.operationTimes.length;
    }

    async getStats(): Promise<AnalyticsStats> {
        return { ...this.stats };
    }

    resetStats(): void {
        this.stats = {
            activeConnections: 0,
            totalConnections: 0,
            readOperations: 0,
            writeOperations: 0,
            successRate: 1.0,
            averageResponseTime: 0
        };
        this.operationTimes = [];
    }
}
