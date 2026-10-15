import type { LicId, Plat } from './catalog';

/** Produkt w postaci bezpiecznej do wysłania do przeglądarki (bez downloadUrl). */
export interface ProductDTO {
  id: string; // slug
  slug: string;
  name: string;
  cat: string;
  plat: Plat;
  art: string;
  seller: string;
  price: number;
  old: number | null;
  rating: number;
  reviews: number;
  sales: number;
  badge: string;
  tech: string[];
  compat: string;
  type: string;
  version: string;
  updated: string;
  desc: string;
  longDesc: string;
  feats: string[];
  resmon: string | null;
  imageUrl: string | null;
  changelog: { version: string; date: string; notes: string[] }[];
}

export interface SellerDTO {
  slug: string;
  name: string;
  color: string;
  official: boolean;
  sales: number;
  products: number;
  rating: number;
  since: number;
  bio: string;
}

export interface CartItem {
  slug: string;
  lic: LicId;
  name: string;
  price: number; // cena bazowa (Standard) — tylko do wyświetlania; serwer zawsze liczy sam
  art: string;
  plat: Plat;
  imageUrl?: string | null;
}
