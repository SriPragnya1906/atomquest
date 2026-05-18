export function calculateProgressScore(
  uomType: string,
  targetValue: number | null,
  targetDate: string | Date | null,
  actualValue: number | null,
  actualDate: string | Date | null
): number {
  if (uomType === 'ZERO') {
    if (actualValue === null || actualValue === undefined) return 0;
    return actualValue === 0 ? 100 : 0;
  }

  if (uomType === 'TIMELINE') {
    if (!actualDate || !targetDate) return 0;
    const act = new Date(actualDate);
    const tar = new Date(targetDate);
    // Remove time portions for accurate date-only comparisons
    act.setHours(0, 0, 0, 0);
    tar.setHours(0, 0, 0, 0);
    return act.getTime() <= tar.getTime() ? 100 : 0;
  }

  // Handle Numeric Min & Numeric Max / Percentage
  if (actualValue === null || actualValue === undefined || targetValue === null || targetValue === undefined) {
    return 0;
  }

  if (uomType === 'NUMERIC_MIN' || uomType === 'PERCENTAGE') {
    if (targetValue === 0) return actualValue >= 0 ? 100 : 0;
    const score = (actualValue / targetValue) * 100;
    return Math.max(0, Math.round(score * 100) / 100);
  }

  if (uomType === 'NUMERIC_MAX') {
    if (actualValue === 0) return 100; // prevent division by zero, 0 actual is perfect
    const score = (targetValue / actualValue) * 100;
    return Math.max(0, Math.round(score * 100) / 100);
  }

  return 0;
}
