import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.short,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#04060b',
    theme_color: '#04060b',
    lang: 'pl',
    icons: [
      { src: '/brand/logo-128.png', sizes: '128x128', type: 'image/png' },
      { src: '/brand/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
