import * as net from 'net';
import { Server, ServerConfig, Connection, SFTPWrapper } from 'ssh2';
import { FileEntry } from 'ssh2-streams';
import * as crypto from 'crypto';

// Define SFTP status codes since they're not exported from ssh2-streams
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

interface MockSFTPHandlerContext {
    handle: Buffer;
    path: string;
    flags: number;
    attrs: any;
}

export class MockSSHServer {
    private server: Server;
    private _port: number = 0;
    private mockFiles: Map<string, Buffer> = new Map();
    private activeHandles: Map<string, MockSFTPHandlerContext> = new Map();

    constructor() {
        const hostKey = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        this.server = new Server({
            hostKeys: [hostKey.privateKey]
        }, (client: Connection) => {
            client.on('authentication', (ctx) => {
                if (ctx.method === 'password' && 
                    ctx.username === 'test' && 
                    ctx.password === 'test') {
                    ctx.accept();
                } else {
                    ctx.reject(['password']);
                }
            });

            client.on('ready', () => {
                client.on('session', (accept) => {
                    const session = accept();
                    session.on('sftp', (accept) => {
                        const sftp = accept();
                        this.handleSFTP(sftp);
                    });
                });
            });
        });
    }

    get port(): number {
        return this._port;
    }

    async start(): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(0, 'localhost', () => {
                const address = this.server.address() as net.AddressInfo;
                this._port = address.port;
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            this.server.close(() => resolve());
        });
    }

    async simulateConnectionDrop(): Promise<void> {
        this.server.close();
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.start();
    }

    async createTestFiles(count: number): Promise<void> {
        for (let i = 0; i < count; i++) {
            this.mockFiles.set(
                `/file${i}.txt`,
                Buffer.from(`Content of file ${i}`)
            );
        }
    }

    private handleSFTP(sftp: SFTPWrapper): void {
        sftp.on('OPEN', (reqid, filename, flags, attrs) => {
            const handle = crypto.randomBytes(4);
            this.activeHandles.set(handle.toString('hex'), {
                handle,
                path: filename,
                flags,
                attrs
            });
            sftp.handle(reqid, handle);
        });

        sftp.on('READ', (reqid, handle, offset, length) => {
            const ctx = this.activeHandles.get(handle.toString('hex'));
            if (!ctx) {
                return sftp.status(reqid, SFTP_STATUS.FAILURE);
            }

            const data = this.mockFiles.get(ctx.path);
            if (!data) {
                return sftp.status(reqid, SFTP_STATUS.NO_SUCH_FILE);
            }

            const chunk = data.subarray(offset, offset + length);
            sftp.data(reqid, chunk);
        });

        sftp.on('WRITE', (reqid, handle, offset, data) => {
            const ctx = this.activeHandles.get(handle.toString('hex'));
            if (!ctx) {
                return sftp.status(reqid, SFTP_STATUS.FAILURE);
            }

            let fileData = this.mockFiles.get(ctx.path) || Buffer.alloc(0);
            if (offset + data.length > fileData.length) {
                const newBuffer = Buffer.alloc(offset + data.length);
                fileData.copy(newBuffer);
                fileData = newBuffer;
            }
            data.copy(fileData, offset);
            this.mockFiles.set(ctx.path, fileData);

            sftp.status(reqid, SFTP_STATUS.OK);
        });

        sftp.on('READDIR', (reqid, _handle) => {
            const entries: FileEntry[] = Array.from(this.mockFiles.entries()).map(([name, data]) => ({
                filename: name,
                longname: `drwxr-xr-x 1 mock mock ${data.length} Dec 18 10:00 ${name}`,
                attrs: {
                    size: data.length,
                    uid: 1000,
                    gid: 1000,
                    mode: 0o644,
                    atime: Date.now(),
                    mtime: Date.now()
                }
            }));
            sftp.name(reqid, entries);
        });

        sftp.on('CLOSE', (reqid, handle) => {
            this.activeHandles.delete(handle.toString('hex'));
            sftp.status(reqid, SFTP_STATUS.OK);
        });

        sftp.on('STAT', (reqid, path) => {
            const data = this.mockFiles.get(path);
            if (!data) {
                return sftp.status(reqid, SFTP_STATUS.NO_SUCH_FILE);
            }

            sftp.attrs(reqid, {
                size: data.length,
                uid: 1000,
                gid: 1000,
                mode: 0o644,
                atime: Date.now(),
                mtime: Date.now()
            });
        });
    }
}
