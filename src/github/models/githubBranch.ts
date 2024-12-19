export class GitHubBranch {
    readonly name: string;
    readonly protected: boolean;
    readonly commit: {
        sha: string;
        url: string;
    };

    constructor(data: any) {
        this.name = data.name;
        this.protected = data.protected;
        this.commit = {
            sha: data.commit.sha,
            url: data.commit.url
        };
    }
}
