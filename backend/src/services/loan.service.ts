export function calculateSI(principal: number, tenureDays: number, ratePercent = 12): number {
  return (principal * ratePercent * tenureDays) / (365 * 100);
}

export function calculateTotalRepayment(principal: number, tenureDays: number): number {
  return principal + calculateSI(principal, tenureDays);
}
