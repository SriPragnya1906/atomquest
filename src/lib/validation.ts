export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateGoals(goals: Array<{ weightage: number }>): ValidationResult {
  const errors: string[] = [];

  if (goals.length === 0) {
    errors.push('At least one goal is required.');
  }

  if (goals.length > 8) {
    errors.push('A maximum of 8 goals is permitted per sheet.');
  }

  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
  
  // Enforce exact 100% target balance
  if (Math.abs(totalWeightage - 100) > 0.001) {
    errors.push(`Total weightage must equal exactly 100%. (Current: ${totalWeightage}%)`);
  }

  // Enforce 10% minimum individual weightage threshold
  const belowMin = goals.some((g) => g.weightage < 10);
  if (belowMin) {
    errors.push('Each individual goal must have a weightage of at least 10%.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
