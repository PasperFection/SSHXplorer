export interface Release {
    id: number;
    name: string;
    tagName: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
    createdAt: string;
    publishedAt: string;
    assets: ReleaseAsset[];
}

export interface ReleaseAsset {
    id: number;
    name: string;
    label: string;
    size: number;
    downloadCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface WorkflowRun {
    id: number;
    name: string;
    status: string;
    conclusion: string;
    createdAt: string;
    updatedAt: string;
    url: string;
    jobs: Job[];
}

export interface Job {
    id: number;
    name: string;
    status: string;
    conclusion: string;
    startedAt: string;
    completedAt: string;
    steps: WorkflowStep[];
}

export interface WorkflowStep {
    name: string;
    status: string;
    conclusion: string;
    number: number;
    startedAt: string;
    completedAt: string;
}

export interface CommitActivity {
    days: number[];
    total: number;
    week: number;
}

export interface ContributorStats {
    author: {
        login: string;
        avatarUrl: string;
    };
    total: number;
    weeks: {
        week: number;
        additions: number;
        deletions: number;
        commits: number;
    }[];
}

export interface CodeScanningAlert {
    number: number;
    createdAt: string;
    updatedAt: string;
    url: string;
    state: string;
    dismissedBy?: {
        login: string;
        avatarUrl: string;
    };
    dismissedReason?: string;
    rule: {
        id: string;
        severity: string;
        description: string;
    };
    tool: {
        name: string;
        version: string;
    };
    mostRecentInstance: {
        ref: string;
        state: string;
        commitSha: string;
        message: string;
        location: {
            path: string;
            startLine: number;
            endLine: number;
            startColumn: number;
            endColumn: number;
        };
    };
}

export interface SecretScanningAlert {
    number: number;
    createdAt: string;
    updatedAt: string;
    url: string;
    state: string;
    resolution?: string;
    secretType: string;
    secret: string;
    locations: {
        path: string;
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
    }[];
}

export interface BranchProtection {
    requiredStatusChecks: {
        strict: boolean;
        contexts: string[];
    };
    enforceAdmins: boolean;
    requiredPullRequestReviews: {
        dismissStaleReviews: boolean;
        requireCodeOwnerReviews: boolean;
        requiredApprovingReviewCount: number;
    };
    restrictions: {
        users: string[];
        teams: string[];
        apps: string[];
    };
}

export interface Deployment {
    id: number;
    ref: string;
    task: string;
    environment: string;
    description: string;
    creator: {
        login: string;
        avatarUrl: string;
    };
    createdAt: string;
    updatedAt: string;
    statusId: number;
    status: DeploymentStatus;
}

export interface DeploymentStatus {
    id: number;
    state: 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success';
    creator: {
        login: string;
        avatarUrl: string;
    };
    description: string;
    environment: string;
    targetUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Environment {
    id: number;
    name: string;
    url: string;
    htmlUrl: string;
    createdAt: string;
    updatedAt: string;
    protectionRules?: {
        id: number;
        type: string;
        waitTimer?: number;
    }[];
    deploymentBranchPolicy?: {
        protectedBranches: boolean;
        customBranchPolicies: boolean;
    };
}
