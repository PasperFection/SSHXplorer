import * as vscode from 'vscode';
import { TreeNode } from './treeNode';
import { SSHConnection } from '../connection/sshConnection';

export class FileNode extends TreeNode {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly connection: SSHConnection,
        public readonly path: string
    ) {
        super(label, collapsibleState);

        this.contextValue = collapsibleState === vscode.TreeItemCollapsibleState.None ? 'file' : 'directory';
        this.iconPath = new vscode.ThemeIcon(
            collapsibleState === vscode.TreeItemCollapsibleState.None ? 'file' : 'folder'
        );
        this.tooltip = path;
    }
}
