/**
 * bigint の基本演算。
 *
 * OmniCale の値はすべて bigint 上の厳密な演算で組み立てる。
 * 浮動小数点数 (number) は「表示の直前」以外では使わない。
 */

export function babs(a: bigint): bigint {
  return a < 0n ? -a : a;
}

export function bsign(a: bigint): -1 | 0 | 1 {
  return a === 0n ? 0 : a < 0n ? -1 : 1;
}

export function bgcd(a: bigint, b: bigint): bigint {
  let x = babs(a);
  let y = babs(b);
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

export function blcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  return babs(a / bgcd(a, b) * b);
}

export function pow10(n: number): bigint {
  if (n < 0) throw new RangeError(`pow10: 指数が負です (${n})`);
  return 10n ** BigInt(n);
}

/**
 * 四捨五入つき除算。ちょうど半分のときは 0 から遠ざかる向きに丸める。
 * 電卓の既定の丸め (round-half-away-from-zero) に合わせている。
 */
export function divRound(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new RangeError('divRound: 0 で割れません');
  let num = n;
  let den = d;
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const q = num / den;
  const r = num % den;
  if (babs(r) * 2n >= den) return q + (num < 0n ? -1n : 1n);
  return q;
}

/** floor(sqrt(n))。ニュートン法。 */
export function isqrt(n: bigint): bigint {
  if (n < 0n) throw new RangeError('isqrt: 負の数の平方根は取れません');
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) {
    const y = (x + n / x) >> 1n;
    if (y >= x) return x;
    x = y;
  }
}

/** 完全平方数なら平方根を、そうでなければ null を返す。 */
export function perfectSqrt(n: bigint): bigint | null {
  if (n < 0n) return null;
  const r = isqrt(n);
  return r * r === n ? r : null;
}

/**
 * c = k^2 * rest となる k (最大) と rest (平方因子を持たない) に分解する。
 * √8 → 2√2 のような簡約に使う。
 *
 * 試し割りなので c が巨大な半素数だと遅い。電卓の入力規模では問題にならないが、
 * 上限を設けたい場合はここに手を入れる。
 */
export function extractSquareFactor(c: bigint): { k: bigint; rest: bigint } {
  if (c <= 0n) throw new RangeError('extractSquareFactor: 正の整数のみ');
  let k = 1n;
  let rest = c;
  for (let p = 2n; p * p <= rest; p += 1n) {
    const sq = p * p;
    while (rest % sq === 0n) {
      rest /= sq;
      k *= p;
    }
  }
  return { k, rest };
}
