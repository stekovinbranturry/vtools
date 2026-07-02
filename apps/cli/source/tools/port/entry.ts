import {mountToolScreen} from '../../lib/mount-tool';
import PortViewerApp from './PortViewerApp';

export function runPortCommand(): void {
	mountToolScreen(PortViewerApp);
}
