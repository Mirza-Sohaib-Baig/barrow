export const config = {
  siteName: "Barrow",
  currency: "GBP",
  freeShippingThreshold: 3500,
  taxRate: 0.2,
  shippingOptions: [
    {
      id: "standard",
      label: "Standard",
      minDays: 3,
      maxDays: 5,
      pricePence: 399,
    },
    {
      id: "express",
      label: "Express",
      minDays: 1,
      maxDays: 1,
      pricePence: 599,
    },
  ],
  cancelWindowHours: 24,
  returnWindowDays: 30,
  pageSize: 24,
} as const;
