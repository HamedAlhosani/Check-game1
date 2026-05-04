import { Card } from '@check-game/shared';
import { getCardValue } from './Card';

export interface ScoreResult {
  roundScores: { [uid: string]: number };
  lowestUid: string | null;
  checkPenalty: boolean;
}

export function calculateRoundScores(
  playerCards: { uid: string; cards: (Card | null)[] }[],
  checkCallerId: string
): ScoreResult {
  const handSums: { [uid: string]: number } = {};

  for (const p of playerCards) {
    handSums[p.uid] = p.cards.reduce((sum, c) => {
      if (!c) return sum;
      return sum + getCardValue(c);
    }, 0);
  }

  const minSum = Math.min(...Object.values(handSums));
  const callerSum = handSums[checkCallerId];
  const checkPenalty = callerSum > minSum;

  const roundScores: { [uid: string]: number } = {};

  let lowestUid: string | null = null;
  let lowestScore = Infinity;

  for (const p of playerCards) {
    let score: number;

    if (p.uid === checkCallerId) {
      // Caller gets 0 if they're lowest, doubled if someone else is lower
      score = checkPenalty ? callerSum * 2 : 0;
    } else if (checkPenalty && handSums[p.uid] === minSum) {
      // When caller loses, the single lowest player pays 0
      score = 0;
    } else {
      // Everyone else always pays their hand sum
      score = handSums[p.uid];
    }

    roundScores[p.uid] = score;
    if (score < lowestScore) {
      lowestScore = score;
      lowestUid = p.uid;
    }
  }

  return { roundScores, lowestUid, checkPenalty };
}
