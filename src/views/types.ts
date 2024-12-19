import * as vscode from 'vscode';

export interface StatusNode extends vscode.TreeItem {
    id: string;
    label: string;
    description?: string;
    tooltip?: string;
    iconPath?: string | vscode.ThemeIcon;
    contextValue?: string;
    children?: StatusNode[];
    parent?: StatusNode;
    data?: any;
}

export interface ConnectionNode extends vscode.TreeItem {
    id: string;
    label: string;
    connection: any; // Replace with actual connection type
    contextValue?: string;
    children?: ConnectionNode[];
    parent?: ConnectionNode;
}

export interface FileNode extends vscode.TreeItem {
    uri: vscode.Uri;
    isDirectory: boolean;
    size?: number;
    modifiedTime?: Date;
    parent?: FileNode;
    children?: FileNode[];
}
