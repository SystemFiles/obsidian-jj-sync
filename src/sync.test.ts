/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService, type SyncCallbacks } from './sync';
import type { JjService, JjResult } from './jj-service';

function result(stdout = '', stderr = ''): JjResult {
	return { stdout, stderr };
}

function makeCallbacks(): SyncCallbacks {
	return {
		onSuccess: vi.fn(),
		onError: vi.fn(),
		onWarning: vi.fn(),
	};
}

function makeMockJj(overrides: Partial<JjService> = {}): JjService {
	return {
		version: vi.fn().mockResolvedValue('jj 0.41.0'),
		root: vi.fn().mockResolvedValue('/vault'),
		describe: vi.fn().mockResolvedValue(result()),
		new_: vi.fn().mockResolvedValue(result()),
		gitFetch: vi.fn().mockResolvedValue(result()),
		rebase: vi.fn().mockResolvedValue(result()),
		bookmarkSet: vi.fn().mockResolvedValue(result()),
		gitPush: vi.fn().mockResolvedValue(result()),
		status: vi.fn().mockResolvedValue('The working copy has no changes.\n'),
		log: vi.fn().mockResolvedValue('abc123\n'),
		resolve: vi.fn().mockResolvedValue(result()),
		restore: vi.fn().mockResolvedValue(result()),
		runCommand: vi.fn().mockResolvedValue(result()),
		gitRemoteAdd: vi.fn().mockResolvedValue(result()),
		gitRemoteSetUrl: vi.fn().mockResolvedValue(result()),
		gitInit: vi.fn().mockResolvedValue(result()),
		...overrides,
	} as unknown as JjService;
}

describe('SyncService', () => {
	let callbacks: SyncCallbacks;

	beforeEach(() => {
		callbacks = makeCallbacks();
	});

	describe('sync — full sequence with changes', () => {
		it('calls describe → new_ → gitFetch → bookmarkSet → gitPush', async () => {
			const callOrder: string[] = [];
			const jj = makeMockJj({
				status: vi.fn().mockResolvedValue('Working copy changes:\nM notes/test.md\n'),
				describe: vi.fn().mockImplementation(() => {
					callOrder.push('describe');
					return Promise.resolve(result());
				}),
				new_: vi.fn().mockImplementation(() => {
					callOrder.push('new_');
					return Promise.resolve(result());
				}),
				gitFetch: vi.fn().mockImplementation(() => {
					callOrder.push('gitFetch');
					return Promise.resolve(result());
				}),
				bookmarkSet: vi.fn().mockImplementation(() => {
					callOrder.push('bookmarkSet');
					return Promise.resolve(result());
				}),
				gitPush: vi.fn().mockImplementation(() => {
					callOrder.push('gitPush');
					return Promise.resolve(result());
				}),
				log: vi.fn().mockResolvedValue('abc123\n'),
			});

			const svc = new SyncService(jj, 'main', callbacks);
			await svc.sync();

			expect(callOrder).toEqual([
				'describe',
				'new_',
				'gitFetch',
				'bookmarkSet',
				'gitPush',
			]);
			expect(callbacks.onSuccess).toHaveBeenCalledWith('jj sync complete');
		});

		it('passes conventional commit message to describe', async () => {
			const jj = makeMockJj({
				status: vi.fn().mockResolvedValue('Working copy changes:\nM test.md\n'),
				log: vi.fn().mockResolvedValue('abc123\n'),
			});

			const svc = new SyncService(jj, 'main', callbacks);
			await svc.sync();

			const describeCall = vi.mocked(jj.describe).mock.calls[0];
			expect(describeCall).toBeDefined();
			expect(describeCall![0]).toMatch(/^chore\(vault\): sync from .+ at \d{4}-\d{2}-\d{2}/);
		});
	});

	describe('sync — clean state', () => {
		it('skips describe and new_ when no working copy changes', async () => {
			const jj = makeMockJj({
				status: vi.fn().mockResolvedValue('The working copy has no changes.\n'),
				log: vi.fn().mockResolvedValue('abc123\n'),
			});

			const svc = new SyncService(jj, 'main', callbacks);
			await svc.sync();

			expect(jj.describe).not.toHaveBeenCalled();
			expect(jj.new_).not.toHaveBeenCalled();
			expect(jj.gitFetch).toHaveBeenCalled();
			expect(callbacks.onSuccess).toHaveBeenCalled();
		});
	});

	describe('sync — divergence detection', () => {
		it('skips rebase when local and remote are the same', async () => {
			const jj = makeMockJj({
				status: vi.fn().mockResolvedValue('Working copy changes:\nM x.md\n'),
				log: vi.fn().mockResolvedValue('same_id\n'),
			});

			const svc = new SyncService(jj, 'main', callbacks);
			await svc.sync();

			expect(jj.rebase).not.toHaveBeenCalled();
		});

		it('rebases when local and remote differ', async () => {
			const jj = makeMockJj({
				status: vi.fn().mockResolvedValue('Working copy changes:\nM x.md\n'),
				log: vi.fn().mockImplementation((_tpl?: string, revset?: string) => {
					if (revset === 'main') return Promise.resolve('local_id\n');
					if (revset === 'main@origin') return Promise.resolve('remote_id\n');
					return Promise.resolve('');
				}),
			});

			const svc = new SyncService(jj, 'main', callbacks);
			await svc.sync();

			expect(jj.rebase).toHaveBeenCalledWith(['-s', 'main', '-d', 'main@origin']);
		});
	});

	describe('sync — conflict resolution', () => {
		it('auto-resolves conflicted files using restore', async () => {
			let statusCallCount = 0;
			const jj = makeMockJj({
				status: vi.fn().mockImplementation(() => {
					statusCallCount++;
					if (statusCallCount === 1) {
						return Promise.resolve('Working copy changes:\nM x.md\n');
					}
					// After rebase, status shows conflicts
					return Promise.resolve('Working copy changes:\nC conflict notes/a.md\nC conflict notes/b.md\n');
				}),
				log: vi.fn().mockImplementation((_tpl?: string, revset?: string) => {
					if (revset === 'main') return Promise.resolve('local_id\n');
					if (revset === 'main@origin') return Promise.resolve('remote_id\n');
					return Promise.resolve('');
				}),
			});

			const svc = new SyncService(jj, 'main', callbacks);
			await svc.sync();

			expect(jj.restore).toHaveBeenCalled();
			expect(callbacks.onWarning).toHaveBeenCalledWith(
				expect.stringContaining('Auto-resolving'),
			);
		});
	});

	describe('sync — error handling', () => {
		it('throws on gitFetch failure', async () => {
			const jj = makeMockJj({
				status: vi.fn().mockResolvedValue('The working copy has no changes.\n'),
				gitFetch: vi.fn().mockRejectedValue(
					Object.assign(new Error('Could not resolve hostname'), {
						category: 'network',
					}),
				),
			});

			const svc = new SyncService(jj, 'main', callbacks);
			await expect(svc.sync()).rejects.toThrow('Could not resolve hostname');
		});

		it('throws on gitPush failure', async () => {
			const jj = makeMockJj({
				status: vi.fn().mockResolvedValue('Working copy changes:\nM x.md\n'),
				log: vi.fn().mockResolvedValue('abc123\n'),
				gitPush: vi.fn().mockRejectedValue(new Error('refused to update')),
			});

			const svc = new SyncService(jj, 'main', callbacks);
			await expect(svc.sync()).rejects.toThrow('refused to update');
		});
	});

	describe('hasWorkingCopyChanges', () => {
		it('returns false when status says no changes', async () => {
			const jj = makeMockJj({
				status: vi.fn().mockResolvedValue('The working copy has no changes.\n'),
			});
			const svc = new SyncService(jj, 'main', callbacks);
			expect(await svc.hasWorkingCopyChanges()).toBe(false);
		});

		it('returns true when status shows changes', async () => {
			const jj = makeMockJj({
				status: vi.fn().mockResolvedValue('Working copy changes:\nM notes/test.md\n'),
			});
			const svc = new SyncService(jj, 'main', callbacks);
			expect(await svc.hasWorkingCopyChanges()).toBe(true);
		});
	});

	describe('getRemoteStatus', () => {
		it('returns behind 0 when in sync', async () => {
			const jj = makeMockJj({
				log: vi.fn().mockResolvedValue('same_id\n'),
			});
			const svc = new SyncService(jj, 'main', callbacks);
			const status = await svc.getRemoteStatus();
			expect(status.behind).toBe(0);
		});

		it('returns behind count when remote is ahead', async () => {
			const jj = makeMockJj({
				log: vi.fn().mockImplementation((_tpl?: string, revset?: string) => {
					if (revset === 'main') return Promise.resolve('local_id\n');
					if (revset === 'main@origin') return Promise.resolve('remote_id\n');
					// Range query returns 3 lines (3 changes behind)
					return Promise.resolve('id1\nid2\nid3\n');
				}),
			});
			const svc = new SyncService(jj, 'main', callbacks);
			const status = await svc.getRemoteStatus();
			expect(status.behind).toBe(3);
		});

		it('returns behind 0 on error', async () => {
			const jj = makeMockJj({
				gitFetch: vi.fn().mockRejectedValue(new Error('network')),
			});
			const svc = new SyncService(jj, 'main', callbacks);
			const status = await svc.getRemoteStatus();
			expect(status.behind).toBe(0);
		});
	});
});
