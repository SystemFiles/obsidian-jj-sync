export type NoticeLevel = 'ALL' | 'WARNING' | 'ERROR';

export interface JjSyncSettings {
	remoteURL: string;
	jjBinaryPath: string;
	bookmarkName: string;
	noticeLevel: NoticeLevel;
	autoSyncOnStartup: boolean;
	checkStatusOnStartup: boolean;
	syncIntervalMinutes: number;
	showSyncSuccessNotice: boolean;
}

export const DEFAULT_SETTINGS: JjSyncSettings = {
	remoteURL: '',
	jjBinaryPath: 'jj',
	bookmarkName: 'main',
	noticeLevel: 'ALL',
	autoSyncOnStartup: false,
	checkStatusOnStartup: true,
	syncIntervalMinutes: 0,
	showSyncSuccessNotice: true,
};
