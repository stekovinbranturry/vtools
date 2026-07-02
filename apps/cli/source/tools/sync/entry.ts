import {mountToolScreen} from '../../lib/mount-tool';
import SyncApp from './SyncApp';

export function runVsixSyncCommand(): void {
	mountToolScreen(SyncApp);
}
