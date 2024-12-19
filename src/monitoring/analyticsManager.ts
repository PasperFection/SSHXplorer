import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { TelemetryManager } from './telemetryManager';

interface AnalyticsEvent {
    category: string;
    action: string;
    label?: string;
    value?: number;
    timestamp: number;
}

interface UserMetrics {
    totalConnections: number;
    totalOperations: number;
    averageOperationDuration: number;
    failureRate: number;
    lastActive: number;
}

export class AnalyticsManager {
    private static instance: AnalyticsManager;
    private logger = Logger.getInstance();
    private telemetry = TelemetryManager.getInstance();
    private events: AnalyticsEvent[] = [];
    private userMetrics: Map<string, UserMetrics> = new Map();
    private sessionStart: number;

    private constructor() {
        this.sessionStart = Date.now();
        this.setupEventListeners();
    }

    static getInstance(): AnalyticsManager {
        if (!AnalyticsManager.instance) {
            AnalyticsManager.instance = new AnalyticsManager();
        }
        return AnalyticsManager.instance;
    }

    private setupEventListeners(): void {
        // Track connection events
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('sshxplorer')) {
                this.trackEvent('settings', 'change');
            }
        });

        // Track file operations
        vscode.workspace.onDidCreateFiles(e => {
            this.trackEvent('files', 'create', undefined, e.files.length);
        });

        vscode.workspace.onDidDeleteFiles(e => {
            this.trackEvent('files', 'delete', undefined, e.files.length);
        });

        vscode.workspace.onDidRenameFiles(e => {
            this.trackEvent('files', 'rename', undefined, e.files.length);
        });

        // Track window state
        vscode.window.onDidChangeActiveTextEditor(e => {
            if (e && e.document.uri.scheme === 'ssh') {
                this.trackEvent('editor', 'open');
            }
        });
    }

    trackEvent(
        category: string,
        action: string,
        label?: string,
        value?: number
    ): void {
        const event: AnalyticsEvent = {
            category,
            action,
            label,
            value,
            timestamp: Date.now()
        };

        this.events.push(event);
        this.updateUserMetrics(event);
        this.logger.debug('Analytics Event', event);
    }

    private updateUserMetrics(event: AnalyticsEvent): void {
        const userId = this.getUserId();
        let metrics = this.userMetrics.get(userId) || {
            totalConnections: 0,
            totalOperations: 0,
            averageOperationDuration: 0,
            failureRate: 0,
            lastActive: 0
        };

        metrics.totalOperations++;
        metrics.lastActive = event.timestamp;

        if (event.category === 'connection' && event.action === 'connect') {
            metrics.totalConnections++;
        }

        this.userMetrics.set(userId, metrics);
    }

    async generateAnalyticsReport(): Promise<string> {
        const userId = this.getUserId();
        const metrics = this.userMetrics.get(userId);
        if (!metrics) return 'No analytics data available';

        const sessionDuration = Date.now() - this.sessionStart;
        const report = [
            '# SSHXplorer Analytics Report',
            '',
            `## Session Information`,
            `- Duration: ${this.formatDuration(sessionDuration)}`,
            `- Total Operations: ${metrics.totalOperations}`,
            `- Total Connections: ${metrics.totalConnections}`,
            `- Average Operation Duration: ${metrics.averageOperationDuration.toFixed(2)}ms`,
            `- Failure Rate: ${(metrics.failureRate * 100).toFixed(2)}%`,
            '',
            '## Event Distribution',
            ...this.generateEventDistribution(),
            '',
            '## Performance Metrics',
            ...await this.generatePerformanceMetrics(),
        ];

        return report.join('\n');
    }

    private generateEventDistribution(): string[] {
        const distribution = new Map<string, number>();
        
        this.events.forEach(event => {
            const key = `${event.category}:${event.action}`;
            distribution.set(key, (distribution.get(key) || 0) + 1);
        });

        return Array.from(distribution.entries()).map(
            ([key, count]) => `- ${key}: ${count} times`
        );
    }

    private async generatePerformanceMetrics(): Promise<string[]> {
        // This would be implemented to gather performance metrics
        // from the TelemetryManager
        return [
            '- Memory Usage: Monitoring',
            '- CPU Usage: Tracking',
            '- Active Connections: Recording',
            '- Open Files: Tracking'
        ];
    }

    private formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }

    private getUserId(): string {
        // In a real implementation, this would get a unique user identifier
        return 'anonymous';
    }

    dispose(): void {
        // Clean up any resources
    }
}
