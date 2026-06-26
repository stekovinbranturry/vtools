import React from 'react';
import {Box, Text} from 'ink';

export type KeyHint = {
	key: string;
	label: string;
};

type Props = {
	items: KeyHint[];
};

// Compact footer that renders keyboard shortcuts as `[key] label`, matching the
// de-facto Ink community pattern (InkUI's KeyHint). Kept as a local component
// instead of a runtime dependency since the published ones target ink6/react19.
export default function KeyHints({items}: Props) {
	return (
		<Box>
			{items.map((item, index) => (
				<Box key={`${item.key}-${item.label}`} marginLeft={index === 0 ? 0 : 3}>
					<Text>
						<Text dimColor>[</Text>
						<Text color="cyan">{item.key}</Text>
						<Text dimColor>]</Text>
						<Text dimColor> {item.label}</Text>
					</Text>
				</Box>
			))}
		</Box>
	);
}
