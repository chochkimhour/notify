import { createHash, timingSafeEqual } from 'node:crypto';

// Hashing first gives equal-length buffers, so the comparison time does not depend on the input.
export function secretMatches(provided, expected) {
  if (!expected || typeof provided !== 'string') return false;
  const digest = (value) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}
