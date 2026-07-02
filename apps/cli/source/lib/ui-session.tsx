import {render, type Instance} from 'ink';
import React from 'react';
import App from '../app';

export type ScriptRunResult = {
	label: string;
	exitCode: number;
};

export type DashboardResume = {
	activeTool: 'script-runner';
	scriptRunnerResults: ScriptRunResult[];
};

let resume: DashboardResume | null = null;
let instance: Instance | null = null;
let standaloneMount: (() => Instance) | null = null;

function releaseStdin() {
	if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
		process.stdin.setRawMode(false);
	}

	process.stdin.resume();
}

function prepareStdinForInk() {
	if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
		process.stdin.setRawMode(true);
	}

	process.stdin.resume();
}

export function consumeResume(): DashboardResume | null {
	const next = resume;
	resume = null;
	return next;
}

export function setStandaloneMount(mount: (() => Instance) | null) {
	standaloneMount = mount;
}

export function mountApp(): Instance {
	instance = standaloneMount ? standaloneMount() : render(<App />);
	return instance;
}

export async function withInheritedStdio<T>(
	fn: () => Promise<T>,
	toResume: (result: T) => DashboardResume,
): Promise<T> {
	instance?.unmount();
	instance = null;
	releaseStdin();

	let result: T;
	try {
		result = await fn();
		resume = toResume(result);
	} catch (error) {
		resume = {
			activeTool: 'script-runner',
			scriptRunnerResults: [{label: '', exitCode: 1}],
		};
		throw error;
	} finally {
		prepareStdinForInk();
		mountApp();
	}

	return result;
}
