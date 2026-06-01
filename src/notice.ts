import type { JjSyncSettings, NoticeLevel } from './types';

export type NoticeSeverity = 'INFO' | 'WARNING' | 'ERROR';
export type NoticeFactory = (message: string, timeout?: number) => void;

export class NoticeService {
	private getSettings: () => JjSyncSettings;
	private createNotice: NoticeFactory;

	constructor(getSettings: () => JjSyncSettings, createNotice: NoticeFactory) {
		this.getSettings = getSettings;
		this.createNotice = createNotice;
	}

	private shouldShow(severity: NoticeSeverity): boolean {
		const level: NoticeLevel = this.getSettings().noticeLevel;
		switch (level) {
			case 'ERROR':
				return severity === 'ERROR';
			case 'WARNING':
				return severity === 'WARNING' || severity === 'ERROR';
			case 'ALL':
			default:
				return true;
		}
	}

	show(message: string, severity: NoticeSeverity, timeout?: number): void {
		if (!this.shouldShow(severity)) return;
		this.createNotice(message, timeout);
	}

	showSyncSuccess(): void {
		if (!this.getSettings().showSyncSuccessNotice) return;
		this.show('jj sync complete', 'INFO');
	}
}
