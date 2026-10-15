import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Logo jako data URI do obrazków Open Graph (ImageResponse). */
export async function ogLogo(): Promise<string | undefined> {
  try {
    const buf = await readFile(join(process.cwd(), 'public/brand/logo-128.png'));
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return undefined;
  }
}
