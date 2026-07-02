import {mountToolScreen} from '../../lib/mount-tool';
import VsixApp from './VsixApp';
import {runVsixCli, type VsixCliFlags} from './cli-run';

export function runVsixCommand(
	extension: string | undefined,
	flags: VsixCliFlags,
): void | Promise<void> {
	if (extension) {
		return runVsixCli(extension, flags);
	}

	mountToolScreen(VsixApp);
}
