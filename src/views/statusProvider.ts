import * as vscode from 'vscode';
import { TelemetryManager } from '../telemetry/telemetryManager';
import { AnalyticsManager } from '../analytics/analyticsManager';
import { StatusNode } from './types';

export class StatusProvider implements vscode.TreeDataProvider<StatusNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatusNode | undefined | null | void> = new vscode.EventEmitter<StatusNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatusNode | undefined | null | void> = this._onDidChangeTreeData.event;

    private refreshInterval: NodeJS.Timer;

    constructor(
        private telemetryManager: TelemetryManager,
        private analyticsManager: AnalyticsManager
    ) {
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 5000); // Refresh every 5 seconds
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: StatusNode): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: StatusNode): Promise<StatusNode[]> {
        if (!element) {
            return [
                this.createPerformanceNode(),
                this.createConnectionNode(),
                this.createOperationsNode()
            ];
        }

        switch (element.contextValue) {
            case 'performance':
                return this.getPerformanceChildren();
            case 'connections':
                return this.getConnectionChildren();
            case 'operations':
                return this.getOperationChildren();
            default:
                return [];
        }
    }

    private createPerformanceNode(): StatusNode {
        return {
            id: 'performance',
            label: 'Performance',
            contextValue: 'performance',
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            iconPath: new vscode.ThemeIcon('dashboard')
        };
    }

    private async getPerformanceChildren(): Promise<StatusNode[]> {
        const metrics = await this.telemetryManager.getMetrics();
        return [
            {
                id: 'latency',
                label: 'Latency',
                description: `${metrics.averageLatency}ms`,
                tooltip: 'Average connection latency',
                iconPath: new vscode.ThemeIcon('pulse')
            },
            {
                id: 'memory',
                label: 'Memory Usage',
                description: `${metrics.memoryUsage}MB`,
                tooltip: 'Current memory usage',
                iconPath: new vscode.ThemeIcon('server-process')
            }
        ];
    }

    private createConnectionNode(): StatusNode {
        return {
            id: 'connections',
            label: 'Connections',
            contextValue: 'connections',
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            iconPath: new vscode.ThemeIcon('plug')
        };
    }

    private async getConnectionChildren(): Promise<StatusNode[]> {
        const stats = await this.analyticsManager.getStats();
        return [
            {
                id: 'active',
                label: 'Active',
                description: `${stats.activeConnections}`,
                tooltip: 'Number of active connections',
                iconPath: new vscode.ThemeIcon('check')
            },
            {
                id: 'total',
                label: 'Total',
                description: `${stats.totalConnections}`,
                tooltip: 'Total number of connections',
                iconPath: new vscode.ThemeIcon('history')
            }
        ];
    }

    private createOperationsNode(): StatusNode {
        return {
            id: 'operations',
            label: 'Operations',
            contextValue: 'operations',
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            iconPath: new vscode.ThemeIcon('symbol-event')
        };
    }

    private async getOperationChildren(): Promise<StatusNode[]> {
        const stats = await this.analyticsManager.getStats();
        return [
            {
                id: 'reads',
                label: 'Reads',
                description: `${stats.readOperations}`,
                tooltip: 'Number of read operations',
                iconPath: new vscode.ThemeIcon('file')
            },
            {
                id: 'writes',
                label: 'Writes',
                description: `${stats.writeOperations}`,
                tooltip: 'Number of write operations',
                iconPath: new vscode.ThemeIcon('edit')
            }
        ];
    }

    dispose(): void {
        clearInterval(this.refreshInterval);
    }
}
