export class GitHubRepository {
    readonly id: number;
    readonly name: string;
    readonly fullName: string;
    readonly private: boolean;
    readonly owner: string;
    readonly description: string;
    readonly defaultBranch: string;

    constructor(data: any) {
        this.id = data.id;
        this.name = data.name;
        this.fullName = data.full_name;
        this.private = data.private;
        this.owner = data.owner.login;
        this.description = data.description;
        this.defaultBranch = data.default_branch;
    }

    get cloneUrl(): string {
        return `https://github.com/${this.fullName}.git`;
    }
}
