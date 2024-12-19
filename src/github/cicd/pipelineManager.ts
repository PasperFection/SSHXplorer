import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { PipelineWebview } from './pipelineWebview';

export interface WorkflowRun {
    id: number;
    name: string;
    status: string;
    conclusion: string;
    branch: string;
    commit: string;
    duration: number;
    startedAt: string;
    completedAt?: string;
    jobs: WorkflowJob[];
}

export interface WorkflowJob {
    id: number;
    name: string;
    status: string;
    conclusion: string;
    startedAt: string;
    completedAt?: string;
    steps: WorkflowStep[];
}

export interface WorkflowStep {
    name: string;
    status: string;
    conclusion: string;
    number: number;
    startedAt: string;
    completedAt?: string;
}

export interface PipelineMetrics {
    totalRuns: number;
    successRate: number;
    averageDuration: number;
    failureRate: number;
    branchCoverage: { [key: string]: number };
    commonFailures: { [key: string]: number };
    timelineData: {
        labels: string[];
        success: number[];
        failure: number[];
    };
}

export class PipelineManager {
    private pipelineWebview: PipelineWebview | undefined;
    private refreshInterval: NodeJS.Timer | undefined;

    constructor(
        private octokit: Octokit,
        private extensionUri: vscode.Uri
    ) {}

    public async showPipelineAnalytics(owner: string, repo: string): Promise<void> {
        try {
            const [runs, metrics] = await Promise.all([
                this.getWorkflowRuns(owner, repo),
                this.calculatePipelineMetrics(owner, repo)
            ]);

            this.pipelineWebview = new PipelineWebview(
                this.extensionUri,
                {
                    owner,
                    repo,
                    runs,
                    metrics
                },
                async (action) => {
                    await this.handlePipelineAction(owner, repo, action);
                }
            );

            await this.pipelineWebview.show();
            this.startAutoRefresh(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load pipeline analytics: ${error.message}`);
        }
    }

    private async getWorkflowRuns(owner: string, repo: string): Promise<WorkflowRun[]> {
        const runs: WorkflowRun[] = [];

        try {
            // Get all workflow runs
            const { data } = await this.octokit.actions.listWorkflowRunsForRepo({
                owner,
                repo,
                per_page: 100
            });

            // Process each run
            for (const run of data.workflow_runs) {
                const jobs = await this.getWorkflowJobs(owner, repo, run.id);
                
                runs.push({
                    id: run.id,
                    name: run.name,
                    status: run.status,
                    conclusion: run.conclusion || 'pending',
                    branch: run.head_branch,
                    commit: run.head_sha,
                    duration: run.updated_at ? 
                        new Date(run.updated_at).getTime() - new Date(run.created_at).getTime() : 
                        0,
                    startedAt: run.created_at,
                    completedAt: run.updated_at,
                    jobs
                });
            }
        } catch (error) {
            console.error('Failed to fetch workflow runs:', error);
        }

        return runs;
    }

    private async getWorkflowJobs(owner: string, repo: string, runId: number): Promise<WorkflowJob[]> {
        const jobs: WorkflowJob[] = [];

        try {
            const { data } = await this.octokit.actions.listJobsForWorkflowRun({
                owner,
                repo,
                run_id: runId
            });

            for (const job of data.jobs) {
                const steps = job.steps.map(step => ({
                    name: step.name,
                    status: step.status,
                    conclusion: step.conclusion || 'pending',
                    number: step.number,
                    startedAt: step.started_at,
                    completedAt: step.completed_at
                }));

                jobs.push({
                    id: job.id,
                    name: job.name,
                    status: job.status,
                    conclusion: job.conclusion || 'pending',
                    startedAt: job.started_at,
                    completedAt: job.completed_at,
                    steps
                });
            }
        } catch (error) {
            console.error('Failed to fetch workflow jobs:', error);
        }

        return jobs;
    }

    private async calculatePipelineMetrics(owner: string, repo: string): Promise<PipelineMetrics> {
        const runs = await this.getWorkflowRuns(owner, repo);

        // Calculate basic metrics
        const totalRuns = runs.length;
        const successfulRuns = runs.filter(run => run.conclusion === 'success').length;
        const failedRuns = runs.filter(run => run.conclusion === 'failure').length;

        // Calculate success and failure rates
        const successRate = (successfulRuns / totalRuns) * 100;
        const failureRate = (failedRuns / totalRuns) * 100;

        // Calculate average duration
        const completedRuns = runs.filter(run => run.completedAt);
        const averageDuration = completedRuns.reduce((acc, run) => acc + run.duration, 0) / completedRuns.length;

        // Calculate branch coverage
        const branchCoverage = runs.reduce((acc, run) => {
            acc[run.branch] = (acc[run.branch] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        // Analyze common failures
        const commonFailures = runs
            .filter(run => run.conclusion === 'failure')
            .reduce((acc, run) => {
                const failedJobs = run.jobs
                    .filter(job => job.conclusion === 'failure')
                    .map(job => job.name);

                failedJobs.forEach(job => {
                    acc[job] = (acc[job] || 0) + 1;
                });
                return acc;
            }, {} as { [key: string]: number });

        // Generate timeline data
        const timelineData = this.generateTimelineData(runs);

        return {
            totalRuns,
            successRate,
            averageDuration,
            failureRate,
            branchCoverage,
            commonFailures,
            timelineData
        };
    }

    private generateTimelineData(runs: WorkflowRun[]): {
        labels: string[];
        success: number[];
        failure: number[];
    } {
        // Group runs by date
        const groupedRuns = runs.reduce((acc, run) => {
            const date = new Date(run.startedAt).toLocaleDateString();
            if (!acc[date]) {
                acc[date] = { success: 0, failure: 0 };
            }
            if (run.conclusion === 'success') {
                acc[date].success++;
            } else if (run.conclusion === 'failure') {
                acc[date].failure++;
            }
            return acc;
        }, {} as { [key: string]: { success: number; failure: number } });

        // Convert to arrays for charting
        const dates = Object.keys(groupedRuns).sort();
        const success = dates.map(date => groupedRuns[date].success);
        const failure = dates.map(date => groupedRuns[date].failure);

        return {
            labels: dates,
            success,
            failure
        };
    }

    private async handlePipelineAction(owner: string, repo: string, action: any): Promise<void> {
        switch (action.type) {
            case 'rerunWorkflow':
                await this.rerunWorkflow(owner, repo, action.runId);
                break;

            case 'cancelWorkflow':
                await this.cancelWorkflow(owner, repo, action.runId);
                break;

            case 'viewLogs':
                await this.viewWorkflowLogs(owner, repo, action.runId, action.jobId);
                break;

            case 'refresh':
                await this.refreshPipeline(owner, repo);
                break;
        }
    }

    private async rerunWorkflow(owner: string, repo: string, runId: number): Promise<void> {
        try {
            await this.octokit.actions.reRunWorkflow({
                owner,
                repo,
                run_id: runId
            });

            vscode.window.showInformationMessage('Workflow rerun initiated successfully!');
            await this.refreshPipeline(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to rerun workflow: ${error.message}`);
        }
    }

    private async cancelWorkflow(owner: string, repo: string, runId: number): Promise<void> {
        try {
            await this.octokit.actions.cancelWorkflowRun({
                owner,
                repo,
                run_id: runId
            });

            vscode.window.showInformationMessage('Workflow cancelled successfully!');
            await this.refreshPipeline(owner, repo);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to cancel workflow: ${error.message}`);
        }
    }

    private async viewWorkflowLogs(owner: string, repo: string, runId: number, jobId: number): Promise<void> {
        try {
            const { data } = await this.octokit.actions.downloadJobLogsForWorkflowRun({
                owner,
                repo,
                job_id: jobId
            });

            // Create a new editor with the logs
            const document = await vscode.workspace.openTextDocument({
                content: data,
                language: 'log'
            });

            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to view workflow logs: ${error.message}`);
        }
    }

    private async refreshPipeline(owner: string, repo: string): Promise<void> {
        try {
            const [runs, metrics] = await Promise.all([
                this.getWorkflowRuns(owner, repo),
                this.calculatePipelineMetrics(owner, repo)
            ]);

            this.pipelineWebview?.update({
                runs,
                metrics
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to refresh pipeline: ${error.message}`);
        }
    }

    private startAutoRefresh(owner: string, repo: string): void {
        // Refresh pipeline analytics every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.refreshPipeline(owner, repo);
        }, 5 * 60 * 1000);
    }

    public dispose(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.pipelineWebview?.dispose();
    }
}
