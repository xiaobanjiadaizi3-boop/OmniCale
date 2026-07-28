import { useMemo, useState } from 'react';
import {
  calculate,
  repeatingDecimal,
  type CalcOutcome,
  type Exact,
  type Representation,
} from '@omnicale/core';
import { EXAMPLES } from './samples.js';

/**
 * 循環小数だけは結合文字（上付きの点）がフォントによって消えるので、
 * 構造化された値を受け取って CSS のオーバーラインで描く。
 * core が返す文字列はコピー用のプレーンテキストとして温存する。
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

function Result({ outcome }: { outcome: CalcOutcome }): JSX.Element {
  if (outcome.kind === 'error') {
    return (
      <section className="result result-error">
        <div className="error-body">
          <span className="error-mark">!</span>
          <span>{outcome.message}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="result">
      <div className="input-echo">{outcome.printed}</div>
      {outcome.kind === 'approx' ? (
        <ul className="reps">
          <li className="rep rep-approx">
            <span className="rep-label">小数</span>
            <span className="rep-eq">≈</span>
            <span className="rep-display">{outcome.display}</span>
            <span className="rep-note">{outcome.note}</span>
          </li>
        </ul>
      ) : (
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
  );
}

export function App(): JSX.Element {
  const [input, setInput] = useState('√8 + √2');
  const [digits, setDigits] = useState(10);

  const outcome = useMemo(
    () => (input.trim() === '' ? null : calculate(input, { decimalDigits: digits })),
    [input, digits],
  );

  return (
    <main className="app">
      <header>
        <h1>OmniCale</h1>
        <p className="phase">Phase 2 — 式の入力と評価</p>
        <p className="lead">
          式を打つと、厳密な形にまとめられるものは厳密値で答え、まとめられないものは
          高精度の小数で答える。√ や π を含む値は表示形が 1 つに決まらないので、
          すべての表し方を並べる。
        </p>
      </header>

      <section className="entry">
        <input
          className="formula"
          type="text"
          value={input}
          spellCheck={false}
          autoComplete="off"
          placeholder="例: √8 + √2"
          aria-label="計算式"
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="symbols">
          {['√', 'π', '(', ')', '^', '/', '×', '-', '+'].map((s) => (
            <button
              key={s}
              type="button"
              className="sym"
              onClick={() => setInput((v) => v + s)}
            >
              {s}
            </button>
          ))}
          <button type="button" className="sym sym-clear" onClick={() => setInput('')}>
            クリア
          </button>
        </div>
      </section>

      {outcome !== null && <Result outcome={outcome} />}

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

      <footer>
        <p>
          <code>=</code> は誤差なし、<code>≈</code> は近似。この区別は値の側が持っている。
        </p>
        <p>
          使えるもの: <code>+ - × ÷ ^ ( )</code>、<code>√</code>、<code>π</code>、小数、
          暗黙の掛け算（<code>2(3+4)</code>）。
        </p>
        <p>sin・log などの関数と、変数を含む式の解き方ツリーは Phase 4 以降で追加する。</p>
      </footer>
    </main>
  );
}
