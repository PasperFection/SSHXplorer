import * as vscode from 'vscode';
import { Readable, Writable } from 'stream';
import { FileCache } from '../cache/fileCache';

export class LargeFileHandler {
    private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    private static readonly MAX_MEMORY_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    constructor(private fileCache: FileCache) {}

    async readLargeFile(
        readStream: Readable,
        progressCallback?: (progress: number) => void
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            let totalLength = 0;

            readStream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
                totalLength += chunk.length;

                if (progressCallback) {
                    progressCallback(totalLength);
                }

                // If file becomes too large for memory, switch to disk
                if (totalLength > LargeFileHandler.MAX_MEMORY_FILE_SIZE) {
                    // Implementation for disk-based handling
                }
            });

            readStream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });

            readStream.on('error', (err) => {
                reject(err);
            });
        });
    }

    async writeLargeFile(
        writeStream: Writable,
        content: Buffer,
        progressCallback?: (progress: number) => void
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            let written = 0;
            const totalSize = content.length;

            const writeChunk = () => {
                let shouldContinue = true;
                while (shouldContinue && written < totalSize) {
                    const chunk = content.slice(
                        written,
                        Math.min(written + LargeFileHandler.CHUNK_SIZE, totalSize)
                    );
                    
                    shouldContinue = writeStream.write(chunk);
                    written += chunk.length;

                    if (progressCallback) {
                        progressCallback(written);
                    }
                }

                if (written < totalSize) {
                    writeStream.once('drain', writeChunk);
                } else {
                    writeStream.end();
                }
            };

            writeStream.on('finish', () => {
                resolve();
            });

            writeStream.on('error', (err) => {
                reject(err);
            });

            writeChunk();
        });
    }

    async streamLargeFile(
        readStream: Readable,
        writeStream: Writable,
        progressCallback?: (progress: number) => void
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            let processed = 0;

            readStream.on('data', (chunk: Buffer) => {
                processed += chunk.length;
                
                if (progressCallback) {
                    progressCallback(processed);
                }
            });

            readStream.pipe(writeStream);

            writeStream.on('finish', () => {
                resolve();
            });

            readStream.on('error', reject);
            writeStream.on('error', reject);
        });
    }
}
