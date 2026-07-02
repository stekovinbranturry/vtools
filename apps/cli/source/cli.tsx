#!/usr/bin/env node
import meow from 'meow';
import {dispatch} from './commands/dispatch';
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

const [command, ...args] = cli.input;

await dispatch(command, {
	args,
	flags: cli.flags,
});
