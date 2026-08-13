"use client";

import { useEffect, useRef } from "react";
import type { SiteConfig } from "@/lib/config";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import StepProgress from "./StepProgress";
import Step1SelectMarket from "./steps/Step1SelectMarket";
import Step2ContactInfo from "./steps/Step2ContactInfo";
import Step3Payment from "./steps/Step3Payment";
import Step4Upsells from "./steps/Step4Upsells";
import Step5ListingInfo from "./steps/Step5ListingInfo";
import Step6ThankYou from "./steps/Step6ThankYou";

export default function CheckoutWizard({ config }: { config: SiteConfig }) {
  const step = useCheckoutStore((s) => s.step);
  const captureAttribution = useCheckoutStore((s) => s.captureAttribution);
  const topRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // First-touch attribution (referrer + entry URL) — captured once here so
  // it's set before Step 4 builds the deal payload, regardless of which step
  // the user starts on (e.g. resuming a persisted session).
  useEffect(() => {
    captureAttribution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jump back to the top of the step content on every step change so the
  // next screen starts in view instead of wherever the user scrolled to on
  // the previous (long) screen — most noticeable on mobile where a single
  // step can be several screens tall.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  return (
    <div className="min-h-screen bg-bg py-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div ref={topRef} className="mb-6 scroll-mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-dark">
            {config.brandTagline}
          </p>
          <h1 className="text-2xl font-bold text-primary">{config.siteName}</h1>
        </div>

        <StepProgress />

        {step === 1 && <Step1SelectMarket config={config} />}
        {step === 2 && <Step2ContactInfo config={config} />}
        {step === 3 && <Step3Payment config={config} />}
        {step === 4 && <Step4Upsells config={config} />}
        {step === 5 && <Step5ListingInfo config={config} />}
        {step === 6 && <Step6ThankYou config={config} />}
      </div>
    </div>
  );
}
