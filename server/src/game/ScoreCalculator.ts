import { Card } from '@check-game/shared';
import { getCardValue } from './Card';

export type CheckOutcome = 'win' | 'tied' | 'beaten' | null;

export interface ScoreResult {
  roundScores: { [uid: string]: number };
  rawHandSums: { [uid: string]: number };
  lowestUid: string | null;
  checkPenalty: boolean;
  /** Categorical outcome of the CHECK call — null if no CHECK was called.
   *  'win'    = caller had the alone-lowest hand → 0 score this round
   *  'tied'   = caller tied for lowest with someone else → pays own hand
   *  'beaten' = someone strictly beat the caller → caller pays 2x hand */
  checkOutcome: CheckOutcome;
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

  const callerSum = handSums[checkCallerId];
  // Compare caller against the rest only — ties don't count as a loss.
  const otherSums = Object.entries(handSums)
    .filter(([uid]) => uid !== checkCallerId)
    .map(([, s]) => s);
  const minOther = otherSums.length ? Math.min(...otherSums) : Infinity;
  // Penalty only if SOMEONE ELSE is strictly lower than the caller.
  // Tie at lowest → no penalty, both pay their hand sum.
  const checkPenalty = callerSum > minOther;

  const roundScores: { [uid: string]: number } = {};

  let lowestUid: string | null = null;
  let lowestScore = Infinity;

  for (const p of playerCards) {
    let score: number;

    if (p.uid === checkCallerId) {
      if (checkPenalty) {
        // Someone is strictly lower → caller pays double their hand sum.
        score = callerSum * 2;
      } else if (callerSum < minOther) {
        // Caller is alone-lowest → free round.
        score = 0;
      } else {
        // Tie at lowest → caller pays their hand sum like everyone else.
        score = callerSum;
      }
    } else if (checkPenalty && handSums[p.uid] === Math.min(...Object.values(handSums))) {
      // When the caller is penalised, the single lowest player pays 0.
      score = 0;
    } else {
      // Everyone else always pays their hand sum.
      score = handSums[p.uid];
    }

    roundScores[p.uid] = score;
    if (score < lowestScore) {
      lowestScore = score;
      lowestUid = p.uid;
    }
  }

  let checkOutcome: CheckOutcome = null;
  if (checkCallerId && callerSum !== undefined) {
    if (checkPenalty)              checkOutcome = 'beaten';
    else if (callerSum < minOther) checkOutcome = 'win';
    else                           checkOutcome = 'tied';
  }
  return { roundScores, rawHandSums: handSums, lowestUid, checkPenalty, checkOutcome };
}
