import ora from 'ora';
import {promptInstallVsix} from './prompt-install';
import {printVsixError, printVsixHeader, printVsixSuccess} from './print-summary';
import {runVsixDownload} from './download';

export type VsixCliFlags = {
	version?: string;
	out?: string;
};

export async function runVsixCli(
	input: string,
	flags: VsixCliFlags = {},
): Promise<void> {
	printVsixHeader();

	const spinner = ora({
		color: 'cyan',
		text: '准备下载…',
	}).start();

	const result = await runVsixDownload({
		input,
		version: flags.version,
		out: flags.out,
		onStatus: message => {
			spinner.text = message;
		},
	});

	if (result.success) {
		spinner.succeed('下载完成');
		printVsixSuccess(result);

		if (result.filePath) {
			await promptInstallVsix(result.filePath);
		}

		process.exit(0);
	}

	spinner.fail('下载失败');
	printVsixError(result.message);
	process.exit(1);
}
