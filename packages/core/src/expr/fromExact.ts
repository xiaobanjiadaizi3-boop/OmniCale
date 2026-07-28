/**
 * 厳密値 (Exact) を式 (Expr) に戻す。
 *
 * 結果を入力と同じ部品で描くために要る。UI 側が「入力は Expr、結果は文字列」と
 * 二重に描き分けずに済むので、2 次元表示も色付けも 1 か所で完結する。
 */

import { blcm } from '../util/bigint.js';
import { rat } from '../value/rational.js';
import type { Exact } from '../value/exact.js';
import { add, div, mul, neg, num, pi, sqrt, type Expr } from './ast.js';

function radicalTerm(coeff: bigint, c: bigint): Expr {
  const root = sqrt(num(rat(c)));
  if (coeff === 1n) return root;
  if (coeff === -1n) return neg(root);
  if (coeff < 0n) return neg(mul([num(rat(-coeff)), root]));
  return mul([num(rat(coeff)), root]);
}

export function exactToExpr(v: Exact): Expr {
  switch (v.kind) {
    case 'rational': {
      const r = v.value;
      if (r.d === 1n) return num(r);
      // 負号は分数の外に出す（-1/2 ではなく -(1/2) の形で描く）
      if (r.n < 0n) return neg(div(num(rat(-r.n)), num(rat(r.d))));
      return div(num(rat(r.n)), num(rat(r.d)));
    }

    case 'radical': {
      const den = blcm(v.a.d, v.b.d);
      const a = v.a.n * (den / v.a.d);
      const b = v.b.n * (den / v.b.d);
      const body =
        a === 0n
          ? radicalTerm(b, v.c)
          : add([num(rat(a)), b > 0n ? radicalTerm(b, v.c) : neg(radicalTerm(-b, v.c))]);
      return den === 1n ? body : div(body, num(rat(den)));
    }

    case 'pi': {
      const c = v.coeff;
      const sign = c.n < 0n ? -1n : 1n;
      const magnitude = c.n * sign;
      const base: Expr = magnitude === 1n ? pi() : mul([num(rat(magnitude)), pi()]);
      const signed = sign < 0n ? neg(base) : base;
      return c.d === 1n ? signed : div(signed, num(rat(c.d)));
    }
  }
}
