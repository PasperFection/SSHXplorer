declare module 'ssh2-streams' {
    import { Buffer } from 'buffer';

    export interface SFTPWrapper {
        readdir(path: string, callback: (err: Error | null, list?: any[]) => void): void;
        open(filename: string, flags: string, attrs: any, callback: (err: Error | null, handle: Buffer) => void): void;
        close(handle: Buffer, callback: (err: Error | null) => void): void;
        read(handle: Buffer, buffer: Buffer, offset: number, length: number, position: number, callback: (err: Error | null, bytesRead: number, buffer: Buffer, position: number) => void): void;
        write(handle: Buffer, buffer: Buffer, offset: number, length: number, position: number, callback: (err: Error | null) => void): void;
        unlink(path: string, callback: (err: Error | null) => void): void;
        rename(oldPath: string, newPath: string, callback: (err: Error | null) => void): void;
        mkdir(path: string, attrs: any, callback: (err: Error | null) => void): void;
        rmdir(path: string, callback: (err: Error | null) => void): void;
        stat(path: string, callback: (err: Error | null, stats: any) => void): void;
        lstat(path: string, callback: (err: Error | null, stats: any) => void): void;
        setstat(path: string, attrs: any, callback: (err: Error | null) => void): void;
        symlink(targetPath: string, linkPath: string, callback: (err: Error | null) => void): void;
        readlink(path: string, callback: (err: Error | null, target: string) => void): void;
        realpath(path: string, callback: (err: Error | null, resolvedPath: string) => void): void;
        on(event: string, listener: (...args: any[]) => void): void;
        end(): void;
    }

    export interface Stats {
        mode: number;
        uid: number;
        gid: number;
        size: number;
        atime: number;
        mtime: number;
        isDirectory(): boolean;
        isFile(): boolean;
        isSymbolicLink(): boolean;
    }

    export interface SFTP {
        OPEN_MODE: {
            READ: string;
            WRITE: string;
            APPEND: string;
            CREATE: string;
            TRUNCATE: string;
            EXCL: string;
        };
        STATUS_CODE: {
            OK: number;
            EOF: number;
            NO_SUCH_FILE: number;
            PERMISSION_DENIED: number;
            FAILURE: number;
            BAD_MESSAGE: number;
            NO_CONNECTION: number;
            CONNECTION_LOST: number;
            OP_UNSUPPORTED: number;
        };
    }
}
