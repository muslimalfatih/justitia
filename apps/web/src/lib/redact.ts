/**
 * Utility function to redact sensitive information from text
 * Redacts email addresses and phone numbers
 */

// Email pattern: matches most email formats
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

// Phone patterns: matches various formats
// - International: +1234567890, +1 234 567 890
// - US format: (123) 456-7890, 123-456-7890
// - Simple: 1234567890
const PHONE_PATTERNS = [
  /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, // International/US
  /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/g, // (123) 456-7890
  /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g, // 123-456-7890
  /\d{10,}/g, // 10+ digits in a row
]

/**
 * Redact sensitive information from text
 * @param text - The text to redact
 * @returns Text with emails and phone numbers replaced with [REDACTED]
 */
export function redactSensitiveInfo(text: string): string {
  if (!text) return text

  let redacted = text

  // Redact emails
  redacted = redacted.replace(EMAIL_PATTERN, '[email redacted]')

  // Redact phone numbers
  for (const pattern of PHONE_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      // Only redact if it looks like a phone number (7+ digits)
      const digits = match.replace(/\D/g, '')
      if (digits.length >= 7) {
        return '[phone redacted]'
      }
      return match
    })
  }

  return redacted
}
