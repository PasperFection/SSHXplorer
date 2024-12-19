import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { GitHubAuthentication } from './githubAuthentication';
import { EventEmitter } from 'vscode';
import { GitHubRepository } from './models/githubRepository';
import { GitHubBranch } from './models/githubBranch';

export class GitHubManager {
    private _octokit: Octokit | undefined;
    private _onDidChangeRepository = new EventEmitter<GitHubRepository>();
    readonly onDidChangeRepository = this._onDidChangeRepository.event;

    constructor(
        private auth: GitHubAuthentication
    ) {}

    async initialize(): Promise<void> {
        try {
            const token = await this.auth.getToken();
            if (token) {
                this._octokit = new Octokit({ auth: token });
            }
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to initialize GitHub: ${error.message}`);
            }
        }
    }

    get octokit(): Octokit | undefined {
        return this._octokit;
    }

    private emitRepositoryChange(repository: GitHubRepository): void {
        this._onDidChangeRepository.fire(repository);
    }

    async cloneRepository(repoUrl: string, localPath: string): Promise<void> {
        if (!this._octokit) {
            throw new Error('GitHub not initialized');
        }

        // Extract owner and repo from URL
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            throw new Error('Invalid GitHub repository URL');
        }

        const [, owner, repo] = match;
        
        try {
            const { data: repoData } = await this._octokit.repos.get({
                owner,
                repo,
            });

            const repository = new GitHubRepository(repoData);
            this.emitRepositoryChange(repository);

            // Clone repository using Git commands
            const git = require('simple-git')();
            await git.clone(repoUrl, localPath);

        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to clone repository: ${error.message}`);
            }
            throw error;
        }
    }

    async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
        if (!this._octokit) {
            throw new Error('GitHub not initialized');
        }

        const { data: branches } = await this._octokit.repos.listBranches({
            owner,
            repo,
        });

        return branches.map(branch => new GitHubBranch(branch));
    }

    async createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body: string): Promise<void> {
        if (!this._octokit) {
            throw new Error('GitHub not initialized');
        }

        await this._octokit.pulls.create({
            owner,
            repo,
            title,
            head,
            base,
            body,
        });
    }

    async getIssues(owner: string, repo: string): Promise<any[]> {
        if (!this._octokit) {
            throw new Error('GitHub not initialized');
        }

        const { data: issues } = await this._octokit.issues.listForRepo({
            owner,
            repo,
        });

        return issues;
    }

    dispose(): void {
        this._onDidChangeRepository.dispose();
    }
}
