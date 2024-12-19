import * as assert from 'assert';
import { CompressionManager, CompressionType } from '../../compression/compressionManager';

suite('Compression Tests', () => {
    const testData = {
        empty: Buffer.from(''),
        small: Buffer.from('Hello, World!'),
        medium: Buffer.from('A'.repeat(1000)),
        large: Buffer.from('B'.repeat(100000)),
        random: Buffer.from(Array(1000).fill(0).map(() => Math.floor(Math.random() * 256)))
    };

    test('should compress and decompress empty data', async () => {
        const result = await CompressionManager.compress(testData.empty);
        const decompressed = await CompressionManager.decompress(result.compressed);
        assert.deepStrictEqual(decompressed, testData.empty);
    });

    test('should compress and decompress small data', async () => {
        const result = await CompressionManager.compress(testData.small);
        const decompressed = await CompressionManager.decompress(result.compressed);
        assert.deepStrictEqual(decompressed, testData.small);
    });

    test('should compress and decompress medium data', async () => {
        const result = await CompressionManager.compress(testData.medium);
        const decompressed = await CompressionManager.decompress(result.compressed);
        assert.deepStrictEqual(decompressed, testData.medium);
    });

    test('should compress and decompress large data', async () => {
        const result = await CompressionManager.compress(testData.large);
        const decompressed = await CompressionManager.decompress(result.compressed);
        assert.deepStrictEqual(decompressed, testData.large);
    });

    test('should compress and decompress random data', async () => {
        const result = await CompressionManager.compress(testData.random);
        const decompressed = await CompressionManager.decompress(result.compressed);
        assert.deepStrictEqual(decompressed, testData.random);
    });

    test('should achieve compression for repetitive data', async () => {
        const result = await CompressionManager.compress(testData.medium);
        assert.ok(result.compressed.length < testData.medium.length, 'Compressed data should be smaller than original');
    });

    test('should handle all compression types', async () => {
        const data = Buffer.from('Test data for compression');
        
        for (const type of Object.values(CompressionType)) {
            const result = await CompressionManager.compress(data, type);
            const decompressed = await CompressionManager.decompress(result.compressed);
            assert.deepStrictEqual(decompressed, data, `Failed for compression type: ${type}`);
        }
    });

    test('should throw error for invalid compressed data', async () => {
        const invalidData = Buffer.from('Not a valid compressed data');
        await assert.rejects(
            async () => {
                await CompressionManager.decompress(invalidData);
            },
            /Invalid compressed data/
        );
    });

    test('should handle concurrent compression operations', async () => {
        const compressionPromises = Object.values(testData).map(data => 
            CompressionManager.compress(data)
        );

        const compressedResults = await Promise.all(compressionPromises);
        
        const decompressionPromises = compressedResults.map(result => 
            CompressionManager.decompress(result.compressed)
        );

        const decompressedResults = await Promise.all(decompressionPromises);
        
        Object.values(testData).forEach((original, index) => {
            assert.deepStrictEqual(decompressedResults[index], original);
        });
    });

    test('should preserve data integrity for all compression types', async () => {
        const data = Buffer.from('Test data with special characters: !@#$%^&*()_+');
        
        for (const type of Object.values(CompressionType)) {
            const result = await CompressionManager.compress(data, type);
            const decompressed = await CompressionManager.decompress(result.compressed);
            assert.deepStrictEqual(decompressed, data, `Data integrity failed for compression type: ${type}`);
        }
    });

    test('should handle compression type header correctly', async () => {
        const data = Buffer.from('Test data');
        
        for (const type of Object.values(CompressionType)) {
            const result = await CompressionManager.compress(data, type);
            const header = result.compressed.slice(0, 1);
            const compressionType = result.compressed.readUInt8(0);
            assert.strictEqual(compressionType, type, `Invalid compression type header for: ${type}`);
        }
    });

    test('should provide compression statistics', async () => {
        const data = Buffer.from('Test data for compression stats');
        const result = await CompressionManager.compress(data);
        
        assert.ok(result.stats, 'Compression stats should be present');
        assert.ok(typeof result.stats.originalSize === 'number', 'Original size should be a number');
        assert.ok(typeof result.stats.compressedSize === 'number', 'Compressed size should be a number');
        assert.ok(result.stats.compressionRatio > 0, 'Compression ratio should be greater than 0');
        assert.ok(typeof result.stats.compressionTime === 'number', 'Compression time should be a number');
    });
});
