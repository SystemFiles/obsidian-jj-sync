import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { JjService, JjCommandError } from './jj-service';

const DEFAULT_GITIGNORE = `# Obsidian workspace state (device-specific)
.obsidian/workspace.json
.obsidian/workspace-mobile.json

# Plugin data (may contain credentials in remote URL settings)
.obsidian/plugins/*/data.json

# Obsidian trash
.trash/

# macOS
.DS_Store
`;

export class VaultInitService {
	private jj: JjService;
	private vaultPath: string;

	constructor(jj: JjService, vaultPath: string) {
		this.jj = jj;
		this.vaultPath = vaultPath;
	}

	async isJjRepo(): Promise<boolean> {
		try {
			await this.jj.root();
			return true;
		} catch (err) {
			if (
				err instanceof JjCommandError &&
				err.category === 'repo_state'
			) {
				return false;
			}
			throw err;
		}
	}

	async initRepo(): Promise<void> {
		await this.jj.gitInit();
	}

	async configureRemote(url: string, name = 'origin'): Promise<void> {
		try {
			await this.jj.gitRemoteAdd(name, url);
		} catch {
			// Remote may already exist — try updating instead
			await this.jj.gitRemoteSetUrl(name, url);
		}
	}

	generateGitignore(): boolean {
		const gitignorePath = join(this.vaultPath, '.gitignore');
		if (existsSync(gitignorePath)) {
			return false;
		}
		writeFileSync(gitignorePath, DEFAULT_GITIGNORE, 'utf-8');
		return true;
	}
}

export { DEFAULT_GITIGNORE };
