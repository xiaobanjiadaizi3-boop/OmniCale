/**
 * 式を 2 次元で描く。分数は上下に積み、√ は横線を伸ばす。
 *
 * LaTeX 文字列（KaTeX 等）を経由せず Expr から直接 DOM を作っているのは、
 * Phase 4–5 で各項に「どこから来たか」の色を付け、書き換わった部分を
 * ハイライトする必要があるため。文字列に一度落とすとノードの対応が失われる。
 * そのため全要素に data-origin を出しておく。
 */

import type { Expr } from '@omnicale/core';

const PREC = { add: 1, mul: 2, div: 2, neg: 3, pow: 4, atom: 5 } as const;

function precedenceOf(e: Expr): number {
  switch (e.kind) {
    case 'add':
      return PREC.add;
    case 'mul':
    case 'div':
      return PREC.mul;
    case 'neg':
      return PREC.neg;
    case 'pow':
      return PREC.pow;
    default:
      return PREC.atom;
  }
}

/**
 * 高さの目安（行数）。分数は上下に積むので増える。
 * √ の記号と括弧を縦に伸ばす倍率に使う。
 */
function heightOf(e: Expr): number {
  switch (e.kind) {
    case 'div':
      return heightOf(e.numerator) + heightOf(e.denominator);
    case 'add':
      return Math.max(...e.terms.map(heightOf), 1);
    case 'mul':
      return Math.max(...e.factors.map(heightOf), 1);
    case 'neg':
      return heightOf(e.operand);
    case 'sqrt':
      return heightOf(e.operand);
    case 'pow':
      return heightOf(e.base);
    default:
      return 1;
  }
}

function Stretch({ char, height }: { char: string; height: number }): JSX.Element {
  return (
    <span
      className="stretch"
      style={height > 1 ? { transform: `scaleY(${height})` } : undefined}
    >
      {char}
    </span>
  );
}

/** 掛け算の記号を出すか。a·2 を a2 と書くと読めないので、右が数のときは必ず出す。 */
function needsDot(right: Expr): boolean {
  if (right.kind === 'number') return true;
  if (right.kind === 'pow') return right.base.kind === 'number';
  return false;
}

function Node({ e, min = 0 }: { e: Expr; min?: number }): JSX.Element {
  const body = <Body e={e} />;
  if (precedenceOf(e) >= min) return body;
  const h = heightOf(e);
  return (
    <span className="paren">
      <Stretch char="(" height={h} />
      {body}
      <Stretch char=")" height={h} />
    </span>
  );
}

function Body({ e }: { e: Expr }): JSX.Element {
  switch (e.kind) {
    case 'number':
      return (
        <span className="m-num" data-origin={e.origin}>
          {e.text ?? (e.value.d === 1n ? e.value.n.toString() : `${e.value.n}/${e.value.d}`)}
        </span>
      );

    case 'constant':
      return (
        <span className="m-const" data-origin={e.origin}>
          π
        </span>
      );

    case 'variable':
      return (
        <span className="m-var" data-origin={e.origin}>
          {e.name}
        </span>
      );

    case 'neg':
      return (
        <span className="m-neg" data-origin={e.origin}>
          −<Node e={e.operand} min={PREC.mul} />
        </span>
      );

    case 'add':
      return (
        <span className="m-add" data-origin={e.origin}>
          {e.terms.map((term, i) => {
            if (i === 0) return <Node key={i} e={term} min={PREC.add} />;
            if (term.kind === 'neg') {
              return (
                <span key={i}>
                  <span className="op">−</span>
                  <Node e={term.operand} min={PREC.mul} />
                </span>
              );
            }
            return (
              <span key={i}>
                <span className="op">+</span>
                <Node e={term} min={PREC.add} />
              </span>
            );
          })}
        </span>
      );

    case 'mul':
      return (
        <span className="m-mul" data-origin={e.origin}>
          {e.factors.map((factor, i) => (
            <span key={i}>
              {i > 0 && needsDot(factor) && <span className="op-dot">·</span>}
              {i > 0 && factor.kind === 'neg' ? (
                <span className="paren">
                  <Stretch char="(" height={heightOf(factor)} />
                  <Body e={factor} />
                  <Stretch char=")" height={heightOf(factor)} />
                </span>
              ) : (
                <Node e={factor} min={PREC.mul} />
              )}
            </span>
          ))}
        </span>
      );

    case 'div':
      // 横線は分子・分母の広いほうに合わせたいので、独立した要素として幅 100% で引く
      return (
        <span className="m-frac" data-origin={e.origin}>
          <span className="m-frac-num">
            <Node e={e.numerator} />
          </span>
          <span className="m-frac-bar" />
          <span className="m-frac-den">
            <Node e={e.denominator} />
          </span>
        </span>
      );

    case 'pow':
      return (
        <span className="m-pow" data-origin={e.origin}>
          <Node e={e.base} min={PREC.atom} />
          <sup className="m-sup">
            <Node e={e.exponent} />
          </sup>
        </span>
      );

    case 'sqrt':
      // √ の記号は文字ではなく SVG で描く。文字だと「はね」の先端の高さが字形依存で、
      // 中身の上に引く横線と必ずずれる。SVG なら中身の高さに合わせて伸び、
      // vector-effect で線の太さは一定に保てるので、分数を含む √ でも破綻しない。
      return (
        <span className="m-sqrt" data-origin={e.origin}>
          <svg className="m-radical" viewBox="0 0 20 24" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0.6 12.5 L6 12.5 L11 22.6 L18.6 1 L20 1" />
          </svg>
          <span className="m-radicand">
            <Node e={e.operand} />
          </span>
        </span>
      );
  }
}

export function MathExpr({ expr, size }: { expr: Expr; size?: 'large' | 'small' }): JSX.Element {
  return (
    <span className={size === 'small' ? 'math math-small' : 'math'}>
      <Node e={expr} />
    </span>
  );
}
