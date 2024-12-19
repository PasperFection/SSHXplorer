import * as ssh2 from 'ssh2';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';

const SFTP_STATUS = {
    OK: 0,
    EOF: 1,
    NO_SUCH_FILE: 2,
    PERMISSION_DENIED: 3,
    FAILURE: 4,
    BAD_MESSAGE: 5,
    NO_CONNECTION: 6,
    CONNECTION_LOST: 7,
    OP_UNSUPPORTED: 8
};

export class TestServer {
    private server: ssh2.Server;
    private connections: Set<ssh2.Connection> = new Set();
    private port: number = 0;
    private privateKey: string;
    private testDir: string;

    constructor() {
        this.privateKey = this.generateKeyPair();
        this.testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sshxplorer-test-'));
        this.server = new ssh2.Server({
            hostKeys: [this.privateKey]
        }, this.handleConnection.bind(this));
    }

    async start(): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(0, 'localhost', () => {
                const address = this.server.address() as { port: number };
                this.port = address.port;
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        for (const connection of this.connections) {
            connection.end();
        }
        return new Promise((resolve) => {
            this.server.close(() => {
                fs.rmSync(this.testDir, { recursive: true, force: true });
                resolve();
            });
        });
    }

    getPort(): number {
        return this.port;
    }

    getPrivateKey(): string {
        return this.privateKey;
    }

    async simulateNetworkFailure(): Promise<void> {
        for (const connection of this.connections) {
            connection.end();
        }
    }

    private handleConnection(client: ssh2.Connection): void {
        this.connections.add(client);

        client.on('authentication', (ctx) => {
            if (ctx.method === 'password' && ctx.username === 'test' && ctx.password === 'test') {
                ctx.accept();
            } else if (ctx.method === 'publickey' && ctx.username === 'test') {
                ctx.accept();
            } else {
                ctx.reject(['password', 'publickey']);
            }
        });

        client.on('ready', () => {
            client.on('session', (accept) => {
                const session = accept();
                session.on('sftp', (accept) => {
                    const sftp = accept();
                    this.setupSFTPHandlers(sftp);
                });
            });
        });

        client.on('end', () => {
            this.connections.delete(client);
        });
    }

    private setupSFTPHandlers(sftp: ssh2.SFTPWrapper): void {
        const virtualFS = new Map<string, Buffer>();

        sftp.on('STAT', (reqid, path) => {
            const stats = {
                mode: 0o644,
                uid: 0,
                gid: 0,
                size: virtualFS.get(path)?.length || 0,
                atime: Math.floor(Date.now() / 1000),
                mtime: Math.floor(Date.now() / 1000)
            };
            sftp.status(reqid, SFTP_STATUS.OK);
            sftp.attrs(reqid, stats);
        });

        sftp.on('READ', (reqid, handle, offset, length) => {
            const data = virtualFS.get(handle.toString());
            if (data) {
                const chunk = data.slice(offset, offset + length);
                sftp.data(reqid, chunk);
                sftp.status(reqid, SFTP_STATUS.OK);
            } else {
                sftp.status(reqid, SFTP_STATUS.NO_SUCH_FILE);
            }
        });

        sftp.on('WRITE', (reqid, handle, offset, data) => {
            let buffer = virtualFS.get(handle.toString()) || Buffer.alloc(0);
            if (offset + data.length > buffer.length) {
                const newBuffer = Buffer.alloc(offset + data.length);
                buffer.copy(newBuffer);
                buffer = newBuffer;
            }
            data.copy(buffer, offset);
            virtualFS.set(handle.toString(), buffer);
            sftp.status(reqid, SFTP_STATUS.OK);
        });

        sftp.on('CLOSE', (reqid, handle) => {
            virtualFS.delete(handle.toString());
            sftp.status(reqid, SFTP_STATUS.OK);
        });
    }

    private generateKeyPair(): string {
        const { privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        return privateKey;
    }
}
