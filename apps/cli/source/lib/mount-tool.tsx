import React from 'react';
import {Box, render, type Instance} from 'ink';
import {Banner} from '../components/Banner';

export function exitTool(): void {
	process.exit(0);
}

export function mountToolScreen(
	Tool: React.ComponentType<{onBack: () => void}>,
): Instance {
	return render(
		<Box flexDirection="column">
			<Banner />
			<Tool onBack={exitTool} />
		</Box>,
	);
}
