import '../../style.css';
import { byId } from '../../shared/dom.ts';
import { initPageShell, renderToolsGrid } from '../../shared/shell.ts';

initPageShell();
renderToolsGrid(byId('tools-grid'));
