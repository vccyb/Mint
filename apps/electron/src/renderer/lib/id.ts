/**
 * Generate a unique identifier string.
 *
 * Combines a base-36 timestamp with random characters to produce
 * a short, URL-safe, collision-resistant ID.
 *
 * > **Note:** This is NOT cryptographically secure.
 * > For security-sensitive contexts (e.g. session tokens), use `crypto.randomUUID()` instead.
 *
 * @example
 * generateId() // → 'm3x7k9abc2def'
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
