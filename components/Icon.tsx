import { I } from '@/lib/icons';

/** Ikona SVG z zestawu Velorie. Wrapper ma display:contents, więc CSS działa jak w oryginale. */
export function Icon({ name, size, style }: { name: string; size?: number; style?: string }) {
  let svg = I[name] || '';
  if (size) svg = svg.replace('<svg', `<svg width="${size}" height="${size}"`);
  if (style) svg = svg.replace('<svg', `<svg style="${style}"`);
  return <span className="ic" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
