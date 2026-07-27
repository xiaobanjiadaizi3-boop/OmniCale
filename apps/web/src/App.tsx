import { useMemo, useState } from 'react';
import { repeatingDecimal, representations, type Exact, type Representation } from '@omnicale/core';
import { SAMPLES } from './samples.js';

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

export function App(): JSX.Element {
  const [selected, setSelected] = useState(0);
  const [digits, setDigits] = useState(10);

  const sample = SAMPLES[selected] ?? SAMPLES[0]!;
  const reps = useMemo(
    () => representations(sample.value, { decimalDigits: digits }),
    [sample, digits],
  );

  return (
    <main className="app">
      <header>
        <h1>OmniCale</h1>
        <p className="phase">Phase 1 — 値の表現</p>
        <p className="lead">
          √ や π を含む値は表示形が 1 つに決まらない。厳密値のまま保持しておき、
          表示の直前にすべての表し方を展開する。
        </p>
      </header>

      <section className="picker">
        {SAMPLES.map((s, i) => (
          <button
            key={s.label}
            type="button"
            className={i === selected ? 'chip chip-on' : 'chip'}
            onClick={() => setSelected(i)}
          >
            {s.label}
          </button>
        ))}
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

      <section className="result">
        <div className="input-echo">{sample.label}</div>
        <ul className="reps">
          {reps.map((r) => (
            <li key={r.id} className={r.isExact ? 'rep rep-exact' : 'rep rep-approx'}>
              <span className="rep-label">{r.label}</span>
              <span className="rep-eq" title={r.isExact ? '厳密値' : '近似値'}>
                {r.isExact ? '=' : '≈'}
              </span>
              <RepDisplay rep={r} value={sample.value} />
              {r.note !== undefined && <span className="rep-note">{r.note}</span>}
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <p>
          <code>=</code> は誤差なし、<code>≈</code> は近似。この区別は値の側が持っている。
        </p>
        <p>式の入力は Phase 2、解き方のツリーは Phase 4–5 で追加する。</p>
      </footer>
    </main>
  );
}
