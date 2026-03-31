import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

interface EditorDef {
  id: string;
  label: string;
  app: string;
  cli: string | null;
}

interface TerminalDef {
  id: string;
  label: string;
  app: string;
  alwaysAvailable?: boolean;
}

export interface DetectedApp {
  id: string;
  label: string;
  available: boolean;
}

const EDITORS: EditorDef[] = [
  { id: 'vscode',    label: 'VS Code',      app: '/Applications/Visual Studio Code.app', cli: 'code' },
  { id: 'cursor',    label: 'Cursor',       app: '/Applications/Cursor.app',             cli: 'cursor' },
  { id: 'zed',       label: 'Zed',          app: '/Applications/Zed.app',                cli: 'zed' },
  { id: 'phpstorm',  label: 'PhpStorm',     app: '/Applications/PhpStorm.app',           cli: null },
  { id: 'sublime',   label: 'Sublime Text', app: '/Applications/Sublime Text.app',       cli: 'subl' },
];

const TERMINALS: TerminalDef[] = [
  { id: 'terminal', label: 'Terminal', app: '/System/Applications/Utilities/Terminal.app', alwaysAvailable: true },
  { id: 'iterm2',   label: 'iTerm2',  app: '/Applications/iTerm.app' },
  { id: 'warp',     label: 'Warp',    app: '/Applications/Warp.app' },
  { id: 'ghostty',  label: 'Ghostty', app: '/Applications/Ghostty.app' },
  { id: 'hyper',    label: 'Hyper',   app: '/Applications/Hyper.app' },
];

function cliAvailable(cli: string): boolean {
  try {
    execSync(`which ${cli}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function detectEditors(): DetectedApp[] {
  return EDITORS.map((e) => {
    const appExists = existsSync(e.app);
    const cliExists = e.cli ? cliAvailable(e.cli) : false;
    return { id: e.id, label: e.label, available: appExists || cliExists };
  });
}

function detectTerminals(): DetectedApp[] {
  return TERMINALS.map((t) => {
    if (t.alwaysAvailable) return { id: t.id, label: t.label, available: true };
    return { id: t.id, label: t.label, available: existsSync(t.app) };
  });
}

export async function GET() {
  try {
    const editors = detectEditors();
    const terminals = detectTerminals();
    return NextResponse.json({ editors, terminals });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
