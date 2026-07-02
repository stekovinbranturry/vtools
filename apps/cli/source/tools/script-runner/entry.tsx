import React, {useState} from 'react';
import {mountToolScreen} from '../../lib/mount-tool';
import {consumeResume, setStandaloneMount} from '../../lib/ui-session';
import ScriptRunnerApp from './ScriptRunnerApp';

function ScriptRunnerWithResume({onBack}: {onBack: () => void}) {
	const [resume] = useState(() => consumeResume());

	return (
		<ScriptRunnerApp
			onBack={onBack}
			initialResults={resume?.scriptRunnerResults}
		/>
	);
}

export function runScriptRunnerCommand(): void {
	const mount = () => mountToolScreen(ScriptRunnerWithResume);
	setStandaloneMount(mount);
	mount();
}
