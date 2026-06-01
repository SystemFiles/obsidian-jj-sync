import { JjService, JjCommandError } from './jj-service';
import { formatSyncMessage } from './commit-message';
import { hostname } from 'os';

export interface SyncCallbacks {
	onSuccess: (message: string) => void;
	onError: (message: string) => void;
	onWarning: (message: string) => void;
}

export class SyncService {
	private jj: JjService;
	private callbacks: SyncCallbacks;
	private bookmarkName: string;

	constructor(jj: JjService, bookmarkName: string, callbacks: SyncCallbacks) {
		this.jj = jj;
		this.bookmarkName = bookmarkName;
		this.callbacks = callbacks;
	}

	async sync(): Promise<void> {
		const hasChanges = await this.hasWorkingCopyChanges();

		if (hasChanges) {
			const msg = formatSyncMessage(hostname() ?? 'unknown', new Date());
			await this.jj.describe(msg);
			await this.jj.new_();
		}

		await this.jj.gitFetch();

		const diverged = await this.hasDiverged();
		if (diverged) {
			await this.rebaseOntoRemote();
			await this.resolveConflictsIfAny();
		}

		if (hasChanges) {
			await this.jj.bookmarkSet(this.bookmarkName, '@-');
			await this.jj.gitPush(this.bookmarkName);
		} else if (diverged) {
			await this.jj.bookmarkSet(this.bookmarkName, '@-');
			await this.jj.gitPush(this.bookmarkName);
		}

		this.callbacks.onSuccess('jj sync complete');
	}

	async hasWorkingCopyChanges(): Promise<boolean> {
		const output = await this.jj.status();
		return !output.includes('The working copy has no changes');
	}

	async hasDiverged(): Promise<boolean> {
		try {
			const localId = (
				await this.jj.log('commit_id', this.bookmarkName)
			).trim();
			const remoteId = (
				await this.jj.log(
					'commit_id',
					`${this.bookmarkName}@origin`,
				)
			).trim();
			return localId !== remoteId && remoteId.length > 0;
		} catch {
			// If the remote bookmark doesn't exist yet, not diverged
			return false;
		}
	}

	private async rebaseOntoRemote(): Promise<void> {
		try {
			await this.jj.rebase([
				'-s',
				this.bookmarkName,
				'-d',
				`${this.bookmarkName}@origin`,
			]);
		} catch (err) {
			if (
				err instanceof JjCommandError &&
				err.category === 'unknown' &&
				err.message.includes('already')
			) {
				// Already up to date — not an error
				return;
			}
			throw err;
		}
	}

	private async resolveConflictsIfAny(): Promise<void> {
		const status = await this.jj.status();
		// jj status shows "Conflict" for conflicted files
		if (!status.toLowerCase().includes('conflict')) {
			return;
		}

		// Extract conflicted file paths from status lines
		const conflictedFiles = status
			.split('\n')
			.filter((line) => line.toLowerCase().includes('conflict'))
			.map((line) => line.replace(/^[A-Z]\s+/, '').trim())
			.filter((f) => f.length > 0);

		if (conflictedFiles.length === 0) {
			return;
		}

		this.callbacks.onWarning(
			`Auto-resolving ${conflictedFiles.length} conflict(s) with local changes. Use "jj undo" to revert.`,
		);

		// Resolve each file by restoring from the pre-rebase local revision.
		// After rebase, @- is the pre-rebase state of our change.
		for (const file of conflictedFiles) {
			try {
				await this.jj.restore(['--from', '@-', '--', file]);
			} catch {
				// If restore fails for a specific file, continue with others
			}
		}
	}

	async getRemoteStatus(): Promise<{ behind: number }> {
		try {
			await this.jj.gitFetch();
			const localId = (
				await this.jj.log('commit_id', this.bookmarkName)
			).trim();
			const remoteId = (
				await this.jj.log(
					'commit_id',
					`${this.bookmarkName}@origin`,
				)
			).trim();

			if (localId === remoteId || remoteId.length === 0) {
				return { behind: 0 };
			}

			// Count changes between local and remote
			const logOutput = await this.jj.log(
				'commit_id',
				`${this.bookmarkName}..${this.bookmarkName}@origin`,
			);
			const lines = logOutput
				.trim()
				.split('\n')
				.filter((l) => l.trim().length > 0);
			return { behind: Math.max(lines.length, 1) };
		} catch {
			return { behind: 0 };
		}
	}
}
