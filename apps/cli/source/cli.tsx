#!/usr/bin/env node
import React, {useState} from 'react';
import {Box, render, type Instance} from 'ink';
import meow from 'meow';
import ora from 'ora';
import {consumeResume, mountApp, setStandaloneMount} from './lib/ui-session';
import {runVsixDownload} from './tools/vsix/download';
import {promptInstallVsix} from './tools/vsix/prompt-install';
import {
	printVsixError,
	printVsixHeader,
	printVsixSuccess,
} from './tools/vsix/print-summary';
import VsixApp from './tools/vsix/VsixApp';
import SyncApp from './tools/sync/SyncApp';
import PortViewerApp from './tools/port/PortViewerApp';
import ScriptRunnerApp from './tools/script-runner/ScriptRunnerApp';
import {Banner} from './components/Banner';
import {checkForUpdates} from './update-check';

const cli = meow(
	`
	Usage
	  $ vkit
	  $ vkit port
	  $ vkit run
	  $ vkit vsix <extension>
	  $ vkit vsix
	  $ vkit vsix-sync

	Options
	  --version  Extension version (default: latest from Marketplace)
	  --out      Output file or directory (default: ~/Downloads)

	Examples
	  $ vkit
	  $ vkit port
	  $ vkit run
	  $ vkit vsix ms-python.python
	  $ vkit vsix ms-python.python --version 2024.20.0 --out ./extensions/
	  $ vkit vsix-sync
`,
	{
		importMeta: import.meta,
		flags: {
			version: {
				type: 'string',
			},
			out: {
				type: 'string',
			},
		},
	},
);

checkForUpdates();

const [command, extension] = cli.input;

function mountPortViewer(): Instance {
	return render(
		<Box flexDirection="column">
			<Banner />
			<PortViewerApp
				onBack={() => {
					process.exit(0);
				}}
			/>
		</Box>,
	);
}

function StandaloneScriptRunner() {
	const [resume] = useState(() => consumeResume());

	return (
		<Box flexDirection="column">
			<Banner />
			<ScriptRunnerApp
				onBack={() => {
					process.exit(0);
				}}
				initialResults={resume?.scriptRunnerResults}
			/>
		</Box>
	);
}

function mountScriptRunner(): Instance {
	return render(<StandaloneScriptRunner />);
}

async function runScriptMode() {
	if (!extension) {
		console.error('Usage: vkit vsix <extension>');
		process.exit(1);
	}

	printVsixHeader();

	const spinner = ora({
		color: 'cyan',
		text: '准备下载…',
	}).start();

	const result = await runVsixDownload({
		input: extension,
		version: cli.flags.version,
		out: cli.flags.out,
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

if (command === 'vsix') {
	if (extension) {
		await runScriptMode();
	} else {
		render(
			<Box flexDirection="column">
				<Banner />
				<VsixApp
					onBack={() => {
						process.exit(0);
					}}
				/>
			</Box>,
		);
	}
} else if (command === 'vsix-sync') {
	render(
		<Box flexDirection="column">
			<Banner />
			<SyncApp
				onBack={() => {
					process.exit(0);
				}}
			/>
		</Box>,
	);
} else if (command === 'port') {
	setStandaloneMount(mountPortViewer);
	mountPortViewer();
} else if (command === 'run') {
	setStandaloneMount(mountScriptRunner);
	mountScriptRunner();
} else if (command) {
	console.error(`Unknown command: ${command}`);
	process.exit(1);
} else {
	mountApp();
}
