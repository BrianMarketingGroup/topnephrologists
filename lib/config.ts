/**
 * SiteConfig drives the checkout wizard (components/checkout/**) — every
 * screen reads behavior off this instead of hardcoding vertical-specific
 * logic, so the same wizard code can be reused across other BMG directory
 * sites later.
 *
 * Pricing, specialty list, and listing fields below are derived from this
 * site's own lib/pricing.ts (PRICING), content/services.ts (the nephrology
 * specialty list), and the old components/ApplyForm.tsx (Step 5's actual
 * field set).
 */

import { services } from "@/content/services";

export type MarketType =
  | "city"
  | "zip"
  | "county"
  | "airport"
  | "specialty"
  | "practiceArea"
  | "state";

export type SearchMode =
  | "state+city"
  | "zip"
  | "county"
  | "airport"
  | "specialty"
  | "practiceArea";

export interface ListingTier {
  id: string;
  label: string;
  isPaid: boolean;
  basePrice: number;
}

export type UpsellKind = "extra-year" | "extra-city" | "statewide" | "nationwide" | "sister-site";

export interface UpsellOption {
  id: string;
  label: string;
  description: string;
  price: number;
  kind: UpsellKind;
}

export interface SpecialtyOption {
  id: string;
  label: string;
}

export interface SiteConfig {
  siteName: string;
  brandTagline: string;
  businessNoun: string;

  marketType: MarketType;
  marketLabel: string;
  searchMode: SearchMode;

  listingTier: ListingTier;
  featuredScope: "city" | "city_and_specialty" | "specialty_only";
  // Cosmetic "starting at" display value only — the real per-slot price
  // (first city vs. additional cities) is computed by lib/pricing.ts's
  // calculateQuote(), not this flat config value.
  featuredUpgradePrice: number;
  upsells: UpsellOption[];

  specialty: {
    required: boolean;
    label: string;
    options: SpecialtyOption[];
    pricePerOption: number;
  } | null;

  shippingRequired: boolean;

  listingFields: {
    peopleLabel: string;
    bioMaxChars: number;
    fileUploadTypes: Array<"logo" | "profilePhoto" | "bannerImage">;
  };

  emailTemplates: {
    completeLaterChecklist: string;
    ccAddress: string;
  };

  multiMarketDiscount: {
    minMarkets: number;
    percentOff: number;
  };

  productionTimelineDays: number;
}

export const nephrologistsConfig: SiteConfig = {
  siteName: "Top Nephrologists",
  brandTagline: "Get Listed — TopNephrologists.com",
  businessNoun: "nephrology practice",

  marketType: "city",
  marketLabel: "City",
  searchMode: "state+city",

  // Basic listing is a per-city annual fee (lib/pricing.ts's basicPerCity) —
  // matches the old ApplyForm.tsx copy ("Secure annual listing fee. All
  // listings debut August 2026.").
  listingTier: {
    id: "standard",
    label: "Standard Listing",
    isPaid: true,
    basePrice: 289,
  },
  // Featured Placement is sold one-per-city in lib/pricing.ts (no per-specialty
  // pricing dimension exists — PRICING has no per-service rate), so this
  // stays "city" rather than "city_and_specialty".
  featuredScope: "city",
  featuredUpgradePrice: 689,

  // No enhancement upsells exist for this site today (ApplyForm.tsx's
  // "Enhance Your Listing" step only offers the Featured upgrade and adding
  // more cities, both already modeled via featuredScope/multi-market — there
  // is no additional paid enhancement list).
  upsells: [],

  // Nephrology Specialties are an *optional* free multi-select in the old
  // ApplyForm.tsx, backed by content/services.ts. No per-specialty pricing
  // exists (lib/pricing.ts's PRICING has no such rate), so pricePerOption is
  // 0 and required is false.
  specialty: {
    required: false,
    label: "Nephrology Specialties",
    options: services.map((s) => ({ id: s.id, label: s.label })),
    pricePerOption: 0,
  },

  // The old ApplyForm.tsx always collects a "Complimentary Plaque Delivery"
  // shipping address on Step 2, and lib/schema.ts's applySchema requires
  // plaqueShippingAddress/City/State/Zip — so shipping is always required.
  shippingRequired: true,

  listingFields: {
    peopleLabel: "Physicians",
    bioMaxChars: 1500,
    fileUploadTypes: ["logo", "profilePhoto", "bannerImage"],
  },

  emailTemplates: {
    completeLaterChecklist: "complete-later-checklist-v1",
    ccAddress: "support@digitalservicebrands.com",
  },

  // No multi-city discount offered today — set minMarkets unreachably high
  // rather than deleting the field (required by SiteConfig).
  multiMarketDiscount: {
    minMarkets: 999999,
    percentOff: 0,
  },

  productionTimelineDays: 10,
};
