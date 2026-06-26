import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);

type PackageJson = {version?: string};

let resolved = '0.0.0';

try {
	resolved = (require('../package.json') as PackageJson).version ?? '0.0.0';
} catch {
	// keep fallback
}

export const version = resolved;
