/**
 * Normalizes an ID to a fixed length based on its type:
 * - Country: 3 digits (e.g., "001")
 * - Prefecture: 7 digits
 * - City: 12 digits
 */
export const padId = (id: string | number | undefined | null): string => {
  if (id === undefined || id === null) return "";
  const s = typeof id === "string" ? id : String(id);
  
  const len = s.length;
  // Already normalized or not a numeric ID
  if (len === 3 || len === 7 || len === 12) return s;
  
  const trimmed = s.trim();
  if (trimmed.length === 0) return "";
  if (!/^\d+$/.test(trimmed)) return trimmed;
  
  const tLen = trimmed.length;
  if (tLen <= 3) return trimmed.padStart(3, "0");
  if (tLen <= 7) return trimmed.padStart(7, "0");
  return trimmed.padStart(12, "0");
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
