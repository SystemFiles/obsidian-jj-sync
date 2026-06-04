import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JjService, JjCommandError } from './jj-service';

// Mock child_process.execFile
vi.mock('child_process', () => ({
	execFile: vi.fn(),
}));

import { execFile as execFileCb } from 'child_process';

// Get the promisified mock — vi.mock hoists, so we cast after import
const mockExecFile = vi.mocked(execFileCb);

function setupExecFile(
	impl: (
		binary: string,
		args: string[],
		opts: Record<string, unknown>,
		cb: (err: Error | null, result: { stdout: string; stderr: string }) => void,
	) => void,
) {
	mockExecFile.mockImplementation(impl as unknown as typeof execFileCb);
}

describe('JjService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('runCommand', () => {
		it('prepends --no-pager and --color=never to args', async () => {
			setupExecFile((_bin, _args, _opts, cb) => {
				cb(null, { stdout: 'ok', stderr: '' });
			});

			const svc = new JjService('/usr/bin/jj', '/vault');
			await svc.version();

			expect(mockExecFile).toHaveBeenCalledWith(
				'/usr/bin/jj',
				['--no-pager', '--color=never', 'version'],
				expect.objectContaining({ cwd: '/vault' }),
				expect.any(Function),
			);
		});

		it('sets cwd from constructor', async () => {
			setupExecFile((_bin, _args, _opts, cb) => {
				cb(null, { stdout: '', stderr: '' });
			});

			const svc = new JjService('jj', '/my/vault/path');
			await svc.status();

			expect(mockExecFile).toHaveBeenCalledWith(
				'jj',
				expect.any(Array),
				expect.objectContaining({ cwd: '/my/vault/path' }),
				expect.any(Function),
			);
		});

		it('throws JjCommandError with classified error on failure', async () => {
			setupExecFile((_bin, _args, _opts, cb) => {
				const err = Object.assign(new Error('fail'), {
					stderr: 'Permission denied (publickey).',
				});
				cb(err, { stdout: '', stderr: '' });
			});

			const svc = new JjService('jj', '/vault');
			await expect(svc.gitFetch()).rejects.toThrow(JjCommandError);
			await expect(svc.gitFetch()).rejects.toMatchObject({
				category: 'auth',
			});
		});
	});

	describe('command methods pass correct arguments', () => {
		beforeEach(() => {
			setupExecFile((_bin, _args, _opts, cb) => {
				cb(null, { stdout: '', stderr: '' });
			});
		});

		it('describe passes -m flag', async () => {
			const svc = new JjService('jj', '/v');
			await svc.describe('test message');
			expect(mockExecFile).toHaveBeenCalledWith(
				'jj',
				['--no-pager', '--color=never', 'describe', '-m', 'test message'],
				expect.any(Object),
				expect.any(Function),
			);
		});

		it('new_ calls jj new', async () => {
			const svc = new JjService('jj', '/v');
			await svc.new_();
			expect(mockExecFile).toHaveBeenCalledWith(
				'jj',
				['--no-pager', '--color=never', 'new'],
				expect.any(Object),
				expect.any(Function),
			);
		});

		it('gitFetch calls jj git fetch', async () => {
			const svc = new JjService('jj', '/v');
			await svc.gitFetch();
			expect(mockExecFile).toHaveBeenCalledWith(
				'jj',
				['--no-pager', '--color=never', 'git', 'fetch'],
				expect.any(Object),
				expect.any(Function),
			);
		});

		it('gitFetch with remote passes --remote flag', async () => {
			const svc = new JjService('jj', '/v');
			await svc.gitFetch('origin');
			expect(mockExecFile).toHaveBeenCalledWith(
				'jj',
				['--no-pager', '--color=never', 'git', 'fetch', '--remote', 'origin'],
				expect.any(Object),
				expect.any(Function),
			);
		});

		it('bookmarkSet passes correct args', async () => {
			const svc = new JjService('jj', '/v');
			await svc.bookmarkSet('main', '@-');
			expect(mockExecFile).toHaveBeenCalledWith(
				'jj',
				['--no-pager', '--color=never', 'bookmark', 'set', 'main', '-r', '@-'],
				expect.any(Object),
				expect.any(Function),
			);
		});

		it('gitPush passes --bookmark flag', async () => {
			const svc = new JjService('jj', '/v');
			await svc.gitPush('main');
			expect(mockExecFile).toHaveBeenCalledWith(
				'jj',
				['--no-pager', '--color=never', 'git', 'push', '--bookmark', 'main'],
				expect.any(Object),
				expect.any(Function),
			);
		});

		it('log passes revset and template', async () => {
			const svc = new JjService('jj', '/v');
			await svc.log('commit_id', 'main');
			expect(mockExecFile).toHaveBeenCalledWith(
				'jj',
				['--no-pager', '--color=never', 'log', '-r', 'main', '-T', 'commit_id'],
				expect.any(Object),
				expect.any(Function),
			);
		});
	});

	describe('findBinary', () => {
		it('returns configured path when it works', async () => {
			setupExecFile((bin, _args, _opts, cb) => {
				if (bin === '/custom/jj') {
					cb(null, { stdout: 'jj 0.41.0', stderr: '' });
				} else {
					cb(new Error('not found'), { stdout: '', stderr: '' });
				}
			});

			const result = await JjService.findBinary('/custom/jj');
			expect(result).toBe('/custom/jj');
		});

		it('falls back to /opt/homebrew/bin/jj when configured path fails', async () => {
			setupExecFile((bin, _args, _opts, cb) => {
				if (bin === '/opt/homebrew/bin/jj') {
					cb(null, { stdout: 'jj 0.41.0', stderr: '' });
				} else {
					cb(new Error('not found'), { stdout: '', stderr: '' });
				}
			});

			const result = await JjService.findBinary('/bad/path/jj');
			expect(result).toBe('/opt/homebrew/bin/jj');
		});

		it('throws JjCommandError when all paths fail', async () => {
			setupExecFile((_bin, _args, _opts, cb) => {
				cb(new Error('not found'), { stdout: '', stderr: '' });
			});

			await expect(JjService.findBinary('jj')).rejects.toThrow(JjCommandError);
			await expect(JjService.findBinary('jj')).rejects.toMatchObject({
				category: 'binary',
			});
		});

		it('does not duplicate "jj" when configured path equals "jj"', async () => {
			const tried: string[] = [];
			setupExecFile((bin, _args, _opts, cb) => {
				tried.push(bin);
				if (bin === 'jj') {
					cb(null, { stdout: 'jj 0.41.0', stderr: '' });
				} else {
					cb(new Error('not found'), { stdout: '', stderr: '' });
				}
			});

			const result = await JjService.findBinary('jj');
			expect(result).toBe('jj');
			// bare "jj" should only be tried once, not prepended AND in fallbacks
			expect(tried.filter((b) => b === 'jj').length).toBe(1);
		});
	});

	describe('gitRemoteList', () => {
		it('parses a single remote', async () => {
			setupExecFile((_bin, _args, _opts, cb) => {
				cb(null, { stdout: 'origin https://github.com/user/repo.git\n', stderr: '' });
			});

			const svc = new JjService('jj', '/v');
			const remotes = await svc.gitRemoteList();
			expect(remotes).toEqual([
				{ name: 'origin', url: 'https://github.com/user/repo.git' },
			]);
		});

		it('parses multiple remotes', async () => {
			setupExecFile((_bin, _args, _opts, cb) => {
				cb(null, {
					stdout: 'origin https://github.com/user/repo.git\nupstream https://github.com/org/repo.git\n',
					stderr: '',
				});
			});

			const svc = new JjService('jj', '/v');
			const remotes = await svc.gitRemoteList();
			expect(remotes).toEqual([
				{ name: 'origin', url: 'https://github.com/user/repo.git' },
				{ name: 'upstream', url: 'https://github.com/org/repo.git' },
			]);
		});

		it('returns empty array on empty output', async () => {
			setupExecFile((_bin, _args, _opts, cb) => {
				cb(null, { stdout: '', stderr: '' });
			});

			const svc = new JjService('jj', '/v');
			const remotes = await svc.gitRemoteList();
			expect(remotes).toEqual([]);
		});
	});

	describe('bookmarkList', () => {
		it('parses a single bookmark', async () => {
			setupExecFile((_bin, _args, _opts, cb) => {
				cb(null, { stdout: 'main\n', stderr: '' });
			});

			const svc = new JjService('jj', '/v');
			const bookmarks = await svc.bookmarkList();
			expect(bookmarks).toEqual(['main']);
		});

		it('parses multiple bookmarks', async () => {
			setupExecFile((_bin, _args, _opts, cb) => {
				cb(null, { stdout: 'main\ndev\nfeature\n', stderr: '' });
			});

			const svc = new JjService('jj', '/v');
			const bookmarks = await svc.bookmarkList();
			expect(bookmarks).toEqual(['main', 'dev', 'feature']);
		});

		it('returns empty array on empty output', async () => {
			setupExecFile((_bin, _args, _opts, cb) => {
				cb(null, { stdout: '', stderr: '' });
			});

			const svc = new JjService('jj', '/v');
			const bookmarks = await svc.bookmarkList();
			expect(bookmarks).toEqual([]);
		});
	});
});
