export const PRICING = {
  perVideoPerLang: 1400, // TL
  packageSize: 5,
  packageDiscount: 0.10, // %10
  get packageTotal() {
    return Math.round(this.perVideoPerLang * this.packageSize * (1 - this.packageDiscount));
  },
  get packagePerVideo() {
    return Math.round(this.packageTotal / this.packageSize);
  },
};

export function calculateCost(videoCount: number, langCount: number): {
  totalJobs: number;
  unitPrice: number;
  totalPrice: number;
  discount: boolean;
} {
  const totalJobs = videoCount * langCount;
  const discount = totalJobs >= PRICING.packageSize;
  const unitPrice = discount ? PRICING.packagePerVideo : PRICING.perVideoPerLang;
  const totalPrice = totalJobs * unitPrice;

  return { totalJobs, unitPrice, totalPrice, discount };
}

export function formatTL(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
