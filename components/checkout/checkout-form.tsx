"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { createCheckoutPayment } from "@/actions/checkout";
import { placeOrder } from "@/actions/orders";
import { OrderSummary } from "@/components/checkout/order-summary";
import { PaymentElementField, type StripeHandles } from "@/components/checkout/payment-element";
import { focusRingClass } from "@/components/product/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseAddress, type AddressInput } from "@/lib/address";
import { quoteCheckout, type CheckoutAddress, type CheckoutDraft } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { quoteCart } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const emptyAddress: AddressInput = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  postcode: "",
  phone: "",
};

function shippingAmount(subtotal: number, optionId: string): number {
  return quoteCart([{ unitPriceInPence: subtotal, quantity: 1 }], optionId).shipping;
}

function AddressCard({
  address,
  checked,
  onSelect,
}: {
  address: CheckoutAddress;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border border-border bg-card p-4",
        checked && "border-primary",
        focusRingClass,
      )}
    >
      <input
        type="radio"
        name="delivery-address"
        className="mt-1"
        checked={checked}
        onChange={onSelect}
      />
      <span className="flex flex-col gap-1 text-body">
        <span>{address.fullName}</span>
        <span className="text-small text-muted-foreground">
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ""}, {address.city} {address.postcode}
        </span>
      </span>
    </label>
  );
}

function Field({
  id,
  label,
  value,
  autoComplete,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11"
      />
      {error ? (
        <p id={errorId} role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckoutForm({ draft }: { draft: CheckoutDraft }) {
  const router = useRouter();
  const defaultAddress =
    draft.addresses.find((address) => address.isDefault)?.id ?? draft.addresses[0]?.id ?? "new";
  const [addressChoice, setAddressChoice] = useState(defaultAddress);
  const [address, setAddress] = useState<AddressInput>(emptyAddress);
  const [fieldError, setFieldError] = useState<Partial<Record<keyof AddressInput, string>>>({});
  const [shippingOptionId, setShippingOptionId] = useState("standard");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const handles = useRef<StripeHandles | null>(null);
  const submitting = useRef(false);

  const quote = useMemo(
    () => quoteCheckout(draft.lines, shippingOptionId),
    [draft.lines, shippingOptionId],
  );

  function chooseAddress(value: string) {
    setAddressChoice(value);
    setFieldError({});
    setFormError(null);
  }

  function changeAddress(field: keyof AddressInput, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
    setFieldError((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function pay() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setFormError(null);

    const stripeHandles = handles.current;
    if (!stripeHandles) {
      setFormError("Payment is still loading.");
      submitting.current = false;
      setPending(false);
      return;
    }

    let payload: {
      mode: CheckoutDraft["mode"];
      shippingOptionId: string;
      addressId?: string;
      address?: AddressInput;
    } = { mode: draft.mode, shippingOptionId };

    if (addressChoice === "new") {
      const parsed = parseAddress(address);
      if (!parsed.ok) {
        setFieldError({ [parsed.field]: parsed.error });
        submitting.current = false;
        setPending(false);
        return;
      }
      payload = { ...payload, address };
    } else {
      payload = { ...payload, addressId: addressChoice };
    }

    const submitted = await stripeHandles.elements.submit();
    if (submitted.error) {
      setFormError(submitted.error.message ?? "Check the card details and try again.");
      submitting.current = false;
      setPending(false);
      return;
    }

    try {
      const created = await createCheckoutPayment(payload);
      if (!created.ok) {
        setFormError(created.error);
        submitting.current = false;
        setPending(false);
        return;
      }
      if (created.data.amount !== quote.total) {
        setFormError("The total changed. Review it and try again.");
        submitting.current = false;
        setPending(false);
        return;
      }

      const billing = created.data.billing;
      const confirmed = await stripeHandles.stripe.confirmPayment({
        elements: stripeHandles.elements,
        clientSecret: created.data.clientSecret,
        confirmParams: {
          return_url: window.location.href,
          payment_method_data: {
            billing_details: {
              name: billing.fullName,
              email: billing.email,
              phone: billing.phone,
              address: {
                line1: billing.line1,
                line2: billing.line2 ?? undefined,
                city: billing.city,
                state: "",
                postal_code: billing.postcode,
                country: "GB",
              },
            },
          },
        },
        redirect: "if_required",
      });

      if (confirmed.error) {
        setFormError(confirmed.error.message ?? "The card was declined.");
        submitting.current = false;
        setPending(false);
        return;
      }

      const paymentIntent = confirmed.paymentIntent;
      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        setFormError("The payment has not completed.");
        submitting.current = false;
        setPending(false);
        return;
      }

      const placed = await placeOrder({ paymentIntentId: paymentIntent.id });
      if (!placed.ok) {
        setFormError(placed.error);
        submitting.current = false;
        setPending(false);
        return;
      }

      router.push(`/orders/${placed.data.orderNumber}`);
    } catch (error) {
      console.error(error);
      setFormError("We could not place the order. Try again.");
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 pb-64 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:pb-0">
      <form
        className="flex flex-col gap-10"
        onSubmit={(event) => {
          event.preventDefault();
          void pay();
        }}
      >
        <section className="flex flex-col gap-4">
          <h2 className="text-h2">Delivery address</h2>
          {draft.addresses.length > 0 ? (
            <div className="flex flex-col gap-3">
              {draft.addresses.map((saved) => (
                <AddressCard
                  key={saved.id}
                  address={saved}
                  checked={addressChoice === saved.id}
                  onSelect={() => chooseAddress(saved.id)}
                />
              ))}
              <label
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border border-border bg-card p-4",
                  addressChoice === "new" && "border-primary",
                )}
              >
                <input
                  type="radio"
                  name="delivery-address"
                  className="mt-1"
                  checked={addressChoice === "new"}
                  onChange={() => chooseAddress("new")}
                />
                <span>Use a new address</span>
              </label>
            </div>
          ) : null}
          {addressChoice === "new" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="checkout-name"
                label="Full name"
                value={address.fullName}
                autoComplete="name"
                error={fieldError.fullName}
                onChange={(value) => changeAddress("fullName", value)}
              />
              <Field
                id="checkout-phone"
                label="Phone"
                value={address.phone}
                autoComplete="tel"
                error={fieldError.phone}
                onChange={(value) => changeAddress("phone", value)}
              />
              <div className="sm:col-span-2">
                <Field
                  id="checkout-line1"
                  label="Address line 1"
                  value={address.line1}
                  autoComplete="address-line1"
                  error={fieldError.line1}
                  onChange={(value) => changeAddress("line1", value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  id="checkout-line2"
                  label="Address line 2"
                  value={address.line2 ?? ""}
                  autoComplete="address-line2"
                  error={fieldError.line2}
                  onChange={(value) => changeAddress("line2", value)}
                />
              </div>
              <Field
                id="checkout-city"
                label="Town or city"
                value={address.city}
                autoComplete="address-level2"
                error={fieldError.city}
                onChange={(value) => changeAddress("city", value)}
              />
              <Field
                id="checkout-postcode"
                label="Postcode"
                value={address.postcode}
                autoComplete="postal-code"
                error={fieldError.postcode}
                onChange={(value) => changeAddress("postcode", value)}
              />
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-h2">Shipping</h2>
          <div className="flex flex-col gap-3">
            {draft.shipping.map((option) => {
              const amount = shippingAmount(quote.subtotal, option.id);
              const checked = shippingOptionId === option.id;
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border bg-card p-4",
                    checked && "border-primary",
                  )}
                >
                  <span className="flex gap-3">
                    <input
                      type="radio"
                      name="shipping-speed"
                      className="mt-1"
                      checked={checked}
                      onChange={() => {
                        setShippingOptionId(option.id);
                        setFormError(null);
                      }}
                    />
                    <span className="flex flex-col gap-1">
                      <span>{option.label}</span>
                      <span className="text-small text-muted-foreground">{option.arrival}</span>
                    </span>
                  </span>
                  <span className="tnum">{amount === 0 ? "Free" : formatPrice(amount)}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-h2">Payment</h2>
          <PaymentElementField
            amount={quote.total}
            publishableKey={draft.publishableKey}
            onReady={(next) => {
              handles.current = next;
            }}
          />
          {formError ? (
            <p role="alert" data-testid="checkout-error" className="text-small text-destructive">
              {formError}
            </p>
          ) : null}
          <Button
            type="submit"
            className="hidden h-11 lg:inline-flex"
            disabled={pending}
            aria-busy={pending}
            data-testid="pay-button"
          >
            {pending ? "Placing order" : `Pay ${formatPrice(quote.total)}`}
          </Button>
        </section>
      </form>

      <div className="hidden lg:block">
        <OrderSummary lines={draft.lines} quote={quote} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 lg:hidden">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-small text-muted-foreground">Total</span>
            <span className="text-h3 tnum" data-testid="checkout-total" aria-live="polite">
              {formatPrice(quote.total)}
            </span>
          </div>
          <Button
            type="button"
            className="h-11"
            disabled={pending}
            aria-busy={pending}
            data-testid="pay-button-mobile"
            onClick={() => void pay()}
          >
            {pending ? "Placing order" : "Pay"}
          </Button>
        </div>
      </div>
    </div>
  );
}
