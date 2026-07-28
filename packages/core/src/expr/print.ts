/**
 * 式の表示。必要なところにだけ括弧を付ける。
 *
 * 数値リテラルは入力どおりの文字列を優先して使う（1.5 を 3/2 と表示しない）。
 */

import { formatRational } from '../representation/format.js';
import type { Expr } from './ast.js';

const PREC = {
  add: 1,
  mul: 2,
  div: 2,
  neg: 3,
  pow: 4,
  atom: 5,
} as const;

function precedenceOf(e: Expr): number {
  switch (e.kind) {
    case 'add':
      return PREC.add;
    case 'mul':
      return PREC.mul;
    case 'div':
      return PREC.div;
    case 'neg':
      return PREC.neg;
    case 'pow':
      return PREC.pow;
    default:
      return PREC.atom;
  }
}

export function printExpr(e: Expr, minPrecedence = 0): string {
  const body = render(e);
  return precedenceOf(e) < minPrecedence ? `(${body})` : body;
}

function render(e: Expr): string {
  switch (e.kind) {
    case 'number':
      return e.text ?? formatRational(e.value);

    case 'constant':
      return 'π';

    case 'variable':
      return e.name;

    case 'neg':
      // -a/b は (-a)/b と同じ値なので、分数に括弧は要らない
      return `-${printExpr(e.operand, PREC.mul)}`;

    case 'add':
      return e.terms
        .map((term, i) => {
          if (i === 0) return printExpr(term, PREC.add);
          // a + (-b) は a - b と書く
          if (term.kind === 'neg') return ` - ${printExpr(term.operand, PREC.mul)}`;
          return ` + ${printExpr(term, PREC.add)}`;
        })
        .join('');

    case 'mul':
      return e.factors
        .map((factor, i) => {
          // 2·(-3) のように、途中の負号は括弧で包まないと読めない
          const needsParens = i > 0 && factor.kind === 'neg';
          const text = printExpr(factor, PREC.mul);
          return needsParens ? `(${text})` : text;
        })
        .join('·');

    case 'div':
      return `${printExpr(e.numerator, PREC.div)}/${printExpr(e.denominator, PREC.neg)}`;

    case 'pow':
      return `${printExpr(e.base, PREC.atom)}^${printExpr(e.exponent, PREC.neg)}`;

    case 'sqrt':
      return `√${printExpr(e.operand, PREC.atom)}`;
  }
}
