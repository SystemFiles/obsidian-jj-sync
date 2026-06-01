export type ErrorCategory =
	| 'auth'
	| 'network'
	| 'binary'
	| 'repo_state'
	| 'push_rejection'
	| 'unknown';

export interface ClassifiedError {
	category: ErrorCategory;
	message: string;
}

const PATTERNS: Array<{ category: ErrorCategory; patterns: RegExp[]; message: string }> = [
	{
		category: 'auth',
		patterns: [
			/Permission denied/i,
			/publickey/i,
			/Authentication failed/i,
			/invalid credentials/i,
			/could not read Username/i,
			/terminal prompts disabled/i,
			/\b403\b/,
		],
		message:
			'Authentication failed. Check your SSH keys, credentials, or remote URL in jj Sync settings.',
	},
	{
		category: 'network',
		patterns: [
			/Could not resolve hostname/i,
			/Connection refused/i,
			/Network is unreachable/i,
			/timed?\s*out/i,
			/Could not resolve host/i,
			/Connection reset by peer/i,
			/SSL certificate/i,
		],
		message:
			'Network error. Check your internet connection and remote URL.',
	},
	{
		category: 'binary',
		patterns: [
			/No such file or directory/i,
			/not found/i,
			/ENOENT/,
			/command not found/i,
			/EACCES/,
		],
		message:
			'jj binary not found or not executable. Check the jj binary path in jj Sync settings.',
	},
	{
		category: 'repo_state',
		patterns: [
			/There is no jj repo/i,
			/not a jj repo/i,
			/not a git repo/i,
			/workspace is stale/i,
			/is not a valid directory/i,
		],
		message:
			'Vault is not a jj repository. Initialize it from jj Sync settings or run "jj git init".',
	},
	{
		category: 'push_rejection',
		patterns: [
			/bookmark.*moved/i,
			/non-fast-forward/i,
			/refused to update/i,
			/failed to push/i,
			/remote rejected/i,
		],
		message:
			'Push rejected. The remote has diverged. Try syncing again to fetch and rebase first.',
	},
];

export function classifyError(stderr: string): ClassifiedError {
	for (const { category, patterns, message } of PATTERNS) {
		if (patterns.some((p) => p.test(stderr))) {
			return { category, message };
		}
	}
	return { category: 'unknown', message: stderr.trim() || 'An unknown error occurred.' };
}
