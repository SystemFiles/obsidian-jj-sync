import { describe, it, expect, vi } from 'vitest';
import { maskCredentials, detectRepoSettings } from './repo-detect';
import type { JjService } from './jj-service';

describe('maskCredentials', () => {
	it('masks user:token in HTTPS URL', () => {
		expect(
			maskCredentials('https://user:token@github.com/org/repo.git'),
		).toBe('https://***@github.com/org/repo.git');
	});

	it('leaves URL without credentials unchanged', () => {
		expect(
			maskCredentials('https://github.com/org/repo.git'),
		).toBe('https://github.com/org/repo.git');
	});

	it('leaves SSH URL unchanged', () => {
		expect(
			maskCredentials('git@github.com:org/repo.git'),
		).toBe('git@github.com:org/repo.git');
	});
});

function mockJj(overrides: Partial<JjService> = {}): JjService {
	return {
		gitRemoteList: vi.fn().mockResolvedValue([]),
		bookmarkList: vi.fn().mockResolvedValue([]),
		...overrides,
	} as unknown as JjService;
}

describe('detectRepoSettings', () => {
	it('returns origin URL when origin remote exists', async () => {
		const jj = mockJj({
			gitRemoteList: vi.fn().mockResolvedValue([
				{ name: 'origin', url: 'https://github.com/user/repo.git' },
			]),
		});

		const result = await detectRepoSettings(jj);
		expect(result.remoteURL).toBe('https://github.com/user/repo.git');
	});

	it('returns sole non-origin remote URL', async () => {
		const jj = mockJj({
			gitRemoteList: vi.fn().mockResolvedValue([
				{ name: 'upstream', url: 'https://github.com/org/repo.git' },
			]),
		});

		const result = await detectRepoSettings(jj);
		expect(result.remoteURL).toBe('https://github.com/org/repo.git');
	});

	it('returns undefined remoteURL when multiple non-origin remotes', async () => {
		const jj = mockJj({
			gitRemoteList: vi.fn().mockResolvedValue([
				{ name: 'upstream', url: 'https://a.com/repo.git' },
				{ name: 'fork', url: 'https://b.com/repo.git' },
			]),
		});

		const result = await detectRepoSettings(jj);
		expect(result.remoteURL).toBeUndefined();
	});

	it('returns undefined remoteURL when no remotes', async () => {
		const jj = mockJj();
		const result = await detectRepoSettings(jj);
		expect(result.remoteURL).toBeUndefined();
	});

	it('returns main bookmark when present', async () => {
		const jj = mockJj({
			bookmarkList: vi.fn().mockResolvedValue(['main', 'dev']),
		});

		const result = await detectRepoSettings(jj);
		expect(result.bookmarkName).toBe('main');
	});

	it('returns master bookmark as fallback', async () => {
		const jj = mockJj({
			bookmarkList: vi.fn().mockResolvedValue(['master', 'dev']),
		});

		const result = await detectRepoSettings(jj);
		expect(result.bookmarkName).toBe('master');
	});

	it('returns sole bookmark when no main/master', async () => {
		const jj = mockJj({
			bookmarkList: vi.fn().mockResolvedValue(['develop']),
		});

		const result = await detectRepoSettings(jj);
		expect(result.bookmarkName).toBe('develop');
	});

	it('returns undefined bookmarkName when multiple non-main bookmarks', async () => {
		const jj = mockJj({
			bookmarkList: vi.fn().mockResolvedValue(['dev', 'staging']),
		});

		const result = await detectRepoSettings(jj);
		expect(result.bookmarkName).toBeUndefined();
	});

	it('handles gitRemoteList failure gracefully', async () => {
		const jj = mockJj({
			gitRemoteList: vi.fn().mockRejectedValue(new Error('no git backend')),
			bookmarkList: vi.fn().mockResolvedValue(['main']),
		});

		const result = await detectRepoSettings(jj);
		expect(result.remoteURL).toBeUndefined();
		expect(result.bookmarkName).toBe('main');
	});

	it('handles bookmarkList failure gracefully', async () => {
		const jj = mockJj({
			gitRemoteList: vi.fn().mockResolvedValue([
				{ name: 'origin', url: 'https://github.com/user/repo.git' },
			]),
			bookmarkList: vi.fn().mockRejectedValue(new Error('failed')),
		});

		const result = await detectRepoSettings(jj);
		expect(result.remoteURL).toBe('https://github.com/user/repo.git');
		expect(result.bookmarkName).toBeUndefined();
	});
});
