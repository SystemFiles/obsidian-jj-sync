// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JjSyncSettings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { NoticeService, type NoticeFactory } from './notice';

function makeSettings(
	overrides: Partial<JjSyncSettings> = {},
): JjSyncSettings {
	return { ...DEFAULT_SETTINGS, ...overrides };
}

function getFragment(mock: ReturnType<typeof vi.fn>): DocumentFragment {
	return mock.mock.calls[0]![0] as DocumentFragment;
}

function fragmentText(frag: DocumentFragment): string {
	return frag.textContent ?? '';
}

describe('NoticeService', () => {
	let mockNotice: NoticeFactory;

	beforeEach(() => {
		mockNotice = vi.fn<NoticeFactory>();
	});

	describe('show — fragment structure', () => {
		it('builds a fragment with severity indicator, prefix, and message', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ALL' }),
				mockNotice,
			);
			svc.show('test message', 'INFO');
			const frag = getFragment(mockNotice as ReturnType<typeof vi.fn>);
			expect(frag).toBeInstanceOf(DocumentFragment);

			const children = Array.from(frag.childNodes);
			expect(children).toHaveLength(3);
			expect(children[0]!.textContent).toBe('● ');
			expect(children[1]!.textContent).toBe('JJ Sync: ');
			expect((children[1] as HTMLElement).tagName).toBe('STRONG');
			expect(children[2]!.textContent).toBe('test message');
		});

		it('uses ⚠ indicator for WARNING', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ALL' }),
				mockNotice,
			);
			svc.show('caution', 'WARNING');
			expect(fragmentText(getFragment(mockNotice as ReturnType<typeof vi.fn>))).toBe(
				'⚠ JJ Sync: caution',
			);
		});

		it('uses ✖ indicator for ERROR', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ALL' }),
				mockNotice,
			);
			svc.show('failure', 'ERROR');
			expect(fragmentText(getFragment(mockNotice as ReturnType<typeof vi.fn>))).toBe(
				'✖ JJ Sync: failure',
			);
		});
	});

	describe('show — notice level ALL', () => {
		it('shows INFO notices', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ALL' }),
				mockNotice,
			);
			svc.show('test', 'INFO');
			expect(mockNotice).toHaveBeenCalledTimes(1);
		});

		it('shows WARNING notices', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ALL' }),
				mockNotice,
			);
			svc.show('warn', 'WARNING', 5000);
			expect(mockNotice).toHaveBeenCalledTimes(1);
			expect((mockNotice as ReturnType<typeof vi.fn>).mock.calls[0]![1]).toBe(5000);
		});

		it('shows ERROR notices', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ALL' }),
				mockNotice,
			);
			svc.show('err', 'ERROR');
			expect(mockNotice).toHaveBeenCalled();
		});
	});

	describe('show — notice level WARNING', () => {
		it('suppresses INFO notices', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'WARNING' }),
				mockNotice,
			);
			svc.show('test', 'INFO');
			expect(mockNotice).not.toHaveBeenCalled();
		});

		it('shows WARNING notices', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'WARNING' }),
				mockNotice,
			);
			svc.show('warn', 'WARNING');
			expect(mockNotice).toHaveBeenCalled();
		});

		it('shows ERROR notices', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'WARNING' }),
				mockNotice,
			);
			svc.show('err', 'ERROR');
			expect(mockNotice).toHaveBeenCalled();
		});
	});

	describe('show — notice level ERROR', () => {
		it('suppresses INFO notices', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ERROR' }),
				mockNotice,
			);
			svc.show('test', 'INFO');
			expect(mockNotice).not.toHaveBeenCalled();
		});

		it('suppresses WARNING notices', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ERROR' }),
				mockNotice,
			);
			svc.show('warn', 'WARNING');
			expect(mockNotice).not.toHaveBeenCalled();
		});

		it('shows ERROR notices', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ERROR' }),
				mockNotice,
			);
			svc.show('err', 'ERROR');
			expect(mockNotice).toHaveBeenCalled();
		});
	});

	describe('showSyncSuccess', () => {
		it('shows success notice when enabled and level is ALL', () => {
			const svc = new NoticeService(
				() =>
					makeSettings({
						noticeLevel: 'ALL',
						showSyncSuccessNotice: true,
					}),
				mockNotice,
			);
			svc.showSyncSuccess();
			expect(mockNotice).toHaveBeenCalled();
			expect(
				fragmentText(getFragment(mockNotice as ReturnType<typeof vi.fn>)),
			).toBe('● JJ Sync: Sync complete');
		});

		it('suppresses success notice when showSyncSuccessNotice is false', () => {
			const svc = new NoticeService(
				() =>
					makeSettings({
						noticeLevel: 'ALL',
						showSyncSuccessNotice: false,
					}),
				mockNotice,
			);
			svc.showSyncSuccess();
			expect(mockNotice).not.toHaveBeenCalled();
		});

		it('suppresses success notice when level is ERROR even if toggle is on', () => {
			const svc = new NoticeService(
				() =>
					makeSettings({
						noticeLevel: 'ERROR',
						showSyncSuccessNotice: true,
					}),
				mockNotice,
			);
			svc.showSyncSuccess();
			expect(mockNotice).not.toHaveBeenCalled();
		});
	});
});
