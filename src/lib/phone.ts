/**
 * Normalize phone number to digits only.
 * Strips spaces, dashes, parens, dots, plus sign.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

/**
 * Format phone for display: add spaces every 3-4 digits.
 * Input must be digits-only (from normalizePhone).
 */
export function formatPhone(digits: string): string {
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 10)
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  return `+${digits.slice(0, digits.length - 10)} ${digits.slice(-10, -7)} ${digits.slice(-7, -4)} ${digits.slice(-4)}`
}

/**
 * Validate phone has minimum digits.
 */
export function isValidPhone(digits: string): boolean {
  return digits.length >= 7 && digits.length <= 15
}
