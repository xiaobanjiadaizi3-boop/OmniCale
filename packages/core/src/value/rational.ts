/**
 * 有理数。bigint の分数として厳密に保持する。
 *
 * 不変条件:
 *   - d > 0
 *   - gcd(|n|, d) === 1
 * これにより「同じ値なら必ず同じ表現」になり、構造比較がそのまま等値比較になる。
 */

import { bgcd, blcm, bsign, divRound, pow10 } from '../util/bigint.js';

export type Rational = {
  readonly n: bigint;
  readonly d: bigint;
};

export function rat(n: bigint | number, d: bigint | number = 1n): Rational {
  let num = BigInt(n);
  let den = BigInt(d);
  if (den === 0n) throw new RangeError('rat: 分母が 0 です');
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const g = bgcd(num, den);
  if (g > 1n) {
    num /= g;
    den /= g;
  }
  return { n: num, d: den };
}

export const ZERO: Rational = { n: 0n, d: 1n };
export const ONE: Rational = { n: 1n, d: 1n };

export function isZero(r: Rational): boolean {
  return r.n === 0n;
}

export function isInteger(r: Rational): boolean {
  return r.d === 1n;
}

export function ratSign(r: Rational): -1 | 0 | 1 {
  return bsign(r.n);
}

export function ratAdd(x: Rational, y: Rational): Rational {
  return rat(x.n * y.d + y.n * x.d, x.d * y.d);
}

export function ratSub(x: Rational, y: Rational): Rational {
  return rat(x.n * y.d - y.n * x.d, x.d * y.d);
}

export function ratMul(x: Rational, y: Rational): Rational {
  return rat(x.n * y.n, x.d * y.d);
}

export function ratDiv(x: Rational, y: Rational): Rational {
  if (isZero(y)) throw new RangeError('ratDiv: 0 で割れません');
  return rat(x.n * y.d, x.d * y.n);
}

export function ratNeg(x: Rational): Rational {
  return { n: -x.n, d: x.d };
}

export function ratAbs(x: Rational): Rational {
  return x.n < 0n ? ratNeg(x) : x;
}

export function ratInv(x: Rational): Rational {
  if (isZero(x)) throw new RangeError('ratInv: 0 の逆数は取れません');
  return rat(x.d, x.n);
}

/** 整数乗。負の指数も扱う。 */
export function ratPow(x: Rational, e: number): Rational {
  if (!Number.isInteger(e)) throw new RangeError('ratPow: 指数は整数のみ');
  if (e < 0) return ratInv(ratPow(x, -e));
  return rat(x.n ** BigInt(e), x.d ** BigInt(e));
}

export function ratCmp(x: Rational, y: Rational): -1 | 0 | 1 {
  return bsign(x.n * y.d - y.n * x.d);
}

export function ratEq(x: Rational, y: Rational): boolean {
  return x.n === y.n && x.d === y.d;
}

/** 0 方向ではなく負の無限大方向に丸める。 */
export function ratFloor(x: Rational): bigint {
  const q = x.n / x.d;
  return x.n < 0n && q * x.d !== x.n ? q - 1n : q;
}

/** value × 10^scale を四捨五入した整数。 */
export function ratScaled(r: Rational, scale: number): bigint {
  return divRound(r.n * pow10(scale), r.d);
}

/**
 * 有限小数になるなら必要な小数点以下の桁数を、循環小数なら null を返す。
 * 既約分数の分母が 2 と 5 のみからなるとき有限小数になる。
 */
export function terminatingDecimalPlaces(r: Rational): number | null {
  let d = r.d;
  let twos = 0;
  let fives = 0;
  while (d % 2n === 0n) {
    d /= 2n;
    twos += 1;
  }
  while (d % 5n === 0n) {
    d /= 5n;
    fives += 1;
  }
  return d === 1n ? Math.max(twos, fives) : null;
}

/** 帯分数への分解。1 未満の値では whole が 0n になる。 */
export function toMixed(r: Rational): { sign: -1 | 0 | 1; whole: bigint; n: bigint; d: bigint } {
  const sign = ratSign(r);
  const a = ratAbs(r);
  return { sign, whole: a.n / a.d, n: a.n % a.d, d: a.d };
}

export function ratToString(r: Rational): string {
  return r.d === 1n ? r.n.toString() : `${r.n}/${r.d}`;
}

export const ratLcmDen = (x: Rational, y: Rational): bigint => blcm(x.d, y.d);

export function ratToNumber(r: Rational): number {
  // 表示・グラフ描画など、誤差が許される用途専用。計算に使ってはいけない。
  return Number(r.n) / Number(r.d);
}
