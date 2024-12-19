import * as vscode from 'vscode';
import { Client, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

export interface SSHConnection {
    host: string;
    port: number;
    username: string;
    privateKeyPath?: string;
    password?: string;
}

export class ConnectionManager {
    private client: Client | undefined;
    private currentConnection: SSHConnection | undefined;
    private lastConnection: SSHConnection | undefined;
    private readonly _onDidChangeConnection = new vscode.EventEmitter<void>();
    readonly onDidChangeConnection = this._onDidChangeConnection.event;
    private readonly _onDidDisconnect = new vscode.EventEmitter<Error | undefined>();
    readonly onDidDisconnect = this._onDidDisconnect.event;
    private readonly _onConnectionChange = new vscode.EventEmitter<void>();
    readonly onConnectionChange = this._onConnectionChange.event;

    constructor(private context: vscode.ExtensionContext) {
        this.client = undefined;
    }

    async promptForConnection(): Promise<SSHConnection | undefined> {
        const host = await vscode.window.showInputBox({
            prompt: 'Enter SSH host',
            placeHolder: 'hostname or IP address'
        });

        if (!host) {
            return undefined;
        }

        const port = await vscode.window.showInputBox({
            prompt: 'Enter SSH port',
            placeHolder: '22',
            value: '22'
        });

        if (!port) {
            return undefined;
        }

        const username = await vscode.window.showInputBox({
            prompt: 'Enter username',
            placeHolder: 'username'
        });

        if (!username) {
            return undefined;
        }

        const authMethod = await vscode.window.showQuickPick(
            ['SSH Key', 'Password'],
            { placeHolder: 'Select authentication method' }
        );

        if (!authMethod) {
            return undefined;
        }

        let privateKeyPath: string | undefined;
        let password: string | undefined;

        if (authMethod === 'SSH Key') {
            const defaultKeyPath = path.join(require('os').homedir(), '.ssh', 'id_rsa');
            privateKeyPath = await vscode.window.showInputBox({
                prompt: 'Enter path to private key',
                placeHolder: defaultKeyPath,
                value: defaultKeyPath
            });

            if (!privateKeyPath) {
                return undefined;
            }
        } else {
            password = await vscode.window.showInputBox({
                prompt: 'Enter password',
                password: true
            });

            if (!password) {
                return undefined;
            }
        }

        return {
            host,
            port: parseInt(port),
            username,
            privateKeyPath,
            password
        };
    }

    async connect(connection: SSHConnection): Promise<void> {
        return new Promise((resolve, reject) => {
            this.disconnect();

            this.client = new Client();
            this.currentConnection = connection;
            this.lastConnection = connection;

            const config: any = {
                host: connection.host,
                port: connection.port,
                username: connection.username
            };

            if (connection.privateKeyPath) {
                config.privateKey = fs.readFileSync(connection.privateKeyPath);
            } else if (connection.password) {
                config.password = connection.password;
            }

            this.client
                .on('ready', () => {
                    this._onDidChangeConnection.fire();
                    this._onConnectionChange.fire();
                    resolve();
                })
                .on('error', (err) => {
                    this._onDidDisconnect.fire(err);
                    reject(err);
                })
                .on('end', () => {
                    this._onDidDisconnect.fire(undefined);
                })
                .connect(config);
        });
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            this.client.end();
            this.client = undefined;
            this.currentConnection = undefined;
            this._onDidChangeConnection.fire();
            this._onConnectionChange.fire();
        }
    }

    async getClient(): Promise<Client> {
        if (!this.client) {
            throw new Error('Not connected to SSH server');
        }
        return this.client;
    }

    getCurrentConnection(): SSHConnection | undefined {
        return this.currentConnection;
    }

    getLastConnection(): SSHConnection | undefined {
        return this.lastConnection;
    }

    validateConfig(config: ConnectConfig): boolean {
        return !!(config.host && config.username);
    }

    getHostFromUri(uri: vscode.Uri): string {
        return uri.authority;
    }

    getPathFromUri(uri: vscode.Uri): string {
        return uri.path;
    }

    dispose(): void {
        if (this.client) {
            this.client.end();
            this.client = undefined;
            this.currentConnection = undefined;
        }
        this._onDidChangeConnection.dispose();
        this._onDidDisconnect.dispose();
        this._onConnectionChange.dispose();
    }
}
