/**
 * Normalizes an ID to a fixed length based on its type:
 * - Country: 3 digits (e.g., "001")
 * - Prefecture: 7 digits
 * - City: 12 digits
 */
export const padId = (id: string | number | undefined | null): string => {
  if (id === undefined || id === null) return "";
  const s = String(id).trim();
  if (!/^\d+$/.test(s)) return s;
  
  const len = s.length;
  if (len <= 3) return s.padStart(3, "0");
  if (len <= 7) return s.padStart(7, "0");
  return s.padStart(12, "0");
};

export const getParentId = (id: string): string | null => {
  const normalized = padId(id);
  if (normalized.length <= 3) return null;
  if (normalized.length <= 7) return normalized.substring(0, 3);
  return normalized.substring(0, 7);
};

export const getLevel = (id: string): number => {
  const normalized = padId(id);
  if (normalized.length <= 3) return 0;
  if (normalized.length <= 7) return 1;
  return 2;
};
