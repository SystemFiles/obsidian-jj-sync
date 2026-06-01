import { describe, it, expect } from 'vitest';
import { classifyError } from './error-classifier';

describe('classifyError', () => {
	describe('auth errors', () => {
		it('classifies SSH permission denied', () => {
			const result = classifyError('Permission denied (publickey).');
			expect(result.category).toBe('auth');
			expect(result.message).toContain('Authentication failed');
		});

		it('classifies authentication failed', () => {
			const result = classifyError('fatal: Authentication failed for https://github.com/user/repo');
			expect(result.category).toBe('auth');
		});

		it('classifies 403 forbidden', () => {
			const result = classifyError('The requested URL returned error: 403');
			expect(result.category).toBe('auth');
		});

		it('classifies terminal prompts disabled', () => {
			const result = classifyError('could not read Username: terminal prompts disabled');
			expect(result.category).toBe('auth');
		});
	});

	describe('network errors', () => {
		it('classifies DNS resolution failure', () => {
			const result = classifyError('fatal: Could not resolve hostname github.com');
			expect(result.category).toBe('network');
			expect(result.message).toContain('Network error');
		});

		it('classifies connection refused', () => {
			const result = classifyError('Connection refused');
			expect(result.category).toBe('network');
		});

		it('classifies timeout', () => {
			const result = classifyError('Operation timed out');
			expect(result.category).toBe('network');
		});

		it('classifies connection reset', () => {
			const result = classifyError('Connection reset by peer');
			expect(result.category).toBe('network');
		});
	});

	describe('binary errors', () => {
		it('classifies ENOENT', () => {
			const result = classifyError('spawn jj ENOENT');
			expect(result.category).toBe('binary');
			expect(result.message).toContain('jj binary');
		});

		it('classifies no such file', () => {
			const result = classifyError('No such file or directory: /usr/local/bin/jj');
			expect(result.category).toBe('binary');
		});

		it('classifies command not found', () => {
			const result = classifyError('jj: command not found');
			expect(result.category).toBe('binary');
		});
	});

	describe('repo state errors', () => {
		it('classifies not a jj repo', () => {
			const result = classifyError('There is no jj repo in "."');
			expect(result.category).toBe('repo_state');
			expect(result.message).toContain('not a jj repository');
		});

		it('classifies stale workspace', () => {
			const result = classifyError('The working copy is stale (workspace is stale)');
			expect(result.category).toBe('repo_state');
		});
	});

	describe('push rejection errors', () => {
		it('classifies bookmark moved', () => {
			const result = classifyError('Refusing to push because bookmark main was moved on the remote');
			expect(result.category).toBe('push_rejection');
			expect(result.message).toContain('Push rejected');
		});

		it('classifies non-fast-forward', () => {
			const result = classifyError('error: failed to push: non-fast-forward');
			expect(result.category).toBe('push_rejection');
		});

		it('classifies remote rejected', () => {
			const result = classifyError('remote rejected: Updates were rejected');
			expect(result.category).toBe('push_rejection');
		});
	});

	describe('unknown errors', () => {
		it('returns unknown for unrecognized stderr', () => {
			const result = classifyError('something completely unexpected happened');
			expect(result.category).toBe('unknown');
			expect(result.message).toBe('something completely unexpected happened');
		});

		it('returns fallback message for empty stderr', () => {
			const result = classifyError('');
			expect(result.category).toBe('unknown');
			expect(result.message).toBe('An unknown error occurred.');
		});

		it('trims whitespace from unknown messages', () => {
			const result = classifyError('  some error  \n');
			expect(result.category).toBe('unknown');
			expect(result.message).toBe('some error');
		});
	});

	describe('priority ordering', () => {
		it('classifies by first matching category when multiple patterns match', () => {
			// "Permission denied" matches auth; "not found" matches binary.
			// Auth appears first in the pattern list, so it should win.
			const result = classifyError('Permission denied: file not found');
			expect(result.category).toBe('auth');
		});
	});
});
