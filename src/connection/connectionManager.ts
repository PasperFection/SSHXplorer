import * as vscode from 'vscode';
import { SSHConnection, SSHConfig } from './sshConnection';

export class ConnectionManager {
    private connections: Map<string, SSHConnection> = new Map();
    private _onConnectionChange: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onConnectionChange: vscode.Event<void> = this._onConnectionChange.event;

    constructor() {}

    async createConnection(config: SSHConfig): Promise<SSHConnection> {
        const key = `${config.username}@${config.host}:${config.port}`;
        let connection = this.connections.get(key);

        if (!connection) {
            connection = new SSHConnection(config);
            this.connections.set(key, connection);
            this._onConnectionChange.fire();
        }

        if (!connection.isActive()) {
            try {
                await connection.connect();
                this._onConnectionChange.fire();
            } catch (error) {
                this.connections.delete(key);
                this._onConnectionChange.fire();
                throw error;
            }
        }

        return connection;
    }

    async closeConnection(connection: SSHConnection): Promise<void> {
        const key = `${connection.config.username}@${connection.config.host}:${connection.config.port}`;
        await connection.disconnect();
        this.connections.delete(key);
        this._onConnectionChange.fire();
    }

    getConnections(): SSHConnection[] {
        return Array.from(this.connections.values());
    }

    getConnection(host: string, username: string, port: number): SSHConnection | undefined {
        const key = `${username}@${host}:${port}`;
        return this.connections.get(key);
    }

    validateConfig(config: SSHConfig): string[] {
        const errors: string[] = [];

        if (!config.host) {
            errors.push('Host is required');
        }

        if (!config.port || config.port < 1 || config.port > 65535) {
            errors.push('Port must be between 1 and 65535');
        }

        if (!config.username) {
            errors.push('Username is required');
        }

        if (!config.password && !config.privateKey) {
            errors.push('Either password or private key is required');
        }

        if (config.privateKey && config.passphrase === '') {
            errors.push('Passphrase cannot be empty if private key is provided');
        }

        return errors;
    }

    dispose(): void {
        for (const connection of this.connections.values()) {
            connection.disconnect().catch(console.error);
        }
        this.connections.clear();
        this._onConnectionChange.dispose();
    }
}
