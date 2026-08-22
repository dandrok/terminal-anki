import { randomUUID } from 'node:crypto';

/**
 * Generate a collision-free card id.
 *
 * Ids used to be derived from `cards.length + 1`, which reused a live id as
 * soon as any non-last card was deleted and made the delete menu remove the
 * wrong card. Identity must not depend on collection size.
 */
export function createId(): string {
  return randomUUID();
}
