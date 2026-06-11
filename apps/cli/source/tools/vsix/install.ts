import {spawn, spawnSync} from 'node:child_process';

export type EditorCli = 'cursor' | 'code';

const EDITOR_LABELS: Record<EditorCli, string> = {
	cursor: 'Cursor',
	code: 'VS Code',
};

export function getEditorLabel(editor: EditorCli): string {
	return EDITOR_LABELS[editor];
}

export function findEditorClis(): EditorCli[] {
	const editors: EditorCli[] = [];

	for (const cli of ['cursor', 'code'] as const) {
		const result = spawnSync('which', [cli], {encoding: 'utf8'});
		if (result.status === 0 && result.stdout.trim()) {
			editors.push(cli);
		}
	}

	return editors;
}

export function installVsix(
	editor: EditorCli,
	vsixPath: string,
): Promise<{success: boolean; message: string}> {
	return new Promise(resolve => {
		const child = spawn(editor, ['--install-extension', vsixPath], {
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stderr = '';
		let stdout = '';

		child.stdout?.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});

		child.stderr?.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		child.on('error', error => {
			resolve({
				success: false,
				message: error.message,
			});
		});

		child.on('close', code => {
			if (code === 0) {
				resolve({
					success: true,
					message: `已安装到 ${getEditorLabel(editor)}`,
				});
				return;
			}

			resolve({
				success: false,
				message: (stderr || stdout || '安装失败').trim(),
			});
		});
	});
}

export async function installVsixToEditors(
	editors: EditorCli[],
	vsixPath: string,
	onProgress?: (editor: EditorCli) => void,
): Promise<{
	success: boolean;
	message: string;
	results: Array<{editor: EditorCli; success: boolean; message: string}>;
}> {
	const results: Array<{editor: EditorCli; success: boolean; message: string}> =
		[];

	for (const editor of editors) {
		onProgress?.(editor);
		const result = await installVsix(editor, vsixPath);
		results.push({editor, ...result});
	}

	const succeeded = results.filter(result => result.success);
	const failed = results.filter(result => !result.success);

	if (failed.length === 0) {
		return {
			success: true,
			message: `已安装到 ${succeeded
				.map(r => getEditorLabel(r.editor))
				.join('、')}`,
			results,
		};
	}

	if (succeeded.length === 0) {
		return {
			success: false,
			message: failed
				.map(r => `${getEditorLabel(r.editor)}：${r.message}`)
				.join('；'),
			results,
		};
	}

	return {
		success: false,
		message: [
			`已安装到 ${succeeded.map(r => getEditorLabel(r.editor)).join('、')}`,
			...failed.map(r => `${getEditorLabel(r.editor)} 失败：${r.message}`),
		].join('；'),
		results,
	};
}
