// lib/utils/domain-validation.ts
// Utility functions for domain-based access control

/**
 * Extract domain from email address
 * @param email - Email address (e.g., "user@jkkn.ac.in")
 * @returns Domain (e.g., "jkkn.ac.in") or null if invalid
 *
 * @example
 * extractDomain("student@jkkn.ac.in") // Returns: "jkkn.ac.in"
 * extractDomain("user@gmail.com") // Returns: "gmail.com"
 * extractDomain("invalid-email") // Returns: null
 */
export function extractDomain(email: string): string | null {
  if (!email || typeof email !== 'string') return null;

  const emailRegex = /^[^\s@]+@([^\s@]+)$/;
  const match = email.trim().match(emailRegex);

  return match ? match[1].toLowerCase() : null;
}

/**
 * Check if email domain is in allowed list
 * @param email - User's email address
 * @param allowedDomains - Array of allowed domains
 * @returns True if domain is allowed or if no restrictions
 *
 * @example
 * isEmailDomainAllowed("student@jkkn.ac.in", ["jkkn.ac.in"]) // Returns: true
 * isEmailDomainAllowed("user@gmail.com", ["jkkn.ac.in"]) // Returns: false
 * isEmailDomainAllowed("user@gmail.com", []) // Returns: true (no restrictions)
 */
export function isEmailDomainAllowed(
  email: string,
  allowedDomains: string[]
): boolean {
  // If no domains specified, allow all
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }

  const userDomain = extractDomain(email);
  if (!userDomain) {
    return false;
  }

  // Case-insensitive comparison
  const normalizedDomains = allowedDomains.map((d) => d.toLowerCase().trim());
  return normalizedDomains.includes(userDomain);
}

/**
 * Validate domain format
 * @param domain - Domain to validate (e.g., "jkkn.ac.in")
 * @returns True if valid domain format
 *
 * @example
 * isValidDomain("jkkn.ac.in") // Returns: true
 * isValidDomain("sub.domain.jkkn.ac.in") // Returns: true
 * isValidDomain("invalid domain") // Returns: false
 * isValidDomain("@jkkn.ac.in") // Returns: false (should not include @)
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Remove @ prefix if present (common user mistake)
  const cleanDomain = domain.trim().replace(/^@/, '');

  // Basic domain validation
  // - Must contain at least one dot
  // - Can contain alphanumeric characters, hyphens, and dots
  // - Must end with valid TLD (at least 2 characters)
  // - Cannot start or end with hyphen or dot
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;

  return domainRegex.test(cleanDomain);
}

/**
 * Format domains for display with @ prefix
 * @param domains - Array of domains
 * @returns Formatted string (e.g., "@jkkn.ac.in, @jkkn.org")
 *
 * @example
 * formatDomainsForDisplay(["jkkn.ac.in", "jkkn.org"])
 * // Returns: "@jkkn.ac.in, @jkkn.org"
 */
export function formatDomainsForDisplay(domains: string[]): string {
  if (!domains || domains.length === 0) {
    return '';
  }

  return domains.map((d) => `@${d}`).join(', ');
}

/**
 * Normalize domain (remove @ prefix, convert to lowercase, trim)
 * @param domain - Domain to normalize
 * @returns Normalized domain
 *
 * @example
 * normalizeDomain("@JKKN.AC.IN  ") // Returns: "jkkn.ac.in"
 * normalizeDomain("  Gmail.com") // Returns: "gmail.com"
 */
export function normalizeDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') {
    return '';
  }

  return domain.trim().toLowerCase().replace(/^@/, '');
}

/**
 * Validate array of domains
 * @param domains - Array of domains to validate
 * @returns Object with valid domains and invalid domains
 *
 * @example
 * validateDomains(["jkkn.ac.in", "invalid domain", "gmail.com"])
 * // Returns: { valid: ["jkkn.ac.in", "gmail.com"], invalid: ["invalid domain"] }
 */
export function validateDomains(domains: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  domains.forEach((domain) => {
    const normalized = normalizeDomain(domain);
    if (isValidDomain(normalized)) {
      valid.push(normalized);
    } else {
      invalid.push(domain);
    }
  });

  return { valid, invalid };
}
