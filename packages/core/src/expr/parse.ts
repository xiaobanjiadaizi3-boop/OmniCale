/**
 * 構文解析（再帰下降）。
 *
 * 優先順位（低い順）:
 *   1. + -
 *   2. * /  および暗黙の掛け算（2x, 2(3+4), 2√3, (1+2)(3+4)）
 *   3. 単項の - +
 *   4. ^（右結合。2^3^2 = 2^(3^2)）
 *   5. 原子: 数, π, 変数, (式), √原子, sqrt(式)
 *
 * √ は「次の原子ひとつ」に掛かる。したがって
 *   √8      → √8
 *   √2x     → (√2)·x
 *   √2^2    → (√2)^2
 *   √(3+2√2) → 括弧の中全体
 * と、括弧を書かない限り後ろに伸びない。予測しやすさを優先した。
 */

import {
  add,
  div,
  mul,
  neg,
  num,
  pi,
  pow,
  sqrt,
  variable,
  type Expr,
} from './ast.js';
import { ParseError, tokenize, type Token } from './tokenize.js';

const FUNCTIONS = new Set(['sqrt']);

class Parser {
  private readonly tokens: Token[];
  private index = 0;
  private counter = 0;

  constructor(input: string) {
    this.tokens = tokenize(input);
  }

  /** ノードごとに一意の由来 ID。トークン順に振るのでパース結果は決定的になる。 */
  private id(): string {
    const value = `t${this.counter}`;
    this.counter += 1;
    return value;
  }

  private peek(): Token {
    return this.tokens[this.index] as Token;
  }

  private next(): Token {
    const token = this.peek();
    if (token.type !== 'eof') this.index += 1;
    return token;
  }

  private isOp(text: string): boolean {
    const token = this.peek();
    return token.type === 'op' && token.text === text;
  }

  /** 暗黙の掛け算を認めてよい位置かどうか。 */
  private startsPrimary(): boolean {
    const token = this.peek();
    return (
      token.type === 'number' ||
      token.type === 'ident' ||
      token.type === 'lparen' ||
      (token.type === 'op' && token.text === '√')
    );
  }

  parse(): Expr {
    if (this.peek().type === 'eof') throw new ParseError('式が空です', 0);
    const expr = this.expression();
    const rest = this.peek();
    if (rest.type !== 'eof') {
      throw new ParseError('式の解釈が途中で止まりました', rest.pos);
    }
    return expr;
  }

  private expression(): Expr {
    const terms: Expr[] = [this.term()];
    for (;;) {
      if (this.isOp('+')) {
        this.next();
        terms.push(this.term());
      } else if (this.isOp('-')) {
        this.next();
        terms.push(neg(this.term(), this.id()));
      } else {
        break;
      }
    }
    return terms.length === 1 ? (terms[0] as Expr) : add(terms, this.id());
  }

  private term(): Expr {
    let current = this.unary();
    for (;;) {
      if (this.isOp('*')) {
        this.next();
        current = this.combineMul(current, this.unary());
      } else if (this.isOp('/')) {
        this.next();
        current = div(current, this.unary(), this.id());
      } else if (this.startsPrimary()) {
        current = this.combineMul(current, this.unary());
      } else {
        break;
      }
    }
    return current;
  }

  /** 掛け算は n 項に平らにする。書き換えのときに結合の入れ替えを減らすため。 */
  private combineMul(left: Expr, right: Expr): Expr {
    if (left.kind === 'mul') return mul([...left.factors, right], left.origin);
    return mul([left, right], this.id());
  }

  private unary(): Expr {
    if (this.isOp('-')) {
      this.next();
      return neg(this.unary(), this.id());
    }
    if (this.isOp('+')) {
      this.next();
      return this.unary();
    }
    return this.power();
  }

  private power(): Expr {
    const base = this.primary();
    if (this.isOp('^')) {
      this.next();
      return pow(base, this.unary(), this.id());
    }
    return base;
  }

  private primary(): Expr {
    const token = this.peek();

    if (token.type === 'number') {
      this.next();
      return num(token.value, this.id(), token.text);
    }

    if (this.isOp('√')) {
      this.next();
      return sqrt(this.primary(), this.id());
    }

    if (token.type === 'lparen') {
      this.next();
      const inner = this.expression();
      if (this.peek().type !== 'rparen') {
        throw new ParseError('閉じ括弧がありません', this.peek().pos);
      }
      this.next();
      return inner;
    }

    if (token.type === 'ident') {
      this.next();
      if (token.text === 'pi') return pi(this.id());
      if (FUNCTIONS.has(token.text)) {
        if (this.peek().type !== 'lparen') {
          throw new ParseError(`${token.text} のあとに ( がありません`, this.peek().pos);
        }
        this.next();
        const arg = this.expression();
        if (this.peek().type !== 'rparen') {
          throw new ParseError('閉じ括弧がありません', this.peek().pos);
        }
        this.next();
        return sqrt(arg, this.id());
      }
      return variable(token.text, this.id());
    }

    if (token.type === 'rparen') {
      throw new ParseError('対応する開き括弧がありません', token.pos);
    }

    if (token.type === 'op') {
      throw new ParseError(`演算子 ${token.text} の右側に式がありません`, token.pos);
    }

    throw new ParseError('式が途中で終わっています', token.pos);
  }
}

export function parse(input: string): Expr {
  return new Parser(input).parse();
}
