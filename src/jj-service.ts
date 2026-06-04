import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import { classifyError } from './error-classifier';

const execFile = promisify(execFileCb);

const FALLBACK_PATHS = ['/opt/homebrew/bin/jj', '/usr/local/bin/jj', 'jj'];

export interface JjResult {
	stdout: string;
	stderr: string;
}

export class JjCommandError extends Error {
	category: string;
	constructor(category: string, message: string) {
		super(message);
		this.name = 'JjCommandError';
		this.category = category;
	}
}

export class JjService {
	private binary: string;
	private cwd: string;

	constructor(binary: string, cwd: string) {
		this.binary = binary;
		this.cwd = cwd;
	}

	static async findBinary(configuredPath: string): Promise<string> {
		const candidates =
			configuredPath && configuredPath !== 'jj'
				? [configuredPath, ...FALLBACK_PATHS]
				: FALLBACK_PATHS;

		for (const candidate of candidates) {
			try {
				await execFile(candidate, ['version'], { timeout: 5000 });
				return candidate;
			} catch {
				// try next
			}
		}

		const { message } = classifyError('No such file or directory');
		throw new JjCommandError('binary', message);
	}

	async runCommand(args: string[]): Promise<JjResult> {
		const fullArgs = ['--no-pager', '--color=never', ...args];
		try {
			const { stdout, stderr } = await execFile(this.binary, fullArgs, {
				cwd: this.cwd,
			});
			return { stdout: stdout ?? '', stderr: stderr ?? '' };
		} catch (err: unknown) {
			const stderr =
				err instanceof Error && 'stderr' in err
					? String((err as { stderr: unknown }).stderr)
					: err instanceof Error
						? err.message
						: String(err);
			const classified = classifyError(stderr);
			throw new JjCommandError(classified.category, classified.message);
		}
	}

	async version(): Promise<string> {
		const { stdout } = await this.runCommand(['version']);
		return stdout.trim();
	}

	async root(): Promise<string> {
		const { stdout } = await this.runCommand(['root']);
		return stdout.trim();
	}

	async describe(message: string): Promise<JjResult> {
		return this.runCommand(['describe', '-m', message]);
	}

	async new_(): Promise<JjResult> {
		return this.runCommand(['new']);
	}

	async gitFetch(remote?: string): Promise<JjResult> {
		const args = ['git', 'fetch'];
		if (remote) args.push('--remote', remote);
		return this.runCommand(args);
	}

	async rebase(args: string[]): Promise<JjResult> {
		return this.runCommand(['rebase', ...args]);
	}

	async bookmarkSet(name: string, revision: string): Promise<JjResult> {
		return this.runCommand(['bookmark', 'set', name, '-r', revision]);
	}

	async gitPush(bookmark: string): Promise<JjResult> {
		return this.runCommand(['git', 'push', '--bookmark', bookmark]);
	}

	async status(): Promise<string> {
		const { stdout } = await this.runCommand(['status']);
		return stdout;
	}

	async log(template?: string, revset?: string): Promise<string> {
		const args = ['log'];
		if (revset) args.push('-r', revset);
		if (template) args.push('-T', template);
		return (await this.runCommand(args)).stdout;
	}

	async resolve(args: string[]): Promise<JjResult> {
		return this.runCommand(['resolve', ...args]);
	}

	async restore(args: string[]): Promise<JjResult> {
		return this.runCommand(['restore', ...args]);
	}

	async gitRemoteAdd(name: string, url: string): Promise<JjResult> {
		return this.runCommand(['git', 'remote', 'add', name, url]);
	}

	async gitRemoteSetUrl(name: string, url: string): Promise<JjResult> {
		return this.runCommand(['git', 'remote', 'set-url', name, url]);
	}

	async gitInit(): Promise<JjResult> {
		return this.runCommand(['git', 'init']);
	}

	async gitRemoteList(): Promise<Array<{ name: string; url: string }>> {
		const { stdout } = await this.runCommand(['git', 'remote', 'list']);
		return stdout
			.split('\n')
			.filter((line) => line.trim().length > 0)
			.map((line) => {
				const spaceIdx = line.indexOf(' ');
				return {
					name: line.substring(0, spaceIdx),
					url: line.substring(spaceIdx + 1),
				};
			});
	}

	async bookmarkList(): Promise<string[]> {
		const { stdout } = await this.runCommand([
			'bookmark',
			'list',
			'-T',
			'name ++ "\\n"',
		]);
		return stdout.split('\n').filter((line) => line.trim().length > 0);
	}
}
