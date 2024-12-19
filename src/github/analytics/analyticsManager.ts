import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { AnalyticsWebview } from './analyticsWebview';

export interface CommitActivity {
    total: number;
    week: number;
    days: number[];
    author: {
        login: string;
        contributions: number;
    };
}

export interface CodeFrequency {
    week: number;
    additions: number;
    deletions: number;
}

export interface PunchCard {
    day: number;
    hour: number;
    commits: number;
}

export interface RepositoryTraffic {
    count: number;
    uniques: number;
    views: {
        timestamp: string;
        count: number;
        uniques: number;
    }[];
}

export interface ContributorStats {
    author: {
        login: string;
        avatar_url: string;
    };
    total: number;
    weeks: {
        week: number;
        additions: number;
        deletions: number;
        commits: number;
    }[];
}

export class AnalyticsManager {
    private analyticsWebview: AnalyticsWebview | undefined;
    private refreshInterval: NodeJS.Timer | undefined;

    constructor(
        private octokit: Octokit,
        private extensionUri: vscode.Uri
    ) {}

    public async showAnalytics(owner: string, repo: string): Promise<void> {
        try {
            const [
                commitActivity,
                codeFrequency,
                punchCard,
                traffic,
                contributorStats
            ] = await Promise.all([
                this.getCommitActivity(owner, repo),
                this.getCodeFrequency(owner, repo),
                this.getPunchCard(owner, repo),
                this.getTraffic(owner, repo),
                this.getContributorStats(owner, repo)
            ]);

            this.analyticsWebview = new AnalyticsWebview(
                this.extensionUri,
                {
                    owner,
                    repo,
                    commitActivity,
                    codeFrequency,
                    punchCard,
                    traffic,
                    contributorStats
                },
                async (action) => {
                    await this.handleAnalyticsAction(owner, repo, action);
                }
            );

            await this.analyticsWebview.show();
            this.startAutoRefresh(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load analytics: ${error.message}`);
        }
    }

    private async getCommitActivity(owner: string, repo: string): Promise<CommitActivity[]> {
        const { data } = await this.octokit.repos.getCommitActivityStats({
            owner,
            repo
        });
        return data || [];
    }

    private async getCodeFrequency(owner: string, repo: string): Promise<CodeFrequency[]> {
        const { data } = await this.octokit.repos.getCodeFrequencyStats({
            owner,
            repo
        });
        return data.map(([week, additions, deletions]) => ({
            week,
            additions,
            deletions: Math.abs(deletions)
        }));
    }

    private async getPunchCard(owner: string, repo: string): Promise<PunchCard[]> {
        const { data } = await this.octokit.repos.getPunchCardStats({
            owner,
            repo
        });
        return data.map(([day, hour, commits]) => ({
            day,
            hour,
            commits
        }));
    }

    private async getTraffic(owner: string, repo: string): Promise<RepositoryTraffic> {
        try {
            const { data } = await this.octokit.repos.getViews({
                owner,
                repo,
                per: 'day'
            });
            return data;
        } catch (error) {
            // Traffic data might not be available for all repositories
            return {
                count: 0,
                uniques: 0,
                views: []
            };
        }
    }

    private async getContributorStats(owner: string, repo: string): Promise<ContributorStats[]> {
        const { data } = await this.octokit.repos.getContributorsStats({
            owner,
            repo
        });
        return data || [];
    }

    public async getLanguageStats(owner: string, repo: string): Promise<Record<string, number>> {
        const { data } = await this.octokit.repos.listLanguages({
            owner,
            repo
        });
        return data;
    }

    public async getTopPaths(owner: string, repo: string): Promise<any[]> {
        try {
            const { data } = await this.octokit.repos.getTopPaths({
                owner,
                repo
            });
            return data;
        } catch {
            return [];
        }
    }

    public async getTopReferrers(owner: string, repo: string): Promise<any[]> {
        try {
            const { data } = await this.octokit.repos.getTopReferrers({
                owner,
                repo
            });
            return data;
        } catch {
            return [];
        }
    }

    public async getClones(owner: string, repo: string): Promise<any> {
        try {
            const { data } = await this.octokit.repos.getClones({
                owner,
                repo,
                per: 'day'
            });
            return data;
        } catch {
            return {
                count: 0,
                uniques: 0,
                clones: []
            };
        }
    }

    private async handleAnalyticsAction(owner: string, repo: string, action: any): Promise<void> {
        switch (action.type) {
            case 'refresh':
                await this.refreshAnalytics(owner, repo);
                break;

            case 'getLanguages':
                const languages = await this.getLanguageStats(owner, repo);
                this.analyticsWebview?.updateLanguages(languages);
                break;

            case 'getTopPaths':
                const paths = await this.getTopPaths(owner, repo);
                this.analyticsWebview?.updateTopPaths(paths);
                break;

            case 'getTopReferrers':
                const referrers = await this.getTopReferrers(owner, repo);
                this.analyticsWebview?.updateTopReferrers(referrers);
                break;

            case 'getClones':
                const clones = await this.getClones(owner, repo);
                this.analyticsWebview?.updateClones(clones);
                break;
        }
    }

    private async refreshAnalytics(owner: string, repo: string): Promise<void> {
        try {
            const [
                commitActivity,
                codeFrequency,
                punchCard,
                traffic,
                contributorStats
            ] = await Promise.all([
                this.getCommitActivity(owner, repo),
                this.getCodeFrequency(owner, repo),
                this.getPunchCard(owner, repo),
                this.getTraffic(owner, repo),
                this.getContributorStats(owner, repo)
            ]);

            this.analyticsWebview?.update({
                commitActivity,
                codeFrequency,
                punchCard,
                traffic,
                contributorStats
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to refresh analytics: ${error.message}`);
        }
    }

    private startAutoRefresh(owner: string, repo: string): void {
        // Refresh analytics every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.refreshAnalytics(owner, repo);
        }, 5 * 60 * 1000);
    }

    private generateInsights(data: any): string {
        const insights = [];

        // Analyze commit patterns
        const recentActivity = data.commitActivity.slice(-4);
        const avgCommits = recentActivity.reduce((sum, week) => sum + week.total, 0) / 4;
        
        if (avgCommits > 50) {
            insights.push('High commit activity in the past month');
        } else if (avgCommits < 10) {
            insights.push('Low commit activity in the past month');
        }

        // Analyze code changes
        const recentChanges = data.codeFrequency.slice(-4);
        const netChanges = recentChanges.reduce((sum, week) => 
            sum + week.additions - week.deletions, 0);

        if (netChanges > 1000) {
            insights.push('Significant code growth in the past month');
        } else if (netChanges < -1000) {
            insights.push('Major code cleanup in the past month');
        }

        // Analyze contributor patterns
        const activeContributors = data.contributorStats.filter(
            contributor => contributor.weeks.slice(-4).some(week => week.commits > 0)
        ).length;

        if (activeContributors > 5) {
            insights.push('Active collaboration with multiple contributors');
        } else if (activeContributors === 1) {
            insights.push('Limited contributor engagement');
        }

        return insights.join('\\n');
    }

    public dispose(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.analyticsWebview?.dispose();
    }
}
