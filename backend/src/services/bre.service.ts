export interface BreInput {
  dateOfBirth: Date | string;
  monthlySalary: number;
  pan: string;
  employmentMode: string;
}

export interface BreResult {
  passed: boolean;
  errors: string[];
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

function calculateAge(dob: Date | string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function runBRE(input: BreInput): BreResult {
  const errors: string[] = [];

  // Rule 1: Age must be between 23 and 50
  const age = calculateAge(input.dateOfBirth);
  if (age < 23 || age > 50) {
    errors.push(`Age must be between 23 and 50 years. Your age: ${age}`);
  }

  // Rule 2: Monthly salary >= 25,000
  if (input.monthlySalary < 25000) {
    errors.push(`Monthly salary must be at least ₹25,000. Provided: ₹${input.monthlySalary}`);
  }

  // Rule 3: Valid PAN format
  if (!PAN_REGEX.test(input.pan.trim().toUpperCase())) {
    errors.push('PAN must be in the format AAAAA9999A (5 letters, 4 digits, 1 letter)');
  }

  // Rule 4: Employment mode must not be unemployed
  if (input.employmentMode === 'unemployed') {
    errors.push('Unemployed applicants are not eligible for a loan');
  }

  return { passed: errors.length === 0, errors };
}
