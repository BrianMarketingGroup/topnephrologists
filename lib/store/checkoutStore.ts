import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMarketById, type SelectedMarket } from "@/lib/checkoutMarkets";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface ContactInfo {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
}

export interface PlaqueShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface PaymentInfo {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
}

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface BusinessHoursDay {
  open: boolean;
  from: string;
  to: string;
}

export type BusinessHours = Record<DayKey, BusinessHoursDay>;

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function defaultBusinessHours(): BusinessHours {
  const weekday = { open: true, from: "09:00", to: "17:00" };
  const weekend = { open: false, from: "09:00", to: "17:00" };
  return {
    mon: { ...weekday },
    tue: { ...weekday },
    wed: { ...weekday },
    thu: { ...weekday },
    fri: { ...weekday },
    sat: { ...weekend },
    sun: { ...weekend },
  };
}

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface UploadedFileMeta {
  name: string;
  sizeKb: number;
  previewUrl: string;
}

export type UploadKind = "logo" | "profilePhoto" | "bannerImage";

// Preserved from the original site — the ApplyForm collected a two-value
// "Website Asset Permission" radio group ("grant" vs "support"), matching
// lib/schema.ts's applySchema.assetPermission enum, so the store keeps that
// enum directly rather than flattening it to a boolean.
export type AssetPermission = "grant" | "support";

export interface ListingInfo {
  businessName: string;
  people: string;
  listingPhone: string;
  listingEmail: string;
  website: string;
  sameAsBilling: boolean;
  businessAddress: BusinessAddress | null;
  bio: string;
  hours: BusinessHours;
  assetPermission: AssetPermission;
}

function defaultListingInfo(): ListingInfo {
  return {
    businessName: "",
    people: "",
    listingPhone: "",
    listingEmail: "",
    website: "",
    sameAsBilling: true,
    businessAddress: null,
    bio: "",
    hours: defaultBusinessHours(),
    assetPermission: "grant",
  };
}

interface CheckoutState {
  step: WizardStep;
  furthestStep: WizardStep;

  selectedMarkets: SelectedMarket[];
  specialtyIds: string[];

  contact: ContactInfo;
  plaqueShipping: PlaqueShippingAddress | null;

  payment: PaymentInfo;

  selectedUpsellIds: string[];

  listingChoice: "now" | "later" | null;
  listingInfo: ListingInfo;
  uploadedFiles: Partial<Record<UploadKind, UploadedFileMeta>>;

  debugSubmissionPayload: unknown | null;

  // Set once POST /api/deals succeeds (on leaving Step 4). Once non-null, the
  // deal is saved for real — goBack/goToStep lock out steps 1-4, and Step 5
  // becomes an update (/update_deals/{dealId}) rather than a create.
  dealId: number | null;

  // First-touch attribution (referrer + entry URL), captured once on wizard
  // mount — see CheckoutWizard's captureAttribution() call.
  trafficSource: string;
  landingPage: string;

  goToStep: (step: WizardStep) => void;
  goNext: () => void;
  goBack: () => void;
  captureAttribution: () => void;

  addMarket: (marketId: string) => void;
  removeMarket: (marketId: string) => void;
  toggleMarketFeatured: (marketId: string) => void;
  toggleSpecialty: (id: string) => void;

  setContact: (patch: Partial<ContactInfo>) => void;
  setPlaqueShipping: (addr: PlaqueShippingAddress | null) => void;

  setPayment: (patch: Partial<PaymentInfo>) => void;

  toggleUpsell: (id: string) => void;

  setListingChoice: (choice: "now" | "later" | null) => void;
  setListingInfo: (patch: Partial<ListingInfo>) => void;
  setUploadedFile: (kind: UploadKind, meta: UploadedFileMeta | null) => void;

  setDebugSubmissionPayload: (payload: unknown) => void;
  setDealId: (id: number | null) => void;

  reset: () => void;
}

type PersistedCheckoutState = Pick<
  CheckoutState,
  | "step"
  | "furthestStep"
  | "selectedMarkets"
  | "specialtyIds"
  | "contact"
  | "plaqueShipping"
  | "selectedUpsellIds"
  | "listingChoice"
  | "listingInfo"
  | "dealId"
  | "trafficSource"
  | "landingPage"
>;

const initialContact: ContactInfo = {
  firstName: "",
  lastName: "",
  title: "",
  company: "",
  email: "",
  phone: "",
  notes: "",
};

const initialPayment: PaymentInfo = {
  cardholderName: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
  billingAddress: "",
  billingCity: "",
  billingState: "",
  billingZip: "",
};

export const useCheckoutStore = create<CheckoutState>()(
  persist<CheckoutState, [], [], PersistedCheckoutState>(
    (set, get) => ({
      step: 1,
      furthestStep: 1,

      selectedMarkets: [],
      specialtyIds: [],

      contact: initialContact,
      plaqueShipping: null,

      payment: initialPayment,

      selectedUpsellIds: [],

      listingChoice: null,
      listingInfo: defaultListingInfo(),
      uploadedFiles: {},

      debugSubmissionPayload: null,

      dealId: null,
      trafficSource: "",
      landingPage: "",

      goToStep: (step) => {
        const { furthestStep, dealId } = get();
        if (dealId !== null && step < 5) return; // deal saved — no returning to 1-4
        if (step <= furthestStep) set({ step });
      },
      goNext: () =>
        set((state) => {
          const next = Math.min(state.step + 1, 6) as WizardStep;
          return { step: next, furthestStep: Math.max(state.furthestStep, next) as WizardStep };
        }),
      goBack: () =>
        set((state) => {
          if (state.dealId !== null) return state; // deal saved — no returning to 1-4
          return { step: Math.max(state.step - 1, 1) as WizardStep };
        }),
      captureAttribution: () =>
        set((state) => {
          // First-touch only — never overwrite once set (e.g. on remount).
          if (state.trafficSource || state.landingPage) return state;
          if (typeof window === "undefined") return state;
          return {
            trafficSource: document.referrer || "direct",
            landingPage: window.location.href,
          };
        }),

      addMarket: (marketId) =>
        set((state) => {
          if (state.selectedMarkets.some((m) => m.marketId === marketId)) return state;
          const market = getMarketById(marketId);
          if (!market) return state;
          return {
            selectedMarkets: [
              ...state.selectedMarkets,
              {
                marketId: market.id,
                city: market.city,
                state: market.state,
                // Featured is opted into on the Enhancements step (Step 4),
                // not pre-selected here — it hasn't been offered yet.
                featured: false,
              },
            ],
          };
        }),
      removeMarket: (marketId) =>
        set((state) => ({
          selectedMarkets: state.selectedMarkets.filter((m) => m.marketId !== marketId),
        })),
      toggleMarketFeatured: (marketId) =>
        set((state) => ({
          selectedMarkets: state.selectedMarkets.map((m) =>
            m.marketId === marketId ? { ...m, featured: !m.featured } : m,
          ),
        })),
      toggleSpecialty: (id) =>
        set((state) => ({
          specialtyIds: state.specialtyIds.includes(id)
            ? state.specialtyIds.filter((s) => s !== id)
            : [...state.specialtyIds, id],
        })),

      setContact: (patch) => set((state) => ({ contact: { ...state.contact, ...patch } })),
      setPlaqueShipping: (addr) => set({ plaqueShipping: addr }),

      setPayment: (patch) => set((state) => ({ payment: { ...state.payment, ...patch } })),

      toggleUpsell: (id) =>
        set((state) => ({
          selectedUpsellIds: state.selectedUpsellIds.includes(id)
            ? state.selectedUpsellIds.filter((u) => u !== id)
            : [...state.selectedUpsellIds, id],
        })),

      setListingChoice: (choice) => set({ listingChoice: choice }),
      setListingInfo: (patch) =>
        set((state) => ({ listingInfo: { ...state.listingInfo, ...patch } })),
      setUploadedFile: (kind, meta) =>
        set((state) => {
          const next = { ...state.uploadedFiles };
          if (meta) next[kind] = meta;
          else delete next[kind];
          return { uploadedFiles: next };
        }),

      setDebugSubmissionPayload: (payload) => set({ debugSubmissionPayload: payload }),
      setDealId: (id) => set({ dealId: id }),

      reset: () =>
        set({
          step: 1,
          furthestStep: 1,
          selectedMarkets: [],
          specialtyIds: [],
          contact: initialContact,
          plaqueShipping: null,
          payment: initialPayment,
          selectedUpsellIds: [],
          listingChoice: null,
          listingInfo: defaultListingInfo(),
          uploadedFiles: {},
          debugSubmissionPayload: null,
          dealId: null,
          trafficSource: "",
          landingPage: "",
        }),
    }),
    {
      name: "topnephrologists-checkout-v1",
      storage: {
        getItem: (key) => {
          if (typeof window === "undefined") return null;
          const item = sessionStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        },
        setItem: (key, value) => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem(key, JSON.stringify(value));
          }
        },
        removeItem: (key) => {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(key);
          }
        },
      },
      // Card details and transient file/debug state are never written to
      // sessionStorage.
      partialize: (state) => ({
        step: state.step,
        furthestStep: state.furthestStep,
        selectedMarkets: state.selectedMarkets,
        specialtyIds: state.specialtyIds,
        contact: state.contact,
        plaqueShipping: state.plaqueShipping,
        selectedUpsellIds: state.selectedUpsellIds,
        listingChoice: state.listingChoice,
        listingInfo: state.listingInfo,
        dealId: state.dealId,
        trafficSource: state.trafficSource,
        landingPage: state.landingPage,
      }),
    },
  ),
);
