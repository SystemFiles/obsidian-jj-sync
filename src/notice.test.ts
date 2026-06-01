import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JjSyncSettings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { NoticeService } from './notice';

function makeSettings(overrides: Partial<JjSyncSettings> = {}): JjSyncSettings {
	return { ...DEFAULT_SETTINGS, ...overrides };
}

describe('NoticeService', () => {
	let mockNotice: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockNotice = vi.fn();
	});

	describe('show — notice level ALL', () => {
		it('shows INFO notices', () => {
			const svc = new NoticeService(() => makeSettings({ noticeLevel: 'ALL' }), mockNotice);
			svc.show('test', 'INFO');
			expect(mockNotice).toHaveBeenCalledWith('test', undefined);
		});

		it('shows WARNING notices', () => {
			const svc = new NoticeService(() => makeSettings({ noticeLevel: 'ALL' }), mockNotice);
			svc.show('warn', 'WARNING', 5000);
			expect(mockNotice).toHaveBeenCalledWith('warn', 5000);
		});

		it('shows ERROR notices', () => {
			const svc = new NoticeService(() => makeSettings({ noticeLevel: 'ALL' }), mockNotice);
			svc.show('err', 'ERROR');
			expect(mockNotice).toHaveBeenCalled();
		});
	});

	describe('show — notice level WARNING', () => {
		it('suppresses INFO notices', () => {
			const svc = new NoticeService(() => makeSettings({ noticeLevel: 'WARNING' }), mockNotice);
			svc.show('test', 'INFO');
			expect(mockNotice).not.toHaveBeenCalled();
		});

		it('shows WARNING notices', () => {
			const svc = new NoticeService(() => makeSettings({ noticeLevel: 'WARNING' }), mockNotice);
			svc.show('warn', 'WARNING');
			expect(mockNotice).toHaveBeenCalled();
		});

		it('shows ERROR notices', () => {
			const svc = new NoticeService(() => makeSettings({ noticeLevel: 'WARNING' }), mockNotice);
			svc.show('err', 'ERROR');
			expect(mockNotice).toHaveBeenCalled();
		});
	});

	describe('show — notice level ERROR', () => {
		it('suppresses INFO notices', () => {
			const svc = new NoticeService(() => makeSettings({ noticeLevel: 'ERROR' }), mockNotice);
			svc.show('test', 'INFO');
			expect(mockNotice).not.toHaveBeenCalled();
		});

		it('suppresses WARNING notices', () => {
			const svc = new NoticeService(() => makeSettings({ noticeLevel: 'ERROR' }), mockNotice);
			svc.show('warn', 'WARNING');
			expect(mockNotice).not.toHaveBeenCalled();
		});

		it('shows ERROR notices', () => {
			const svc = new NoticeService(() => makeSettings({ noticeLevel: 'ERROR' }), mockNotice);
			svc.show('err', 'ERROR');
			expect(mockNotice).toHaveBeenCalled();
		});
	});

	describe('showSyncSuccess', () => {
		it('shows success notice when enabled and level is ALL', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ALL', showSyncSuccessNotice: true }),
				mockNotice,
			);
			svc.showSyncSuccess();
			expect(mockNotice).toHaveBeenCalled();
		});

		it('suppresses success notice when showSyncSuccessNotice is false', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ALL', showSyncSuccessNotice: false }),
				mockNotice,
			);
			svc.showSyncSuccess();
			expect(mockNotice).not.toHaveBeenCalled();
		});

		it('suppresses success notice when level is ERROR even if toggle is on', () => {
			const svc = new NoticeService(
				() => makeSettings({ noticeLevel: 'ERROR', showSyncSuccessNotice: true }),
				mockNotice,
			);
			svc.showSyncSuccess();
			expect(mockNotice).not.toHaveBeenCalled();
		});
	});
});
