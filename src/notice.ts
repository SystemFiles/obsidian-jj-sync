import type { JjSyncSettings, NoticeLevel } from './types';

export type NoticeSeverity = 'INFO' | 'WARNING' | 'ERROR';
export type NoticeFactory = (
	message: string | DocumentFragment,
	timeout?: number,
) => void;

const SEVERITY_INDICATORS: Record<NoticeSeverity, string> = {
	INFO: '●',
	WARNING: '⚠',
	ERROR: '✖',
};

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

	private buildFragment(
		message: string,
		severity: NoticeSeverity,
	): DocumentFragment {
		const doc =
			typeof activeDocument !== 'undefined'
				? activeDocument
				: document; // eslint-disable-line obsidianmd/prefer-active-doc -- fallback for test environments
		const frag = doc.createDocumentFragment();

		const indicator = doc.createElement('span');
		indicator.textContent = SEVERITY_INDICATORS[severity] + ' ';
		frag.appendChild(indicator);

		const prefix = doc.createElement('strong');
		// eslint-disable-next-line obsidianmd/ui/sentence-case -- "JJ Sync" is the plugin's proper name
		prefix.textContent = 'JJ Sync: ';
		frag.appendChild(prefix);

		const msg = doc.createElement('span');
		msg.textContent = message;
		frag.appendChild(msg);

		return frag;
	}

	show(message: string, severity: NoticeSeverity, timeout?: number): void {
		if (!this.shouldShow(severity)) return;
		this.createNotice(this.buildFragment(message, severity), timeout);
	}

	showSyncSuccess(): void {
		if (!this.getSettings().showSyncSuccessNotice) return;
		this.show('Sync complete', 'INFO');
	}
}
