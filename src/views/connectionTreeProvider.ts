import * as vscode from 'vscode';
import { ConnectionManager } from '../connection/connectionManager';
import { SSHConnection } from '../connection/sshConnection';
import { TreeNode } from '../models/treeNode';

class ConnectionNode extends TreeNode {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly connection: SSHConnection
    ) {
        super(label, collapsibleState);
        this.contextValue = 'connection';
        this.iconPath = new vscode.ThemeIcon('remote');
    }
}

class ConnectionDetailNode extends TreeNode {
    constructor(
        public readonly label: string,
        public readonly value: string,
        public readonly iconName: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.description = value;
        this.contextValue = 'connection-detail';
        this.iconPath = new vscode.ThemeIcon(iconName);
    }
}

export class ConnectionTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined> = new vscode.EventEmitter<TreeNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private readonly connectionManager: ConnectionManager) {
        // Listen for connection changes
        connectionManager.onConnectionChange(() => {
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (!element) {
            return this.getRootNodes();
        }

        if (element instanceof ConnectionNode) {
            return this.getConnectionDetails(element.connection);
        }

        return [];
    }

    private getRootNodes(): TreeNode[] {
        const connections = this.connectionManager.getConnections();
        return connections.map(conn => new ConnectionNode(
            conn.getHost(),
            vscode.TreeItemCollapsibleState.Collapsed,
            conn
        ));
    }

    private getConnectionDetails(connection: SSHConnection): TreeNode[] {
        const stats = connection.getConnectionStats();
        return [
            new ConnectionDetailNode('Status', connection.isActive() ? 'Connected' : 'Disconnected', 'circle-filled'),
            new ConnectionDetailNode('Host', connection.getHost(), 'server'),
            new ConnectionDetailNode('Port', connection.getPort().toString(), 'port'),
            new ConnectionDetailNode('Username', connection.getUsername(), 'person'),
            new ConnectionDetailNode('Uptime', this.formatUptime(stats.uptime), 'watch'),
            new ConnectionDetailNode('Operations', stats.operations.toString(), 'pulse'),
            new ConnectionDetailNode('Transfer Rate', this.formatTransferRate(stats.transferRate), 'arrow-both')
        ];
    }

    private formatUptime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    private formatTransferRate(bytesPerSecond: number): string {
        if (bytesPerSecond > 1024 * 1024) {
            return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
        }
        if (bytesPerSecond > 1024) {
            return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
        }
        return `${bytesPerSecond.toFixed(2)} B/s`;
    }
}
