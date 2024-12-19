declare module '../../compression' {
    export interface CompressionStats {
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
    }

    export class CompressionManager {
        static compress(data: Buffer): Promise<{ compressed: Buffer; stats: CompressionStats }>;
        static decompress(data: Buffer): Promise<Buffer>;
    }
}
