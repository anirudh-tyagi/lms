export function calculateSI(principal: number, tenureDays: number, rate = 12): number {
  return (principal * rate * tenureDays) / (365 * 100);
}

export function calculateTotalRepayment(principal: number, tenureDays: number): number {
  return principal + calculateSI(principal, tenureDays);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}
