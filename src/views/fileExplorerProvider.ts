import * as vscode from 'vscode';
import { ConnectionManager } from '../connection/connectionManager';
import { SSHFileSystemProvider } from '../fileSystem/sshFileSystemProvider';
import { SSHConnection } from '../connection/sshConnection';
import { TreeNode } from './treeNode';
import { FileNode } from './fileNode';

export class FileExplorerProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined> = new vscode.EventEmitter<TreeNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined> = this._onDidChangeTreeData.event;

    constructor(
        private readonly connectionManager: ConnectionManager,
        private readonly fileSystemProvider: SSHFileSystemProvider
    ) {
        this.connectionManager.onConnectionChange(() => {
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

        if (element instanceof FileNode) {
            return this.getFileChildren(element);
        }

        return [];
    }

    private async getRootNodes(): Promise<TreeNode[]> {
        const connections = this.connectionManager.getConnections();
        return connections.map((conn: SSHConnection) => new FileNode(
            conn.config.host,
            vscode.TreeItemCollapsibleState.Collapsed,
            conn,
            '/'
        ));
    }

    private async getFileChildren(node: FileNode): Promise<TreeNode[]> {
        try {
            const uri = vscode.Uri.parse(`ssh://${node.connection.config.host}${node.path}`);
            const entries = await this.fileSystemProvider.readDirectory(uri);

            return entries
                .map(([name, type]: [string, vscode.FileType]) => new FileNode(
                    name,
                    type === vscode.FileType.Directory ? 
                        vscode.TreeItemCollapsibleState.Collapsed : 
                        vscode.TreeItemCollapsibleState.None,
                    node.connection,
                    `${node.path}${node.path.endsWith('/') ? '' : '/'}${name}`
                ))
                .sort((a: FileNode, b: FileNode) => {
                    if (a.collapsibleState === b.collapsibleState) {
                        return a.label.localeCompare(b.label);
                    }
                    return b.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ? 1 : -1;
                });
        } catch (error) {
            console.error('Error reading directory:', error);
            return [];
        }
    }
}
