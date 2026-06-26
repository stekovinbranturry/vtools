import {createRequire} from 'node:module';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';

const require = createRequire(import.meta.url);

type PackageJson = {
	name: string;
	version: string;
};

// Checks npm (once per day, in a detached background process) and shows an
// upgrade hint at exit when a newer version is published. Never blocks startup
// and silently no-ops in CI / non-TTY environments.
export function checkForUpdates(): void {
	let pkg: PackageJson;

	try {
		pkg = require('../package.json') as PackageJson;
	} catch {
		return;
	}

	if (!pkg?.name || !pkg?.version) {
		return;
	}

	const notifier = updateNotifier({
		pkg,
		updateCheckInterval: 1000 * 60 * 60 * 24,
	});

	const update = notifier.update;

	if (!update) {
		return;
	}

	const message = [
		`${chalk.bold(pkg.name)} 有新版本可用：${chalk.dim(update.current)} → ${chalk.green(
			update.latest,
		)}`,
		`运行 ${chalk.cyan(`npm i -g ${pkg.name}`)} 升级`,
	].join('\n');

	notifier.notify({
		message,
		isGlobal: true,
		defer: true,
	});
}
