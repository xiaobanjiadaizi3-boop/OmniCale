/**
 * 任意精度の π。
 *
 * Machin の公式を bigint で計算する:
 *   π = 16·arctan(1/5) − 4·arctan(1/239)
 *   arctan(1/x) = Σ (−1)^k / ((2k+1)·x^(2k+1))
 *
 * Chudnovsky ほど速くはないが、電卓が必要とする数百桁までなら十分実用的で、
 * 実装が短く検証しやすい。
 */

import { pow10 } from '../util/bigint.js';

/** arctan(1/x) × scale を切り捨てで求める。 */
function arctanInv(x: bigint, scale: bigint): bigint {
  const x2 = x * x;
  let power = scale / x; // scale / x^(2k+1)
  let sum = power;
  let k = 1n;
  while (power !== 0n) {
    power /= x2;
    if (power === 0n) break;
    const term = power / (2n * k + 1n);
    sum += k % 2n === 1n ? -term : term;
    k += 1n;
  }
  return sum;
}

const GUARD = 15;

let cache: { digits: number; value: bigint } = { digits: 0, value: 3n };

/** π × 10^digits を返す。末尾 1 桁の丸め誤差は許容する (呼び出し側でガード桁を足す)。 */
export function piScaled(digits: number): bigint {
  if (digits < 0) throw new RangeError('piScaled: 桁数が負です');
  if (cache.digits >= digits) {
    return cache.value / pow10(cache.digits - digits);
  }
  const working = digits + GUARD;
  const scale = pow10(working);
  const value = 16n * arctanInv(5n, scale) - 4n * arctanInv(239n, scale);
  cache = { digits: working, value };
  return value / pow10(GUARD);
}
