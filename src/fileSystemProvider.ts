import * as vscode from 'vscode';
import * as path from 'path';
import { ConnectionManager } from './connectionManager';
import { Stats } from 'ssh2-streams';

export class SSHFileSystemProvider implements vscode.FileSystemProvider {
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    constructor(private connectionManager: ConnectionManager) {}

    watch(_uri: vscode.Uri): vscode.Disposable {
        // Implement file watching
        return new vscode.Disposable(() => {});
    }

    async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                sftp.stat(uri.path, (err, stats: Stats) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({
                        type: stats.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File,
                        ctime: Date.now(),
                        mtime: stats.mtime * 1000,
                        size: stats.size
                    });
                });
            });
        });
    }

    async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                sftp.readdir(uri.path, (err, list) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(
                        list.map(item => [
                            item.filename,
                            item.attrs.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File
                        ])
                    );
                });
            });
        });
    }

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                let buffer = Buffer.alloc(0);
                const stream = sftp.createReadStream(uri.path);
                
                stream.on('data', (chunk: Buffer) => {
                    buffer = Buffer.concat([buffer, chunk]);
                });
                
                stream.on('end', () => {
                    resolve(new Uint8Array(buffer));
                });
                
                stream.on('error', (error: Error) => {
                    reject(error);
                });
            });
        });
    }

    async writeFile(uri: vscode.Uri, content: Uint8Array, _options: { create: boolean, overwrite: boolean }): Promise<void> {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                const stream = sftp.createWriteStream(uri.path);
                
                stream.on('close', () => {
                    resolve();
                });
                
                stream.on('error', (error: Error) => {
                    reject(error);
                });
                
                stream.end(Buffer.from(content));
            });
        });
    }

    async delete(uri: vscode.Uri, options: { recursive: boolean }): Promise<void> {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (options.recursive) {
                    this.deleteRecursive(sftp, uri.path).then(resolve).catch(reject);
                } else {
                    sftp.unlink(uri.path, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    }

    private async deleteRecursive(sftp: any, remotePath: string): Promise<void> {
        const list = await new Promise<any[]>((resolve, reject) => {
            sftp.readdir(remotePath, (err: any, list: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(list);
                }
            });
        });

        for (const item of list) {
            const fullPath = path.join(remotePath, item.filename);
            if (item.attrs.isDirectory()) {
                await this.deleteRecursive(sftp, fullPath);
                await new Promise<void>((resolve, reject) => {
                    sftp.rmdir(fullPath, (err: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            } else {
                await new Promise<void>((resolve, reject) => {
                    sftp.unlink(fullPath, (err: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }
        }
    }

    async rename(oldUri: vscode.Uri, newUri: vscode.Uri, _options: { overwrite: boolean }): Promise<void> {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                sftp.rename(oldUri.path, newUri.path, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    async createDirectory(uri: vscode.Uri): Promise<void> {
        const client = await this.connectionManager.getClient();
        return new Promise((resolve, reject) => {
            client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }
                sftp.mkdir(uri.path, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }
}
