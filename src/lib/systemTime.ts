let mockDate: Date | null = null;

export function getSystemDate(): Date {
  return mockDate || new Date();
}

export function setSystemDate(dateStr: string | null): Date {
  if (!dateStr) {
    mockDate = null;
  } else {
    mockDate = new Date(dateStr);
  }
  return getSystemDate();
}
