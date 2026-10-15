import { ImageResponse } from 'next/og';
import { OgFrame } from '@/components/OgFrame';
import { ogLogo } from '@/lib/og-logo';

export const alt = 'Velorie Market — pluginy Minecraft, skrypty FiveM, mapy i MLO';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  const logo = await ogLogo();
  return new ImageResponse(
    <OgFrame logo={logo} tag="MINECRAFT · FIVEM · DISCORD" title="Buduj serwery, bez kompromisów." sub="Pluginy, skrypty, mapy, interiory MLO i gotowe setupy z licencjami." />,
    size,
  );
}
