export const CURRENCY_CODE = "BDT";
export const CURRENCY_SYMBOL = "৳";

/** Format all monetary values consistently in Bangladeshi Taka. */
export function formatBDT(amount: number): string {
  return `৳${new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}
