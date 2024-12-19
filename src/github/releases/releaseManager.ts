import { Octokit } from '@octokit/rest';
import * as vscode from 'vscode';
import { Release, ReleaseAsset } from '../types';

export class ReleaseManager {
    private octokit: Octokit;
    private owner: string;
    private repo: string;

    constructor(octokit: Octokit, owner: string, repo: string) {
        this.octokit = octokit;
        this.owner = owner;
        this.repo = repo;
    }

    async createRelease(tag: string, name: string, body: string, draft: boolean = false, prerelease: boolean = false): Promise<Release> {
        try {
            const response = await this.octokit.repos.createRelease({
                owner: this.owner,
                repo: this.repo,
                tag_name: tag,
                name,
                body,
                draft,
                prerelease
            });

            return {
                id: response.data.id,
                name: response.data.name || '',
                tagName: response.data.tag_name,
                body: response.data.body || '',
                draft: response.data.draft,
                prerelease: response.data.prerelease,
                createdAt: response.data.created_at,
                publishedAt: response.data.published_at || '',
                assets: response.data.assets.map(asset => ({
                    id: asset.id,
                    name: asset.name,
                    label: asset.label || '',
                    size: asset.size,
                    downloadCount: asset.download_count,
                    createdAt: asset.created_at,
                    updatedAt: asset.updated_at
                }))
            };
        } catch (error) {
            throw new Error(`Failed to create release: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getReleases(): Promise<Release[]> {
        try {
            const response = await this.octokit.repos.listReleases({
                owner: this.owner,
                repo: this.repo
            });

            return response.data.map(release => ({
                id: release.id,
                name: release.name || '',
                tagName: release.tag_name,
                body: release.body || '',
                draft: release.draft,
                prerelease: release.prerelease,
                createdAt: release.created_at,
                publishedAt: release.published_at || '',
                assets: release.assets.map(asset => ({
                    id: asset.id,
                    name: asset.name,
                    label: asset.label || '',
                    size: asset.size,
                    downloadCount: asset.download_count,
                    createdAt: asset.created_at,
                    updatedAt: asset.updated_at
                }))
            }));
        } catch (error) {
            throw new Error(`Failed to get releases: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async uploadReleaseAsset(releaseId: number, assetPath: string, name: string, label?: string): Promise<ReleaseAsset> {
        try {
            const data = await vscode.workspace.fs.readFile(vscode.Uri.file(assetPath));
            const response = await this.octokit.repos.uploadReleaseAsset({
                owner: this.owner,
                repo: this.repo,
                release_id: releaseId,
                name,
                label,
                data: data as any
            });

            return {
                id: response.data.id,
                name: response.data.name,
                label: response.data.label || '',
                size: response.data.size,
                downloadCount: response.data.download_count,
                createdAt: response.data.created_at,
                updatedAt: response.data.updated_at
            };
        } catch (error) {
            throw new Error(`Failed to upload release asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async deleteRelease(releaseId: number): Promise<void> {
        try {
            await this.octokit.repos.deleteRelease({
                owner: this.owner,
                repo: this.repo,
                release_id: releaseId
            });
        } catch (error) {
            throw new Error(`Failed to delete release: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async deleteReleaseAsset(assetId: number): Promise<void> {
        try {
            await this.octokit.repos.deleteReleaseAsset({
                owner: this.owner,
                repo: this.repo,
                asset_id: assetId
            });
        } catch (error) {
            throw new Error(`Failed to delete release asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async downloadReleaseAsset(assetId: number, targetPath: string): Promise<void> {
        try {
            const response = await this.octokit.repos.getReleaseAsset({
                owner: this.owner,
                repo: this.repo,
                asset_id: assetId,
                headers: {
                    accept: 'application/octet-stream'
                }
            });

            const data = Buffer.from(response.data as any);
            await vscode.workspace.fs.writeFile(vscode.Uri.file(targetPath), data);
        } catch (error) {
            throw new Error(`Failed to download release asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
