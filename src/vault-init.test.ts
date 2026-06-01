/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultInitService, DEFAULT_GITIGNORE } from './vault-init';
import { JjCommandError } from './jj-service';
import type { JjService, JjResult } from './jj-service';

vi.mock('fs', () => ({
	existsSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

import { existsSync, writeFileSync } from 'fs';

const mockExistsSync = vi.mocked(existsSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

function result(stdout = '', stderr = ''): JjResult {
	return { stdout, stderr };
}

function makeMockJj(overrides: Partial<JjService> = {}): JjService {
	return {
		root: vi.fn().mockResolvedValue('/vault'),
		gitInit: vi.fn().mockResolvedValue(result()),
		gitRemoteAdd: vi.fn().mockResolvedValue(result()),
		gitRemoteSetUrl: vi.fn().mockResolvedValue(result()),
		version: vi.fn().mockResolvedValue('jj 0.41.0'),
		describe: vi.fn().mockResolvedValue(result()),
		new_: vi.fn().mockResolvedValue(result()),
		gitFetch: vi.fn().mockResolvedValue(result()),
		rebase: vi.fn().mockResolvedValue(result()),
		bookmarkSet: vi.fn().mockResolvedValue(result()),
		gitPush: vi.fn().mockResolvedValue(result()),
		status: vi.fn().mockResolvedValue(''),
		log: vi.fn().mockResolvedValue(''),
		resolve: vi.fn().mockResolvedValue(result()),
		restore: vi.fn().mockResolvedValue(result()),
		runCommand: vi.fn().mockResolvedValue(result()),
		...overrides,
	} as unknown as JjService;
}

describe('VaultInitService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('isJjRepo', () => {
		it('returns true when jj root succeeds', async () => {
			const jj = makeMockJj();
			const svc = new VaultInitService(jj, '/vault');
			expect(await svc.isJjRepo()).toBe(true);
		});

		it('returns false when jj root fails with repo_state error', async () => {
			const jj = makeMockJj({
				root: vi.fn().mockRejectedValue(
					new JjCommandError('repo_state', 'not a jj repo'),
				),
			});
			const svc = new VaultInitService(jj, '/vault');
			expect(await svc.isJjRepo()).toBe(false);
		});

		it('rethrows non-repo-state errors', async () => {
			const jj = makeMockJj({
				root: vi.fn().mockRejectedValue(
					new JjCommandError('binary', 'jj not found'),
				),
			});
			const svc = new VaultInitService(jj, '/vault');
			await expect(svc.isJjRepo()).rejects.toThrow('jj not found');
		});
	});

	describe('initRepo', () => {
		it('calls jj git init', async () => {
			const jj = makeMockJj();
			const svc = new VaultInitService(jj, '/vault');
			await svc.initRepo();
			expect(jj.gitInit).toHaveBeenCalled();
		});
	});

	describe('configureRemote', () => {
		it('calls gitRemoteAdd with name and url', async () => {
			const jj = makeMockJj();
			const svc = new VaultInitService(jj, '/vault');
			await svc.configureRemote('https://github.com/user/vault.git');
			expect(jj.gitRemoteAdd).toHaveBeenCalledWith(
				'origin',
				'https://github.com/user/vault.git',
			);
		});

		it('falls back to gitRemoteSetUrl if add fails', async () => {
			const jj = makeMockJj({
				gitRemoteAdd: vi.fn().mockRejectedValue(new Error('already exists')),
			});
			const svc = new VaultInitService(jj, '/vault');
			await svc.configureRemote('https://github.com/user/vault.git');
			expect(jj.gitRemoteSetUrl).toHaveBeenCalledWith(
				'origin',
				'https://github.com/user/vault.git',
			);
		});

		it('uses custom remote name', async () => {
			const jj = makeMockJj();
			const svc = new VaultInitService(jj, '/vault');
			await svc.configureRemote('https://example.com/repo.git', 'upstream');
			expect(jj.gitRemoteAdd).toHaveBeenCalledWith(
				'upstream',
				'https://example.com/repo.git',
			);
		});
	});

	describe('generateGitignore', () => {
		it('writes default .gitignore when none exists', () => {
			mockExistsSync.mockReturnValue(false);
			const jj = makeMockJj();
			const svc = new VaultInitService(jj, '/vault');
			const created = svc.generateGitignore();
			expect(created).toBe(true);
			expect(mockWriteFileSync).toHaveBeenCalledWith(
				'/vault/.gitignore',
				DEFAULT_GITIGNORE,
				'utf-8',
			);
		});

		it('does not overwrite existing .gitignore', () => {
			mockExistsSync.mockReturnValue(true);
			const jj = makeMockJj();
			const svc = new VaultInitService(jj, '/vault');
			const created = svc.generateGitignore();
			expect(created).toBe(false);
			expect(mockWriteFileSync).not.toHaveBeenCalled();
		});

		/* eslint-disable obsidianmd/hardcoded-config-path -- testing generated content */
		it('default content includes workspace.json', () => {
			expect(DEFAULT_GITIGNORE).toContain('.obsidian/workspace.json');
		});

		it('default content includes plugin data.json', () => {
			expect(DEFAULT_GITIGNORE).toContain('.obsidian/plugins/*/data.json');
		});
		/* eslint-enable obsidianmd/hardcoded-config-path */

		it('default content includes .trash/', () => {
			expect(DEFAULT_GITIGNORE).toContain('.trash/');
		});
	});
});
