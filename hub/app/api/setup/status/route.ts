import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export async function GET() {
  const configPath = join(homedir(), '.synced', 'config.json');
  try {
    readFileSync(configPath);
    return Response.json({ configured: true });
  } catch {
    return Response.json({ configured: false });
  }
}
