import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class FileCache {
    private cacheDir: string;
    private cacheMap: Map<string, CacheEntry>;
    private readonly maxCacheSize: number = 1024 * 1024 * 100; // 100MB
    private currentCacheSize: number = 0;

    constructor() {
        this.cacheDir = path.join(os.tmpdir(), 'sshxplorer-cache');
        this.cacheMap = new Map();
        this.initializeCache();
    }

    private initializeCache() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    private getCacheKey(uri: vscode.Uri): string {
        return crypto.createHash('md5').update(uri.toString()).digest('hex');
    }

    async getCachedFile(uri: vscode.Uri): Promise<Buffer | undefined> {
        const key = this.getCacheKey(uri);
        const entry = this.cacheMap.get(key);

        if (entry && !this.isExpired(entry)) {
            const cachePath = path.join(this.cacheDir, key);
            try {
                return await fs.promises.readFile(cachePath);
            } catch {
                this.cacheMap.delete(key);
                return undefined;
            }
        }

        return undefined;
    }

    async cacheFile(uri: vscode.Uri, content: Buffer): Promise<void> {
        const key = this.getCacheKey(uri);
        const cachePath = path.join(this.cacheDir, key);

        // Check if we need to make space in the cache
        if (this.currentCacheSize + content.length > this.maxCacheSize) {
            await this.evictOldEntries(content.length);
        }

        // Write to cache
        await fs.promises.writeFile(cachePath, content);
        
        this.cacheMap.set(key, {
            uri: uri.toString(),
            size: content.length,
            timestamp: Date.now()
        });

        this.currentCacheSize += content.length;
    }

    private async evictOldEntries(requiredSpace: number) {
        const entries = Array.from(this.cacheMap.entries())
            .sort(([, a], [, b]) => a.timestamp - b.timestamp);

        for (const [key, entry] of entries) {
            if (this.currentCacheSize + requiredSpace <= this.maxCacheSize) {
                break;
            }

            const cachePath = path.join(this.cacheDir, key);
            try {
                await fs.promises.unlink(cachePath);
                this.currentCacheSize -= entry.size;
                this.cacheMap.delete(key);
            } catch {
                // Ignore errors during cache cleanup
            }
        }
    }

    private isExpired(entry: CacheEntry): boolean {
        const maxAge = 1000 * 60 * 60; // 1 hour
        return Date.now() - entry.timestamp > maxAge;
    }

    async invalidateCache(uri: vscode.Uri): Promise<void> {
        const key = this.getCacheKey(uri);
        const entry = this.cacheMap.get(key);

        if (entry) {
            const cachePath = path.join(this.cacheDir, key);
            try {
                await fs.promises.unlink(cachePath);
                this.currentCacheSize -= entry.size;
                this.cacheMap.delete(key);
            } catch {
                // Ignore errors during invalidation
            }
        }
    }

    async clearCache(): Promise<void> {
        for (const [key, entry] of this.cacheMap.entries()) {
            const cachePath = path.join(this.cacheDir, key);
            try {
                await fs.promises.unlink(cachePath);
            } catch {
                // Ignore errors during cleanup
            }
        }

        this.cacheMap.clear();
        this.currentCacheSize = 0;
    }
}

interface CacheEntry {
    uri: string;
    size: number;
    timestamp: number;
}
