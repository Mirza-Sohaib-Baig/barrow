"use client";

import { useEffect, useRef } from "react";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";

export type StripeHandles = {
  stripe: Stripe;
  elements: StripeElements;
};

export function PaymentElementField({
  amount,
  publishableKey,
  onReady,
}: {
  amount: number;
  publishableKey: string;
  onReady: (handles: StripeHandles | null) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || amount < 30) {
      onReadyRef.current(null);
      return;
    }

    let cancelled = false;
    let elements: StripeElements | null = null;

    void loadStripe(publishableKey).then((stripe) => {
      if (!stripe || cancelled || !mountRef.current) return;
      const night = document.documentElement.classList.contains("dark");
      elements = stripe.elements({
        mode: "payment",
        amount,
        currency: "gbp",
        appearance: { theme: night ? "night" : "stripe" },
      });
      const payment = elements.create("payment", {
        fields: { billingDetails: "never" },
      });
      payment.mount(mountRef.current);
      onReadyRef.current({ stripe, elements });
    });

    return () => {
      cancelled = true;
      elements?.getElement("payment")?.unmount();
      onReadyRef.current(null);
    };
  }, [amount, publishableKey]);

  return <div ref={mountRef} className="min-h-40" />;
}
