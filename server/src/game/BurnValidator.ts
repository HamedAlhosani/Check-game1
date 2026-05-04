import { Card } from '@check-game/shared';

export function canBurnCard(
  heldCard: Card,
  discardedCard: Card,
  lastDiscardFromKing: boolean
): { valid: boolean; reason?: string } {
  if (lastDiscardFromKing) {
    return { valid: false, reason: 'Cannot burn from a K-penalty discard' };
  }
  if (heldCard.rank !== discardedCard.rank) {
    return { valid: false, reason: `Card rank ${heldCard.rank} does not match discard rank ${discardedCard.rank}` };
  }
  return { valid: true };
}
