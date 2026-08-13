"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";
import Button from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import OrderSummarySidebar from "@/components/checkout/OrderSummarySidebar";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { paymentSchema, type PaymentData } from "@/lib/checkoutSchema";
import { ALL_STATES } from "@/lib/checkoutMarkets";
import type { SiteConfig } from "@/lib/config";

const formatCardNumber = (v: string) =>
  v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export default function Step3Payment({ config }: { config: SiteConfig }) {
  const payment = useCheckoutStore((s) => s.payment);
  const setPayment = useCheckoutStore((s) => s.setPayment);
  const goNext = useCheckoutStore((s) => s.goNext);
  const goBack = useCheckoutStore((s) => s.goBack);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PaymentData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: payment,
  });

  function onSubmit(values: PaymentData) {
    setPayment(values);
    // No real processor call yet — advancing the step is the entire
    // "charge" simulation, matching the current site's existing apply flow.
    goNext();
  }

  return (
    <FadeIn>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-primary mb-1 flex items-center gap-2">
              <Lock size={16} className="text-muted" /> Complete Your Purchase
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Cardholder Name"
              required
              className="sm:col-span-2"
              error={errors.cardholderName?.message}
            >
              <Input {...register("cardholderName")} error={errors.cardholderName?.message} />
            </FormField>

            <Controller
              name="cardNumber"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Credit Card Number"
                  required
                  className="sm:col-span-2"
                  error={errors.cardNumber?.message}
                >
                  <Input
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(formatCardNumber(e.target.value))}
                    error={errors.cardNumber?.message}
                  />
                </FormField>
              )}
            />

            <Controller
              name="expiry"
              control={control}
              render={({ field }) => (
                <FormField label="Expiration Date" required error={errors.expiry?.message}>
                  <Input
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(formatExpiry(e.target.value))}
                    error={errors.expiry?.message}
                  />
                </FormField>
              )}
            />

            <FormField label="CVV" required error={errors.cvv?.message}>
              <Input inputMode="numeric" maxLength={4} {...register("cvv")} error={errors.cvv?.message} />
            </FormField>

            <FormField
              label="Billing Address"
              required
              className="sm:col-span-2"
              error={errors.billingAddress?.message}
            >
              <Input {...register("billingAddress")} error={errors.billingAddress?.message} />
            </FormField>

            <FormField label="Billing City" required error={errors.billingCity?.message}>
              <Input {...register("billingCity")} error={errors.billingCity?.message} />
            </FormField>

            <FormField label="Billing State" required error={errors.billingState?.message}>
              <Select {...register("billingState")} error={errors.billingState?.message}>
                <option value="">Select…</option>
                {ALL_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Billing ZIP Code" required error={errors.billingZip?.message}>
              <Input {...register("billingZip")} error={errors.billingZip?.message} />
            </FormField>
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={goBack}>
              Back
            </Button>
            <Button type="submit">Continue</Button>
          </div>
        </form>

        <OrderSummarySidebar config={config} />
      </div>
    </FadeIn>
  );
}
