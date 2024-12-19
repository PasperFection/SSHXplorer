import * as zlib from 'zlib';
import { Readable, Writable } from 'stream';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

export enum CompressionType {
    GZIP = 'gzip',
    DEFLATE = 'deflate',
    BROTLI = 'brotli',
    NONE = 'none'
}

interface CompressionTypeMap {
    [key: number]: CompressionType;
}

interface CompressionStats {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    type: CompressionType;
}

export class CompressionManager {
    private static readonly COMPRESSION_THRESHOLD = 1024; // 1KB
    private static readonly COMPRESSION_HEADER_SIZE = 4;
    private static readonly COMPRESSION_TYPE_MAP = {
        [CompressionType.GZIP]: 1,
        [CompressionType.DEFLATE]: 2,
        [CompressionType.BROTLI]: 3
    };

    private static readonly COMPRESSION_TYPE_REVERSE_MAP: CompressionTypeMap = {
        1: CompressionType.GZIP,
        2: CompressionType.DEFLATE,
        3: CompressionType.BROTLI
    };

    static async compress(
        data: Buffer,
        type: CompressionType = CompressionType.GZIP
    ): Promise<{ compressed: Buffer; stats: CompressionStats }> {
        if (data.length < this.COMPRESSION_THRESHOLD) {
            return {
                compressed: data,
                stats: {
                    originalSize: data.length,
                    compressedSize: data.length,
                    compressionRatio: 1,
                    type: CompressionType.NONE
                }
            };
        }

        let compressedData: Buffer;
        
        switch (type) {
            case CompressionType.GZIP:
                compressedData = await gzip(data);
                break;
            case CompressionType.DEFLATE:
                compressedData = await deflate(data);
                break;
            case CompressionType.BROTLI:
                compressedData = await brotliCompress(data);
                break;
            default:
                throw new Error(`Unsupported compression type: ${type}`);
        }

        // Add compression type header
        const header = Buffer.alloc(this.COMPRESSION_HEADER_SIZE);
        header.writeUInt32BE(this.COMPRESSION_TYPE_MAP[type]);
        
        const compressed = Buffer.concat([header, compressedData]);

        return {
            compressed,
            stats: {
                originalSize: data.length,
                compressedSize: compressed.length,
                compressionRatio: data.length / compressed.length,
                type
            }
        };
    }

    static async decompress(
        data: Buffer,
        type?: CompressionType
    ): Promise<Buffer> {
        if (data.length < this.COMPRESSION_HEADER_SIZE) {
            throw new Error('Invalid compressed data');
        }

        // Read compression type from header
        const typeId = data.readUInt32BE(0);
        const compressionType = this.COMPRESSION_TYPE_REVERSE_MAP[typeId];
        
        if (!compressionType) {
            throw new Error('Invalid compression type in header');
        }

        if (type && type !== compressionType) {
            throw new Error('Invalid compression type');
        }

        const compressedData = data.subarray(this.COMPRESSION_HEADER_SIZE);

        try {
            switch (compressionType) {
                case CompressionType.GZIP:
                    return await gunzip(compressedData);
                case CompressionType.DEFLATE:
                    return await inflate(compressedData);
                case CompressionType.BROTLI:
                    return await brotliDecompress(compressedData);
                default:
                    throw new Error(`Unsupported compression type: ${compressionType}`);
            }
        } catch (error) {
            throw new Error('Invalid compressed data');
        }
    }

    static createCompressStream(type: CompressionType): Writable {
        switch (type) {
            case CompressionType.GZIP:
                return zlib.createGzip();
            case CompressionType.DEFLATE:
                return zlib.createDeflate();
            case CompressionType.BROTLI:
                return zlib.createBrotliCompress();
            default:
                return new Writable({
                    write(_chunk: any, _encoding: string, callback: () => void) {
                        callback();
                    }
                });
        }
    }

    static createDecompressStream(type: CompressionType): Readable {
        switch (type) {
            case CompressionType.GZIP:
                return zlib.createGunzip();
            case CompressionType.DEFLATE:
                return zlib.createInflate();
            case CompressionType.BROTLI:
                return zlib.createBrotliDecompress();
            default:
                return new Readable({
                    read() {}
                });
        }
    }

    static async suggestCompressionType(
        sampleData: Buffer
    ): Promise<CompressionType> {
        if (sampleData.length < this.COMPRESSION_THRESHOLD) {
            return CompressionType.NONE;
        }

        const results = await Promise.all([
            this.compress(sampleData, CompressionType.GZIP),
            this.compress(sampleData, CompressionType.DEFLATE),
            this.compress(sampleData, CompressionType.BROTLI)
        ]);

        const bestCompression = results.reduce((best, current) => {
            return current.stats.compressionRatio > best.stats.compressionRatio
                ? current
                : best;
        });

        return bestCompression.stats.type;
    }
}
