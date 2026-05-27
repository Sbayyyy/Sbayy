/**
 * Listing URL slug utilities.
 *
 * URL format: /listing/{seo-slug}-{full-id}
 *   Example: /listing/used-iphone-13-pro-max-damascus-a1b2c3d4-1234-5678-9abc-def012345678
 *
 * Why include the full UUID at the tail:
 *   - The backend only knows how to look up by UUID. No backend change required.
 *   - Slug collisions don't break anything — uniqueness is guaranteed by the ID.
 *   - Old bare-UUID URLs (`/listing/{uuid}`) still resolve via the same regex.
 *   - On every render we emit a canonical link to the slug+id form, so search
 *     engines see one canonical URL even if visitors arrive via the legacy path.
 */

/**
 * Convert mixed Arabic / Latin text into a URL-safe slug.
 * Keeps Arabic letters (؀-ۿ) so listings posted in Arabic still
 * produce a meaningful slug instead of an empty string.
 */
function slugifySegment(input: string): string {
  if (!input) return '';
  return input
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯؐ-ًؚ-ٟۖ-ۜ۟-۪ۤۧۨ-ۭ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const FULL_UUID_RE = new RegExp(`^${UUID_RE.source}$`, 'i');
const TRAILING_UUID_RE = new RegExp(`(${UUID_RE.source})$`, 'i');

interface ListingSlugInput {
  id: string;
  title?: string | null;
  region?: string | null;
}

/** Build the slug+id segment for a listing's URL. */
export function buildListingSlug({ id, title, region }: ListingSlugInput): string {
  if (!id) return '';
  const parts = [title, region].filter(Boolean).join(' ');
  const slug = slugifySegment(parts || '');
  return slug ? `${slug}-${id}` : id;
}

/** Build the canonical listing path (relative URL). */
export function listingPath(listing: { id: string; title?: string | null; region?: string | null }): string {
  return `/listing/${buildListingSlug(listing)}`;
}

/**
 * Pull a UUID out of a listing route segment.
 *
 * Accepts both:
 *   - Legacy bare UUID:  "a1b2c3d4-1234-5678-9abc-def012345678"
 *   - SEO slug+id:       "used-iphone-damascus-a1b2c3d4-1234-5678-9abc-def012345678"
 *
 * Returns the canonical UUID or null when the segment doesn't carry one.
 */
export function parseListingId(raw: string): string | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  if (FULL_UUID_RE.test(decoded)) return decoded.toLowerCase();
  const match = decoded.match(TRAILING_UUID_RE);
  return match ? match[1].toLowerCase() : null;
}

/** True when the slug portion (everything before the trailing UUID) is present and non-empty. */
export function hasSeoSlug(raw: string): boolean {
  if (!raw) return false;
  const decoded = decodeURIComponent(raw);
  if (FULL_UUID_RE.test(decoded)) return false;
  return TRAILING_UUID_RE.test(decoded);
}
