/* ============================================================
   Public TLD pricing table — mirrors the §4.7 catalog in
   Cantila_Complete_Plan.md. The control plane carries the real
   pricebook in TLD_CATALOG; this static array exists only so
   the marketing pricing page renders without a control-plane
   round trip. Keep in sync with §4.7.
   ============================================================ */

export type TldPrice = {
  tld: string;
  perYear: string;
  retail?: string;
  note?: string;
};

export const TLD_PRICES: TldPrice[] = [
  { tld: ".xyz", perYear: "$1.99", retail: "$9–12", note: "Cheapest in catalog" },
  { tld: ".site", perYear: "$2.99", retail: "$25" },
  { tld: ".online", perYear: "$2.99", retail: "$30" },
  { tld: ".tech", perYear: "$5.99", retail: "$40" },
  { tld: ".com", perYear: "$8.99", retail: "$12–20", note: "Below every major retail registrar" },
  { tld: ".org", perYear: "$8.99", retail: "$12–15" },
  { tld: ".me", perYear: "$9.99", retail: "$20" },
  { tld: ".net", perYear: "$9.99", retail: "$15" },
  { tld: ".dev", perYear: "$10.99", retail: "$15" },
  { tld: ".app", perYear: "$11.99", retail: "$18" },
  { tld: ".build", perYear: "$11.99", retail: "$30" },
  { tld: ".store", perYear: "$14.99", retail: "$50" },
  { tld: ".shop", perYear: "$18.99", retail: "$35" },
  { tld: ".co", perYear: "$19.99", retail: "$30" },
  { tld: ".io", perYear: "$29.99", retail: "$40–50" },
  { tld: ".ai", perYear: "$49.99", retail: "$80–100" },
];
