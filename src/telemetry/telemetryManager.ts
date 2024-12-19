import * as vscode from 'vscode';

export interface TelemetryMetrics {
    averageLatency: number;
    memoryUsage: number;
    cpuUsage: number;
    networkBandwidth: number;
}

export class TelemetryManager {
    private static instance: TelemetryManager;
    private metricsHistory: TelemetryMetrics[] = [];
    private readonly maxHistorySize = 100;

    private constructor() {
        // Start collecting metrics periodically
        setInterval(() => this.collectMetrics(), 60000);
    }

    static getInstance(): TelemetryManager {
        if (!TelemetryManager.instance) {
            TelemetryManager.instance = new TelemetryManager();
        }
        return TelemetryManager.instance;
    }

    private async collectMetrics(): Promise<void> {
        const metrics = await this.measureMetrics();
        this.metricsHistory.push(metrics);
        
        // Keep history size bounded
        if (this.metricsHistory.length > this.maxHistorySize) {
            this.metricsHistory.shift();
        }
    }

    private async measureMetrics(): Promise<TelemetryMetrics> {
        // In a real implementation, these would be actual measurements
        return {
            averageLatency: Math.random() * 100,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            cpuUsage: Math.random(),
            networkBandwidth: Math.random() * 1000
        };
    }

    async getMetrics(): Promise<TelemetryMetrics> {
        if (this.metricsHistory.length === 0) {
            await this.collectMetrics();
        }
        return this.metricsHistory[this.metricsHistory.length - 1];
    }

    getAverageMetrics(duration: number = 5): TelemetryMetrics {
        const recentMetrics = this.metricsHistory.slice(-duration);
        if (recentMetrics.length === 0) {
            return {
                averageLatency: 0,
                memoryUsage: 0,
                cpuUsage: 0,
                networkBandwidth: 0
            };
        }

        return {
            averageLatency: this.average(recentMetrics.map(m => m.averageLatency)),
            memoryUsage: this.average(recentMetrics.map(m => m.memoryUsage)),
            cpuUsage: this.average(recentMetrics.map(m => m.cpuUsage)),
            networkBandwidth: this.average(recentMetrics.map(m => m.networkBandwidth))
        };
    }

    private average(numbers: number[]): number {
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }

    clearHistory(): void {
        this.metricsHistory = [];
    }
}
