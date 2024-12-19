import * as vscode from 'vscode';
import { ConnectionManager } from '../connectionManager';
import { SSHConnection } from '../connection/sshConnection';
import { Buffer } from 'buffer';

export class SSHFileSystemProvider implements vscode.FileSystemProvider {
    private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFile.event;

    constructor(private connectionManager: ConnectionManager) {
        this.connectionManager.onConnectionChange(() => {
            this._onDidChangeFile.fire([]);
        });
    }

    watch(_resource: vscode.Uri, _options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        return new vscode.Disposable(() => {});
    }

    stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        return new Promise((resolve, reject) => {
            const connection = this.getConnection(uri);
            if (!connection) {
                reject(new Error('No connection available'));
                return;
            }

            connection.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }

                sftp.stat(uri.path, (err, stats) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve({
                        type: stats.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File,
                        ctime: stats.mtime * 1000,
                        mtime: stats.mtime * 1000,
                        size: stats.size
                    });
                });
            });
        });
    }

    readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        return new Promise((resolve, reject) => {
            const connection = this.getConnection(uri);
            if (!connection) {
                reject(new Error('No connection available'));
                return;
            }

            connection.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }

                sftp.readdir(uri.path, (err, list) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const result: [string, vscode.FileType][] = list.map(item => {
                        return [
                            item.filename,
                            item.attrs.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File
                        ];
                    });

                    resolve(result);
                });
            });
        });
    }

    createDirectory(uri: vscode.Uri): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection = this.getConnection(uri);
            if (!connection) {
                reject(new Error('No connection available'));
                return;
            }

            connection.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }

                sftp.mkdir(uri.path, {}, err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });
        });
    }

    readFile(uri: vscode.Uri): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const connection = this.getConnection(uri);
            if (!connection) {
                reject(new Error('No connection available'));
                return;
            }

            connection.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }

                sftp.readFile(uri.path, (err, data) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(new Uint8Array(data));
                });
            });
        });
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection = this.getConnection(uri);
            if (!connection) {
                reject(new Error('No connection available'));
                return;
            }

            connection.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }

                const buffer = Buffer.from(content);
                sftp.writeFile(uri.path, buffer, {}, err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });
        });
    }

    delete(uri: vscode.Uri, options: { recursive: boolean; }): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection = this.getConnection(uri);
            if (!connection) {
                reject(new Error('No connection available'));
                return;
            }

            connection.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (options.recursive) {
                    this.deleteRecursive(sftp, uri.path)
                        .then(resolve)
                        .catch(reject);
                } else {
                    sftp.unlink(uri.path, err => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        resolve();
                    });
                }
            });
        });
    }

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection = this.getConnection(oldUri);
            if (!connection) {
                reject(new Error('No connection available'));
                return;
            }

            connection.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }

                sftp.rename(oldUri.path, newUri.path, err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });
        });
    }

    private getConnection(uri: vscode.Uri): SSHConnection | undefined {
        const host = this.connectionManager.getHostFromUri(uri);
        return this.connectionManager.getConnection({ host, username: '' });
    }

    private async deleteRecursive(sftp: any, path: string): Promise<void> {
        const list = await new Promise<any[]>((resolve, reject) => {
            sftp.readdir(path, (err: Error | null, list: any[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(list);
            });
        });

        for (const item of list) {
            const fullPath = `${path}/${item.filename}`;
            if (item.attrs.isDirectory()) {
                await this.deleteRecursive(sftp, fullPath);
                await new Promise<void>((resolve, reject) => {
                    sftp.rmdir(fullPath, (err: Error | null) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                });
            } else {
                await new Promise<void>((resolve, reject) => {
                    sftp.unlink(fullPath, (err: Error | null) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                });
            }
        }

        await new Promise<void>((resolve, reject) => {
            sftp.rmdir(path, (err: Error | null) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
}
