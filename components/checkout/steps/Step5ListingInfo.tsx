"use client";

import { useState } from "react";
import { Mail, FileEdit } from "lucide-react";
import { clsx } from "clsx";
import { z } from "zod";
import FadeIn from "@/components/ui/FadeIn";
import Button from "@/components/ui/Button";
import { FormField, Input, Select, Checkbox } from "@/components/ui/FormField";
import ListingPreviewMockup from "@/components/checkout/ListingPreviewMockup";
import CharacterCounterTextarea from "@/components/checkout/CharacterCounterTextarea";
import BusinessHoursEditor from "@/components/checkout/BusinessHoursEditor";
import FileUploadDropzone from "@/components/checkout/FileUploadDropzone";
import { useCheckoutStore, type UploadKind } from "@/lib/store/checkoutStore";
import { buildListingInfoNowSchema } from "@/lib/checkoutSchema";
import { ALL_STATES } from "@/lib/checkoutMarkets";
import type { SiteConfig } from "@/lib/config";

const UPLOAD_LABELS: Record<UploadKind, string> = {
  logo: "Logo",
  profilePhoto: "Profile Photo",
  bannerImage: "Banner Image",
};

// The /api/v1/update_deals/{id} endpoint accepts exactly three fixed multipart
// field names — anything else is silently dropped by FastAPI. Map the wizard's
// upload kinds onto those fixed names.
const UPLOAD_KIND_TO_ASSET_NAME: Record<UploadKind, "profile" | "banner" | "logo"> = {
  profilePhoto: "profile",
  bannerImage: "banner",
  logo: "logo",
};

export default function Step5ListingInfo({ config }: { config: SiteConfig }) {
  const store = useCheckoutStore();
  const [listingChoice, setLocalListingChoice] = useState<"now" | "later">(
    store.listingChoice ?? "now",
  );
  const [linkEmail, setLinkEmail] = useState(store.contact.email);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const info = store.listingInfo;
  const firstMarket = store.selectedMarkets[0] ?? null;

  // The deal already exists by the time this step renders (created on leaving
  // Step 4). This is always an *update* against that same deal — POST to
  // /api/v1/update_deals/{id}, multipart, `metadata` JSON string + optional
  // file fields (profile/banner/logo). Never a second create.
  async function postUpdate(metadata: Record<string, unknown>): Promise<boolean> {
    if (!store.dealId) return false;
    const formData = new FormData();
    formData.append("metadata", JSON.stringify(metadata));

    for (const kind of config.listingFields.fileUploadTypes) {
      const meta = store.uploadedFiles[kind];
      if (!meta) continue;
      const blob = await fetch(meta.previewUrl).then((r) => r.blob());
      formData.append(UPLOAD_KIND_TO_ASSET_NAME[kind], blob, meta.name);
    }

    const res = await fetch(`/api/update_deals/${store.dealId}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) return false;

    // Response includes signed GCS URLs — swap them in for the local blob
    // previews once they arrive so the Step 6 confirmation shows real assets.
    try {
      const data: { assets?: Record<string, string | null> } = await res.json();
      if (data.assets) {
        for (const kind of config.listingFields.fileUploadTypes) {
          const assetName = UPLOAD_KIND_TO_ASSET_NAME[kind];
          const signedUrl = data.assets[assetName];
          const existing = store.uploadedFiles[kind];
          if (signedUrl && existing) {
            store.setUploadedFile(kind, { ...existing, previewUrl: signedUrl });
          }
        }
      }
    } catch {
      // response wasn't JSON — the update itself still succeeded
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitError(null);

    if (listingChoice === "later") {
      const emailCheck = z.string().email("Enter a valid email address").safeParse(linkEmail);
      if (!emailCheck.success) {
        setErrors({ linkEmail: emailCheck.error.issues[0]?.message ?? "Enter a valid email address" });
        return;
      }
      setErrors({});
      setIsSubmitting(true);
      try {
        const ok = await postUpdate({
          shop_name: store.contact.company,
          link_email: linkEmail,
        }).catch(() => false);
        if (!ok) {
          setSubmitError("Something went wrong. Please try again.");
          return;
        }
        // Fire the "complete later" welcome/checklist email — best-effort;
        // a mail hiccup must not block finishing the wizard since the deal
        // is already saved.
        await fetch(`/api/complete_later_email/${store.dealId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: linkEmail }),
        }).catch(() => {});
        store.setListingChoice("later");
        store.goNext();
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const result = buildListingInfoNowSchema(config).safeParse({ listingChoice: "now", ...info });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      const metadata: Record<string, unknown> = {
        shop_name: info.businessName,
        key_staff: info.people,
        shop_phone: info.listingPhone,
        listing_email: info.listingEmail,
        website: info.website,
        asset_permission: info.assetPermission,
        bio: info.bio,
        hours: info.hours,
        ...(!info.sameAsBilling && info.businessAddress
          ? { business_address: info.businessAddress }
          : {}),
      };
      const ok = await postUpdate(metadata).catch(() => false);
      if (!ok) {
        setSubmitError("Something went wrong. Please try again.");
        return;
      }
      store.setListingChoice("now");
      store.goNext();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FadeIn>
      <div className="space-y-8 max-w-3xl">
        <ListingPreviewMockup
          businessName={info.businessName}
          bio={info.bio}
          people={info.people}
          market={firstMarket}
          logo={store.uploadedFiles.logo}
          hasFeatured={store.selectedMarkets.some((m) => m.featured)}
        />

        <div>
          <p className="text-sm font-semibold text-primary mb-2">How would you like to proceed?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLocalListingChoice("now")}
              className={clsx(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                listingChoice === "now"
                  ? "border-accent bg-accent/5"
                  : "border-border bg-card hover:border-accent/40",
              )}
            >
              <FileEdit size={18} className="text-primary shrink-0" />
              <div>
                <p className="font-semibold text-dark text-sm">Complete Listing Now</p>
                <p className="text-xs text-muted">Fill out your listing details right away.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setLocalListingChoice("later")}
              className={clsx(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                listingChoice === "later"
                  ? "border-accent bg-accent/5"
                  : "border-border bg-card hover:border-accent/40",
              )}
            >
              <Mail size={18} className="text-primary shrink-0" />
              <div>
                <p className="font-semibold text-dark text-sm">Email Me a Link to Complete Later</p>
                <p className="text-xs text-muted">
                  We&apos;ll send a checklist to finish your listing whenever you&apos;re ready.
                </p>
              </div>
            </button>
          </div>
        </div>

        {listingChoice === "later" && (
          <div className="rounded-xl border border-border bg-card p-4 max-w-md">
            <FormField
              label="Send the link to"
              required
              hint="We'll email a checklist to finish your listing to this address."
              error={errors.linkEmail}
            >
              <Input
                type="email"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                error={errors.linkEmail}
              />
            </FormField>
          </div>
        )}

        {listingChoice === "now" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Firm Name"
                required
                className="sm:col-span-2"
                error={errors.businessName}
              >
                <Input
                  value={info.businessName}
                  onChange={(e) => store.setListingInfo({ businessName: e.target.value })}
                  error={errors.businessName}
                />
              </FormField>
              <FormField
                label={config.listingFields.peopleLabel}
                required
                className="sm:col-span-2"
                hint="Separate multiple names with commas"
                error={errors.people}
              >
                <Input
                  value={info.people}
                  onChange={(e) => store.setListingInfo({ people: e.target.value })}
                  error={errors.people}
                />
              </FormField>
              <FormField label="Listing Phone Number" required error={errors.listingPhone}>
                <Input
                  value={info.listingPhone}
                  onChange={(e) => store.setListingInfo({ listingPhone: e.target.value })}
                  error={errors.listingPhone}
                />
              </FormField>
              <FormField label="Listing Email Address" required error={errors.listingEmail}>
                <Input
                  value={info.listingEmail}
                  onChange={(e) => store.setListingInfo({ listingEmail: e.target.value })}
                  error={errors.listingEmail}
                />
              </FormField>
              <FormField label="Website" className="sm:col-span-2" error={errors.website}>
                <Input
                  value={info.website}
                  onChange={(e) => store.setListingInfo({ website: e.target.value })}
                  error={errors.website}
                />
              </FormField>
            </div>

            <div>
              <Checkbox
                label="Business Address same as Billing Address"
                checked={info.sameAsBilling}
                onChange={(e) =>
                  store.setListingInfo({
                    sameAsBilling: e.target.checked,
                    businessAddress: e.target.checked
                      ? null
                      : (info.businessAddress ?? { street: "", city: "", state: "", zip: "" }),
                  })
                }
              />
              {!info.sameAsBilling && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <FormField label="Street" required className="sm:col-span-2">
                    <Input
                      value={info.businessAddress?.street ?? ""}
                      onChange={(e) =>
                        store.setListingInfo({
                          businessAddress: {
                            ...(info.businessAddress ?? { street: "", city: "", state: "", zip: "" }),
                            street: e.target.value,
                          },
                        })
                      }
                    />
                  </FormField>
                  <FormField label="City" required>
                    <Input
                      value={info.businessAddress?.city ?? ""}
                      onChange={(e) =>
                        store.setListingInfo({
                          businessAddress: {
                            ...(info.businessAddress ?? { street: "", city: "", state: "", zip: "" }),
                            city: e.target.value,
                          },
                        })
                      }
                    />
                  </FormField>
                  <FormField label="State" required>
                    <Select
                      value={info.businessAddress?.state ?? ""}
                      onChange={(e) =>
                        store.setListingInfo({
                          businessAddress: {
                            ...(info.businessAddress ?? { street: "", city: "", state: "", zip: "" }),
                            state: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="">Select…</option>
                      {ALL_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="ZIP" required>
                    <Input
                      value={info.businessAddress?.zip ?? ""}
                      onChange={(e) =>
                        store.setListingInfo({
                          businessAddress: {
                            ...(info.businessAddress ?? { street: "", city: "", state: "", zip: "" }),
                            zip: e.target.value,
                          },
                        })
                      }
                    />
                  </FormField>
                </div>
              )}
              {errors.businessAddress && (
                <p className="text-xs text-danger mt-1" role="alert">
                  {errors.businessAddress}
                </p>
              )}
            </div>

            <CharacterCounterTextarea
              label="About / Bio"
              value={info.bio}
              onChange={(v) => store.setListingInfo({ bio: v })}
              maxChars={config.listingFields.bioMaxChars}
              error={errors.bio}
              placeholder="Tell prospective clients about your firm…"
            />

            <BusinessHoursEditor
              value={info.hours}
              onChange={(hours) => store.setListingInfo({ hours })}
            />

            <div>
              <p className="text-sm font-semibold text-primary mb-2">
                Upload or Attach to Email
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {config.listingFields.fileUploadTypes.map((kind) => (
                  <FileUploadDropzone
                    key={kind}
                    label={UPLOAD_LABELS[kind]}
                    value={store.uploadedFiles[kind]}
                    onChange={(meta) => store.setUploadedFile(kind, meta)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-primary mb-3">
                Website Asset Permission <span className="text-accent-dark">*</span>
              </p>
              <div className="space-y-3">
                <label
                  className={clsx(
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors",
                    info.assetPermission === "grant"
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/40",
                  )}
                >
                  <input
                    type="radio"
                    checked={info.assetPermission === "grant"}
                    onChange={() => store.setListingInfo({ assetPermission: "grant" })}
                    className="mt-0.5 h-4 w-4 accent-accent shrink-0"
                  />
                  <div>
                    <p className="font-semibold text-sm text-dark">
                      I grant {config.siteName}.com permission
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      to use photos, logos, and content from my website for my directory listing.
                    </p>
                  </div>
                </label>
                <label
                  className={clsx(
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors",
                    info.assetPermission === "support"
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/40",
                  )}
                >
                  <input
                    type="radio"
                    checked={info.assetPermission === "support"}
                    onChange={() => store.setListingInfo({ assetPermission: "support" })}
                    className="mt-0.5 h-4 w-4 accent-accent shrink-0"
                  />
                  <div>
                    <p className="font-semibold text-sm text-dark">
                      I&apos;d like your support team to contact me
                    </p>
                    <p className="text-xs text-muted mt-0.5">to discuss assets and listing content.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {submitError && (
          <p className="text-sm text-danger" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={store.goBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : listingChoice === "later" ? "Send Me the Link" : "Submit"}
          </Button>
        </div>
      </div>
    </FadeIn>
  );
}
