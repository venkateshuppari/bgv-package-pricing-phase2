function makeSeed() {
  const checksCatalog = [
    { id: "IDENTITY", name: "Identity Check", price: 299, vendorCost: 120 },
    { id: "EDUCATION", name: "Education Check", price: 499, vendorCost: 210 },
    { id: "EMPLOYMENT", name: "Employment Check", price: 999, vendorCost: 450 },
    { id: "ADDRESS", name: "Address Check", price: 349, vendorCost: 150 },
    { id: "CRIMINAL", name: "Criminal Record Check", price: 599, vendorCost: 260 },
    { id: "CREDIT", name: "Credit Check", price: 249, vendorCost: 90 }
  ];

  // BUG (Hard, state leak): meant to just remember nothing — but the
  // missing-discountPercent default in server.js reads from this instead of 0.
  const lastDiscountPercent = 0;
  // BUG (Hard, stale cache): naive memoization keyed only on the check
  // selection, so it ignores discountPercent entirely on a repeat combo.
  const quoteCache = {};

  return { checksCatalog, lastDiscountPercent, quoteCache };
}

module.exports = { makeSeed };
