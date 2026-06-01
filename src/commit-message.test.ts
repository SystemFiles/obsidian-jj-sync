import { describe, it, expect } from 'vitest';
import { formatSyncMessage } from './commit-message';

describe('formatSyncMessage', () => {
	it('formats a standard message', () => {
		const result = formatSyncMessage('my-laptop', new Date(2026, 5, 1, 14, 5, 9));
		expect(result).toBe('chore(vault): sync from my-laptop at 2026-06-01 14:05:09');
	});

	it('zero-pads single-digit month, day, hour, minute, second', () => {
		const result = formatSyncMessage('host', new Date(2026, 0, 2, 3, 4, 5));
		expect(result).toBe('chore(vault): sync from host at 2026-01-02 03:04:05');
	});

	it('sanitizes special characters in hostname', () => {
		const result = formatSyncMessage('my laptop!@#$%', new Date(2026, 5, 1, 12, 0, 0));
		expect(result).toBe('chore(vault): sync from my_laptop_____ at 2026-06-01 12:00:00');
	});

	it('preserves dots and hyphens in hostname', () => {
		const result = formatSyncMessage('host-name.local', new Date(2026, 5, 1, 12, 0, 0));
		expect(result).toBe('chore(vault): sync from host-name.local at 2026-06-01 12:00:00');
	});

	it('matches conventional commit format', () => {
		const result = formatSyncMessage('test', new Date());
		expect(result).toMatch(
			/^chore\(vault\): sync from .+ at \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
		);
	});
});
