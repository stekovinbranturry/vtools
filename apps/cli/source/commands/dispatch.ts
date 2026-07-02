import {mountApp} from '../lib/ui-session';
import {runPortCommand} from '../tools/port/entry';
import {runScriptRunnerCommand} from '../tools/script-runner/entry';
import {runVsixSyncCommand} from '../tools/sync/entry';
import {runVsixCommand} from '../tools/vsix/entry';

export type CliFlags = {
	version?: string;
	out?: string;
};

export type CliContext = {
	args: string[];
	flags: CliFlags;
};

type CommandHandler = (context: CliContext) => void | Promise<void>;

const commands: Record<string, CommandHandler> = {
	vsix: ({args, flags}) => runVsixCommand(args[0], flags),
	'vsix-sync': () => runVsixSyncCommand(),
	port: () => runPortCommand(),
	run: () => runScriptRunnerCommand(),
};

export async function dispatch(
	command: string | undefined,
	context: CliContext,
): Promise<void> {
	if (!command) {
		mountApp();
		return;
	}

	const handler = commands[command];
	if (!handler) {
		console.error(`Unknown command: ${command}`);
		process.exit(1);
	}

	await handler(context);
}
