import { useCallback, useMemo, useState } from 'react';
import {
  calculate,
  exactToExpr,
  parse,
  repeatingDecimal,
  type CalcOutcome,
  type Exact,
  type Expr,
  type Representation,
} from '@omnicale/core';
import { Keypad, type KeyAction } from './Keypad.js';
import { MathExpr } from './MathExpr.js';
import { EXAMPLES } from './samples.js';

/**
 * 循環小数だけは結合文字（上付きの点）がフォントによって消えるので、
 * 構造化された値を受け取って CSS のオーバーラインで描く。
 */
function RepDisplay({ rep, value }: { rep: Representation; value: Exact }): JSX.Element {
  if (rep.id !== 'repeating' || value.kind !== 'rational') {
    return <span className="rep-display">{rep.display}</span>;
  }
  const d = repeatingDecimal(value.value);
  if (d === null) return <span className="rep-display">{rep.display}</span>;
  return (
    <span className="rep-display">
      {d.sign < 0 ? '-' : ''}
      {d.intPart}.{d.nonRepeating}
      <span className="period">{d.repeating}</span>
    </span>
  );
}

type HistoryEntry = { readonly input: string; readonly expr: Expr; readonly result: Expr | string };

export function App(): JSX.Element {
  const [input, setInput] = useState('');
  const [digits, setDigits] = useState(10);
  const [showAll, setShowAll] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const outcome: CalcOutcome | null = useMemo(
    () => (input.trim() === '' ? null : calculate(input, { decimalDigits: digits })),
    [input, digits],
  );

  /** 入力途中は式として壊れているのが普通なので、読めたときだけ 2 次元で描く。 */
  const typed: Expr | null = useMemo(() => {
    if (input.trim() === '') return null;
    try {
      return parse(input);
    } catch {
      return null;
    }
  }, [input]);

  const resultExpr =
    outcome !== null && outcome.kind === 'exact' ? exactToExpr(outcome.value) : null;

  const onKey = useCallback(
    (action: KeyAction) => {
      switch (action.type) {
        case 'insert':
          setInput((v) => v + action.text);
          break;
        case 'backspace':
          setInput((v) => v.slice(0, -1));
          break;
        case 'clear':
          setInput('');
          break;
        case 'enter': {
          if (outcome === null || outcome.kind === 'error') break;
          const entry: HistoryEntry = {
            input,
            expr: outcome.expr,
            result: outcome.kind === 'exact' ? exactToExpr(outcome.value) : `≈ ${outcome.display}`,
          };
          setHistory((h) => [entry, ...h].slice(0, 20));
          break;
        }
      }
    },
    [input, outcome],
  );

  return (
    <main className="app">
      <header>
        <h1>OmniCale</h1>
        <p className="phase">Phase 3 — 電卓</p>
      </header>

      <section className="display">
        <div className="display-input">
          {typed !== null ? (
            <MathExpr expr={typed} />
          ) : (
            <span className="raw">{input === '' ? ' ' : input}</span>
          )}
        </div>

        <div className="display-result">
          {outcome === null && <span className="muted">&nbsp;</span>}
          {outcome !== null && outcome.kind === 'error' && (
            <span className="err">{outcome.message}</span>
          )}
          {outcome !== null && outcome.kind === 'approx' && (
            <span className="result-value">
              <span className="eq eq-approx">≈</span>
              {outcome.display}
            </span>
          )}
          {outcome !== null && outcome.kind === 'exact' && resultExpr !== null && (
            <span className="result-value">
              <span className="eq eq-exact">=</span>
              <MathExpr expr={resultExpr} />
            </span>
          )}
        </div>
      </section>

      <input
        className="formula"
        type="text"
        value={input}
        spellCheck={false}
        autoComplete="off"
        placeholder="キーボードからも打てます"
        aria-label="計算式"
        onChange={(e) => setInput(e.target.value)}
      />

      <Keypad onKey={onKey} />

      {outcome !== null && outcome.kind === 'exact' && (
        <section className="more">
          <button type="button" className="more-toggle" onClick={() => setShowAll((v) => !v)}>
            {showAll ? '▾ 他の表し方を隠す' : `▸ 他の表し方（${outcome.representations.length}）`}
          </button>
          {showAll && (
            <ul className="reps">
              {outcome.representations.map((r) => (
                <li key={r.id} className={r.isExact ? 'rep rep-exact' : 'rep rep-approx'}>
                  <span className="rep-label">{r.label}</span>
                  <span className="rep-eq" title={r.isExact ? '厳密値' : '近似値'}>
                    {r.isExact ? '=' : '≈'}
                  </span>
                  <RepDisplay rep={r} value={outcome.value} />
                  {r.note !== undefined && <span className="rep-note">{r.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section className="history">
          <div className="section-head">
            <h2>履歴</h2>
            <button type="button" className="linkish" onClick={() => setHistory([])}>
              消去
            </button>
          </div>
          <ul>
            {history.map((h, i) => (
              <li key={i}>
                <button type="button" className="history-item" onClick={() => setInput(h.input)}>
                  <MathExpr expr={h.expr} size="small" />
                  <span className="history-eq">=</span>
                  {typeof h.result === 'string' ? (
                    <span className="history-approx">{h.result}</span>
                  ) : (
                    <MathExpr expr={h.result} size="small" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="examples">
        <h2>例</h2>
        <div className="picker">
          {EXAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              className={s === input ? 'chip chip-on' : 'chip'}
              onClick={() => setInput(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="controls">
        <label htmlFor="digits">小数点以下の桁数：{digits}</label>
        <input
          id="digits"
          type="range"
          min={1}
          max={60}
          value={digits}
          onChange={(e) => setDigits(Number(e.target.value))}
        />
      </section>

      <footer>
        <p>
          <code>=</code> は誤差なし、<code>≈</code> は近似。この区別は値の側が持っている。
        </p>
        <p>
          使えるもの: <code>+ - × ÷ ^ ( )</code>、<code>√</code>、<code>π</code>、小数、
          暗黙の掛け算（<code>2(3+4)</code>）。
        </p>
        <p>sin・log などの関数と、解き方ツリーは Phase 4 以降で追加する。</p>
      </footer>
    </main>
  );
}
