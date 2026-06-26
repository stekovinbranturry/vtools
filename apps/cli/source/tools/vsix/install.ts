import {execa} from 'execa';
import which from 'which';

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
		if (which.sync(cli, {nothrow: true})) {
			editors.push(cli);
		}
	}

	return editors;
}

export async function installVsix(
	editor: EditorCli,
	vsixPath: string,
): Promise<{success: boolean; message: string}> {
	const result = await execa(editor, ['--install-extension', vsixPath], {
		reject: false,
	});

	if (!result.failed && result.exitCode === 0) {
		return {
			success: true,
			message: `已安装到 ${getEditorLabel(editor)}`,
		};
	}

	const stderr = typeof result.stderr === 'string' ? result.stderr : '';
	const stdout = typeof result.stdout === 'string' ? result.stdout : '';

	return {
		success: false,
		message: (stderr || stdout || result.shortMessage || '安装失败').trim(),
	};
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
