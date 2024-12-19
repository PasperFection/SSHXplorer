import * as ssh2 from 'ssh2';
import * as vscode from 'vscode';

export interface SSHConfig {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
}

export interface ConnectionStats {
    uptime: number;
    operations: number;
    transferRate: number;
}

export class SSHConnection {
    private client: ssh2.Client;
    private _isActive: boolean = false;
    private connectionTime?: Date;
    private lastError?: string;
    private stats: ConnectionStats = {
        uptime: 0,
        operations: 0,
        transferRate: 0
    };

    constructor(public readonly config: SSHConfig) {
        this.client = new ssh2.Client();
        this.setupClientEventHandlers();
    }

    private setupClientEventHandlers(): void {
        this.client.on('ready', () => {
            this._isActive = true;
            this.connectionTime = new Date();
            this.lastError = undefined;
        });

        this.client.on('error', (err) => {
            this._isActive = false;
            this.lastError = err.message;
        });

        this.client.on('end', () => {
            this._isActive = false;
        });
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.connect({
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
                password: this.config.password,
                privateKey: this.config.privateKey,
                passphrase: this.config.passphrase
            });

            this.client.once('ready', () => resolve());
            this.client.once('error', (err) => reject(err));
        });
    }

    async disconnect(): Promise<void> {
        return new Promise((resolve) => {
            this.client.end();
            this._isActive = false;
            resolve();
        });
    }

    getClient(): ssh2.Client {
        return this.client;
    }

    getConnectionStats(): ConnectionStats {
        if (this.connectionTime) {
            this.stats.uptime = Date.now() - this.connectionTime.getTime();
        }
        return { ...this.stats };
    }

    getHost(): string {
        return this.config.host;
    }

    getPort(): number {
        return this.config.port;
    }

    getUsername(): string {
        return this.config.username;
    }

    getConnectionTime(): Date | undefined {
        return this.connectionTime;
    }

    getLastError(): string | undefined {
        return this.lastError;
    }

    isActive(): boolean {
        return this._isActive;
    }

    async createSFTPSession(): Promise<ssh2.SFTPWrapper> {
        return new Promise((resolve, reject) => {
            this.client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(sftp);
            });
        });
    }

    recordOperation(): void {
        this.stats.operations++;
    }

    updateTransferRate(bytesPerSecond: number): void {
        this.stats.transferRate = bytesPerSecond;
    }
}
