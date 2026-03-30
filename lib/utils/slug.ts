/**
 * Generate a URL-friendly slug from a given string
 * @param text - The text to convert to a slug
 * @returns URL-friendly slug
 */
export function generateSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Replace special characters and spaces with hyphens
      .replace(/[^a-z0-9\s-]/g, '')
      // Replace multiple spaces/hyphens with single hyphen
      .replace(/[\s-]+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Limit length to 50 characters
      .substring(0, 50)
      // Remove trailing hyphen if truncated
      .replace(/-+$/, '')
  );
}

/**
 * Generate a unique slug by appending numbers if needed
 * @param baseSlug - The base slug to make unique
 * @param checkSlugExists - Function that returns true if slug already exists
 * @returns A unique slug
 */
export async function generateUniqueSlug(
  baseSlug: string,
  checkSlugExists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  // Check if base slug exists
  while (await checkSlugExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Validate if a string is a valid UUID format
 * @param str - The string to validate
 * @returns true if string is UUID format, false otherwise
 */
export function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
