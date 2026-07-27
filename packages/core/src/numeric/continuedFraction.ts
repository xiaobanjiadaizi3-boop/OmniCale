/**
 * 連分数展開による近似分数。
 *
 * π ≈ 355/113、√2 ≈ 99/70 のような「よく知られた近似」はすべて連分数の主近似分数。
 * 40 桁の近似から展開するので、分母が 10^19 程度を超えると信用できなくなる。
 * 既定の上限はそれより十分小さく取ってある。
 */

import { pow10 } from '../util/bigint.js';
import { rat, type Rational } from '../value/rational.js';
import type { Exact } from '../value/exact.js';
import { approxScaled } from './decimal.js';

const PRECISION = 40;

export function convergents(
  v: Exact,
  maxTerms = 20,
  maxDenominator = 10n ** 12n,
): Rational[] {
  let num = approxScaled(v, PRECISION);
  let den = pow10(PRECISION);

  let pPrev = 1n;
  let pPrev2 = 0n;
  let qPrev = 0n;
  let qPrev2 = 1n;

  const out: Rational[] = [];
  for (let i = 0; i < maxTerms && den !== 0n; i += 1) {
    let a = num / den;
    if (num % den !== 0n && num < 0n) a -= 1n; // 負の無限大方向に丸める
    const p = a * pPrev + pPrev2;
    const q = a * qPrev + qPrev2;
    if (q > maxDenominator) break;
    out.push(rat(p, q));
    pPrev2 = pPrev;
    pPrev = p;
    qPrev2 = qPrev;
    qPrev = q;
    const r = num - a * den;
    num = den;
    den = r;
  }
  return out;
}

/** 分母が maxDenominator 以下で最も精度の高い近似分数。 */
export function bestApproximation(v: Exact, maxDenominator: bigint): Rational | null {
  const list = convergents(v, 20, maxDenominator);
  return list.length > 0 ? (list[list.length - 1] as Rational) : null;
}
