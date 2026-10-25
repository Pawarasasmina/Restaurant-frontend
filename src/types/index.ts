export type Category = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
};
export type Option = {
  _id: string;
  name: string;
  priceDelta: number;
  available: boolean;
};
export type MenuItem = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  discountBps: number;
  ingredients: string[];
  allergens: string[];
  dietaryLabels: string[];
  prepMinutes: number;
  variants: Option[];
  extras: Option[];
  visible: boolean;
  available: boolean;
  soldOut: boolean;
  featured: boolean;
  category: Category;
};
export type Restaurant = {
  name: string;
  description?: string;
  heroImageUrl?: string;
  brandColor: string;
  phone?: string;
  email?: string;
  address?: string;
  mapUrl?: string;
  currency: string;
  taxRateBps: number;
  serviceRateBps: number;
  gallery: string[];
  openingHours: { day: number; open: string; close: string; closed: boolean }[];
  testimonials: { name: string; quote: string; visible: boolean }[];
  logoUrl?: string;
  websiteTheme?: {
    heroEyebrow?: string;
    heroTitle?: string;
    heroOverlay?: number;
    storyEyebrow?: string;
    storyTitle?: string;
    storyText?: string;
    storyImageUrl?: string;
    seasonalEnabled?: boolean;
    seasonalEffect?:
      | "none"
      | "christmas"
      | "new_year"
      | "poya"
      | "vesak"
      | "avurudu"
      | "valentine"
      | "halloween";
    stylePreset?:
      "signature" | "modern" | "minimal" | "tropical" | "monochrome";
    cardStyle?: "soft" | "outlined" | "glass";
    buttonStyle?: "pill" | "rounded" | "square";
    heroAlignment?: "left" | "center";
    contentWidth?: "comfortable" | "wide";
    announcement?: string;
    announcementEnabled?: boolean;
  };
};
export type Order = {
  _id: string;
  orderNumber: string;
  tableSession: string;
  items: {
    name: string;
    quantity: number;
    lineTotal: number;
    prepMinutes?: number;
    notes?: string;
    variant?: { name: string };
    extras: { name: string }[];
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  total: number;
  status: string;
  createdAt: string;
  table?: { number: string };
  statusHistory: { status: string; at: string; reason?: string }[];
};
export type TableSession = {
  session: { id: string; status: string; expiresAt: string };
  table: { id: string; number: string; displayName: string };
  joined: boolean;
};
