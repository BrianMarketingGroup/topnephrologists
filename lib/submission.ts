import type { SiteConfig } from "@/lib/config";
import type { SelectedMarket } from "@/lib/checkoutMarkets";
import type {
  ContactInfo,
  PlaqueShippingAddress,
  PaymentInfo,
} from "@/lib/store/checkoutStore";
import { calculateQuote, formatCurrency } from "@/lib/pricing";

/**
 * Builds the payload for `POST /api/v1/deals` — matching big-swing-bff's
 * `DealCreate` field names exactly. Fired once, when the user leaves Step 4
 * (Enhancements). Step 5's listing info goes out later as a separate
 * `/update_deals/{dealId}` call, so shop_name(override)/key_staff/website/
 * shop_phone/asset_permission/bio/hours/business_address are NOT included here.
 *
 * platform_id is intentionally omitted: the /api/deals proxy injects it
 * server-side from BIG_SWING_PLATFORM_ID so the browser never sees it.
 */
export function buildDealCreatePayload(params: {
  config: SiteConfig;
  selectedMarkets: SelectedMarket[];
  specialtyIds: string[];
  contact: ContactInfo;
  plaqueShipping: PlaqueShippingAddress | null;
  payment: PaymentInfo;
  trafficSource: string;
  landingPage: string;
}) {
  const {
    config,
    selectedMarkets,
    specialtyIds,
    contact,
    plaqueShipping,
    payment,
    trafficSource,
    landingPage,
  } = params;

  const services = specialtyIds
    .map((id) => config.specialty?.options.find((o) => o.id === id)?.label)
    .filter((label): label is string => Boolean(label));

  const featured = selectedMarkets.some((m) => m.featured);
  const excludedFeatured = selectedMarkets
    .filter((m) => !m.featured)
    .map((m) => `${m.city}|${m.state}`);
  const quote = calculateQuote({
    cities: selectedMarkets.map((m) => ({ city: m.city, state: m.state })),
    featured,
    excludedFeatured,
  });
  const pricingBreakdown = [
    ...quote.lineItems.map((li) => `${li.label}: ${formatCurrency(li.amount)}`),
    `Total: ${formatCurrency(quote.total)}`,
  ].join(" | ");

  const featuredCities = selectedMarkets
    .filter((m) => m.featured)
    .map((m) => `${m.city}, ${m.state}`);

  return {
    tier: featured ? "featured" : "paid",

    timestamp: new Date().toISOString(),
    traffic_source: trafficSource || "direct",
    landing_page: landingPage || "/apply",

    contact_first: contact.firstName,
    contact_last: contact.lastName,
    contact_email: contact.email,
    contact_phone: contact.phone,
    title: contact.title,
    notes: contact.notes,
    shop_name: contact.company,

    cities: selectedMarkets.map((m) => `${m.city}, ${m.state}`),
    featured_cities: featuredCities,
    services,

    ...(config.shippingRequired && plaqueShipping
      ? {
          award_shipping_address: plaqueShipping.street,
          award_shipping_city: plaqueShipping.city,
          award_shipping_state: plaqueShipping.state,
          award_shipping_zip: plaqueShipping.zip,
        }
      : {}),

    quote_total: formatCurrency(quote.total),
    pricing_breakdown: pricingBreakdown,

    // The full card number AND CVV are sent by product-owner decision (BMG
    // processes these manually). NOTE: storing the CVV/CVC post-authorization
    // is prohibited by PCI-DSS Req 3.2 — retained here per explicit business
    // authorization.
    name_on_card: payment.cardholderName,
    card_number: payment.cardNumber.replace(/\s/g, ""),
    card_expiry: payment.expiry,
    card_cvc: payment.cvv,
    billing_address: payment.billingAddress,
    billing_city: payment.billingCity,
    billing_state: payment.billingState,
    billing_zip: payment.billingZip,
  };
}

/**
 * Maps the checkout wizard's store state into topaccountants' existing
 * ApplyFormData shape, so it can be POSTed straight to the existing
 * /api/apply route (which already validates against applySchema and calls
 * the BFF via lib/bff.ts — this function does not talk to the BFF directly).
 */
