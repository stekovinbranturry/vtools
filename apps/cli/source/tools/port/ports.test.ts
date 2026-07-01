import test from 'ava';
import {
	filterPorts,
	formatPortRow,
	parseLsofOutput,
	truncateText,
	type PortEntry,
} from './ports';

const sampleLsof = `p90344
cnode
f20
n*:3000
f21
n127.0.0.1:3001
p97605
cnode
f20
n*:3002
p49594
cnode
f14
n[::1]:5274
`;

test('parseLsofOutput extracts ports from lsof -F output', t => {
	const entries = parseLsofOutput(sampleLsof);

	t.is(entries.length, 4);
	t.deepEqual(entries[0], {
		port: 3000,
		pid: 90344,
		command: 'node',
		protocol: 'tcp',
	});
	t.deepEqual(entries[1], {
		port: 3001,
		pid: 90344,
		command: 'node',
		protocol: 'tcp',
	});
	t.deepEqual(entries[3], {
		port: 5274,
		pid: 49594,
		command: 'node',
		protocol: 'tcp',
	});
});

test('parseLsofOutput returns empty array for empty stdout', t => {
	t.deepEqual(parseLsofOutput(''), []);
});

test('filterPorts matches port number and process name', t => {
	const entries: PortEntry[] = [
		{
			port: 3000,
			pid: 1,
			command: 'node',
			fullCommand: 'node server.js',
			protocol: 'tcp',
		},
		{
			port: 5432,
			pid: 2,
			command: 'postgres',
			fullCommand: '/usr/local/bin/postgres',
			protocol: 'tcp',
		},
	];

	t.is(filterPorts(entries, '3000').length, 1);
	t.is(filterPorts(entries, 'node').length, 1);
	t.is(filterPorts(entries, 'server').length, 1);
	t.is(filterPorts(entries, '').length, 2);
});

test('truncateText keeps text within max length', t => {
	t.is(truncateText('hello', 10), 'hello');
	t.is(truncateText('hello world', 8), 'hello w…');
});

test('parseLsofOutput only keeps node processes', t => {
	const mixed = `p90344
cnode
f20
n*:3000
p19758
cssh
f9
n*:5432
`;
	const entries = parseLsofOutput(mixed);

	t.is(entries.length, 1);
	t.is(entries[0]!.port, 3000);
});

test('formatPortRow includes port pid and command', t => {
	const row = formatPortRow(
		{
			port: 3000,
			pid: 90344,
			command: 'node',
			fullCommand: 'node /Users/dev/app/server.js',
			protocol: 'tcp',
		},
		60,
	);

	t.regex(row.main, /3000/);
	t.regex(row.main, /90344/);
	t.regex(row.main, /server\.js/);
	t.is(row.detail, 'node /Users/dev/app/server.js');
});
