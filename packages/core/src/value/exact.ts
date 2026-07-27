/**
 * 厳密値 (Exact)。
 *
 * OmniCale の計算コアはこの型のまま計算を進め、小数化は「表示の直前」だけで行う。
 * 途中で一度でも小数にすると誤差が乗るうえ、他の表現 (分数・度数・π倍) に戻せなくなる。
 *
 * Phase 1 で扱う範囲:
 *   - rational : 有理数
 *   - radical  : 二次無理数 a + b√c
 *   - pi       : π の有理数倍
 *
 * 複素数・対数・一般の記号式は Phase 2 以降 (Expr 層) で扱う。
 * この 3 種で閉じない演算は null を返し、呼び出し側に判断させる。
 */

import { bsign, extractSquareFactor, perfectSqrt } from '../util/bigint.js';
import {
  ONE,
  ZERO,
  isZero,
  rat,
  ratAdd,
  ratDiv,
  ratEq,
  ratMul,
  ratNeg,
  ratSign,
  ratSub,
  type Rational,
} from './rational.js';

export type RationalValue = { readonly kind: 'rational'; readonly value: Rational };

/** a + b√c。c は平方因子を持たない 2 以上の整数、b ≠ 0。 */
export type RadicalValue = {
  readonly kind: 'radical';
  readonly a: Rational;
  readonly b: Rational;
  readonly c: bigint;
};

/** coeff × π。coeff ≠ 0。 */
export type PiValue = { readonly kind: 'pi'; readonly coeff: Rational };

export type Exact = RationalValue | RadicalValue | PiValue;

export const exactRational = (value: Rational): RationalValue => ({ kind: 'rational', value });

export const exactInt = (n: bigint | number): RationalValue => exactRational(rat(n));

export const EXACT_ZERO = exactRational(ZERO);
export const EXACT_ONE = exactRational(ONE);
export const EXACT_PI: PiValue = { kind: 'pi', coeff: ONE };

/**
 * a + b√c を正規化して作る。
 * √8 → 2√2 のように平方因子を外に出し、無理数部が消えたら有理数に落とす。
 */
export function makeRadical(a: Rational, b: Rational, c: bigint): Exact {
  if (c < 0n) throw new RangeError('makeRadical: 負の数の平方根は Phase 1 では扱いません');
  if (c === 0n || isZero(b)) return exactRational(a);
  const { k, rest } = extractSquareFactor(c);
  const coeff = ratMul(b, rat(k));
  if (rest === 1n) return exactRational(ratAdd(a, coeff));
  return { kind: 'radical', a, b: coeff, c: rest };
}

export function exactPi(coeff: Rational): Exact {
  return isZero(coeff) ? EXACT_ZERO : { kind: 'pi', coeff };
}

export function isRational(v: Exact): v is RationalValue {
  return v.kind === 'rational';
}

/**
 * 符号。近似計算を使わず厳密に判定する。
 * a + b√c は a と b の符号が違うときだけ a² と b²c の比較が必要になる。
 */
export function exactSign(v: Exact): -1 | 0 | 1 {
  switch (v.kind) {
    case 'rational':
      return ratSign(v.value);
    case 'pi':
      return ratSign(v.coeff);
    case 'radical': {
      const sa = ratSign(v.a);
      const sb = ratSign(v.b);
      if (sa === 0) return sb;
      if (sb === 0) return sa;
      if (sa === sb) return sa;
      const aa = ratMul(v.a, v.a);
      const bb = ratMul(ratMul(v.b, v.b), rat(v.c));
      const cmp = bsign(aa.n * bb.d - bb.n * aa.d);
      if (cmp > 0) return sa;
      if (cmp < 0) return sb;
      return 0;
    }
  }
}

export function isExactZero(v: Exact): boolean {
  return v.kind === 'rational' && isZero(v.value);
}

export function negExact(v: Exact): Exact {
  switch (v.kind) {
    case 'rational':
      return exactRational(ratNeg(v.value));
    case 'pi':
      return exactPi(ratNeg(v.coeff));
    case 'radical':
      return makeRadical(ratNeg(v.a), ratNeg(v.b), v.c);
  }
}

/**
 * 構造比較がそのまま等値比較になる。
 * 正規化済みなので、種類が違えば値も必ず違う
 * (radical は b ≠ 0 かつ c ≥ 2 なので無理数、pi も無理数)。
 */
export function exactEquals(x: Exact, y: Exact): boolean {
  if (x.kind !== y.kind) return false;
  if (x.kind === 'rational' && y.kind === 'rational') return ratEq(x.value, y.value);
  if (x.kind === 'pi' && y.kind === 'pi') return ratEq(x.coeff, y.coeff);
  if (x.kind === 'radical' && y.kind === 'radical') {
    return x.c === y.c && ratEq(x.a, y.a) && ratEq(x.b, y.b);
  }
  return false;
}

/** 3 種で閉じない場合は null。呼び出し側で Phase 2 の記号式に委ねる。 */
export function addExact(x: Exact, y: Exact): Exact | null {
  if (x.kind === 'rational' && y.kind === 'rational') {
    return exactRational(ratAdd(x.value, y.value));
  }
  if (x.kind === 'pi' && y.kind === 'pi') return exactPi(ratAdd(x.coeff, y.coeff));
  if (x.kind === 'pi' && y.kind === 'rational' && isZero(y.value)) return x;
  if (y.kind === 'pi' && x.kind === 'rational' && isZero(x.value)) return y;
  if (x.kind === 'radical' && y.kind === 'rational') {
    return makeRadical(ratAdd(x.a, y.value), x.b, x.c);
  }
  if (y.kind === 'radical' && x.kind === 'rational') {
    return makeRadical(ratAdd(y.a, x.value), y.b, y.c);
  }
  if (x.kind === 'radical' && y.kind === 'radical' && x.c === y.c) {
    return makeRadical(ratAdd(x.a, y.a), ratAdd(x.b, y.b), x.c);
  }
  return null;
}

export function subExact(x: Exact, y: Exact): Exact | null {
  return addExact(x, negExact(y));
}

export function mulExact(x: Exact, y: Exact): Exact | null {
  if (isExactZero(x) || isExactZero(y)) return EXACT_ZERO;
  if (x.kind === 'rational' && y.kind === 'rational') {
    return exactRational(ratMul(x.value, y.value));
  }
  if (x.kind === 'pi' && y.kind === 'rational') return exactPi(ratMul(x.coeff, y.value));
  if (y.kind === 'pi' && x.kind === 'rational') return exactPi(ratMul(y.coeff, x.value));
  if (x.kind === 'radical' && y.kind === 'rational') {
    return makeRadical(ratMul(x.a, y.value), ratMul(x.b, y.value), x.c);
  }
  if (y.kind === 'radical' && x.kind === 'rational') {
    return makeRadical(ratMul(y.a, x.value), ratMul(y.b, x.value), y.c);
  }
  if (x.kind === 'radical' && y.kind === 'radical' && x.c === y.c) {
    // (a + b√c)(a' + b'√c) = (aa' + bb'c) + (ab' + a'b)√c
    const a = ratAdd(ratMul(x.a, y.a), ratMul(ratMul(x.b, y.b), rat(x.c)));
    const b = ratAdd(ratMul(x.a, y.b), ratMul(y.a, x.b));
    return makeRadical(a, b, x.c);
  }
  return null;
}

export function divExact(x: Exact, y: Exact): Exact | null {
  if (isExactZero(y)) throw new RangeError('divExact: 0 で割れません');
  if (y.kind === 'rational') {
    return mulExact(x, exactRational(ratDiv(ONE, y.value)));
  }
  if (y.kind === 'pi' && x.kind === 'pi') {
    return exactRational(ratDiv(x.coeff, y.coeff));
  }
  if (y.kind === 'radical') {
    // 共役を掛けて分母を有理化する: 1/(a + b√c) = (a - b√c) / (a² - b²c)
    const denom = ratSub(ratMul(y.a, y.a), ratMul(ratMul(y.b, y.b), rat(y.c)));
    if (isZero(denom)) return null;
    const inv = makeRadical(ratDiv(y.a, denom), ratDiv(ratNeg(y.b), denom), y.c);
    return mulExact(x, inv);
  }
  return null;
}

/** 有理数の平方根。完全平方なら有理数、そうでなければ √ を含む形になる。 */
export function sqrtRational(r: Rational): Exact | null {
  if (ratSign(r) < 0) return null; // 複素数は Phase 2 以降
  if (isZero(r)) return EXACT_ZERO;
  const root = perfectSqrt(r.n);
  const rootD = perfectSqrt(r.d);
  if (root !== null && rootD !== null) return exactRational(rat(root, rootD));
  // √(n/d) = √(nd) / d
  return makeRadical(ZERO, rat(1n, r.d), r.n * r.d);
}

/**
 * 厳密値の平方根。二重根号の外し (denesting) も行う。
 *
 *   √(a + b√c) = √x + √y   ただし x = (a+d)/2, y = (a-d)/2, d = √(a² - b²c)
 *
 * d が有理数になり、かつ √x + √y がこの型で表せるときだけ成功する。
 * 例: √(3 + 2√2) = 1 + √2
 */
export function sqrtExact(v: Exact): Exact | null {
  if (exactSign(v) < 0) return null;
  if (v.kind === 'rational') return sqrtRational(v.value);
  if (v.kind === 'pi') return null;

  const disc = ratSub(ratMul(v.a, v.a), ratMul(ratMul(v.b, v.b), rat(v.c)));
  if (ratSign(disc) < 0) return null;
  const dNum = perfectSqrt(disc.n);
  const dDen = perfectSqrt(disc.d);
  if (dNum === null || dDen === null) return null;
  const d = rat(dNum, dDen);

  const half = rat(1n, 2n);
  const x = sqrtRational(ratMul(ratAdd(v.a, d), half));
  const y = sqrtRational(ratMul(ratSub(v.a, d), half));
  if (x === null || y === null) return null;

  // √x - √y になる場合もある (b < 0 のとき)
  const sum = ratSign(v.b) < 0 ? subExact(x, y) : addExact(x, y);
  if (sum === null) return null;
  return exactSign(sum) < 0 ? negExact(sum) : sum;
}

/** 整数乗。 */
export function powExact(v: Exact, e: number): Exact | null {
  if (!Number.isInteger(e)) throw new RangeError('powExact: 指数は整数のみ');
  if (e === 0) return EXACT_ONE;
  if (e < 0) {
    const p = powExact(v, -e);
    return p === null ? null : divExact(EXACT_ONE, p);
  }
  let acc: Exact = EXACT_ONE;
  for (let i = 0; i < e; i += 1) {
    const next = mulExact(acc, v);
    if (next === null) return null;
    acc = next;
  }
  return acc;
}
