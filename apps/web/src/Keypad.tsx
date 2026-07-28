/**
 * キーパッド。押した文字を入力末尾に足すだけの単純な作りにしてある。
 * 2 次元の式の中にカーソルを置いて編集する（構造エディタ）のは Phase 3 の範囲外。
 */

export type KeyAction =
  | { readonly type: 'insert'; readonly text: string }
  | { readonly type: 'backspace' }
  | { readonly type: 'clear' }
  | { readonly type: 'enter' };

type Key = {
  readonly label: string;
  readonly action: KeyAction;
  readonly variant?: 'function' | 'operator' | 'accent';
  readonly span?: number;
};

const ins = (text: string, label = text, variant?: Key['variant']): Key => ({
  label,
  action: { type: 'insert', text },
  ...(variant === undefined ? {} : { variant }),
});

const KEYS: Key[] = [
  { label: 'AC', action: { type: 'clear' }, variant: 'function' },
  { label: '⌫', action: { type: 'backspace' }, variant: 'function' },
  ins('(', '(', 'function'),
  ins(')', ')', 'function'),
  ins('^', 'xʸ', 'function'),

  ins('√', '√', 'function'),
  ins('7'),
  ins('8'),
  ins('9'),
  ins('/', '÷', 'operator'),

  ins('π', 'π', 'function'),
  ins('4'),
  ins('5'),
  ins('6'),
  ins('×', '×', 'operator'),

  ins('.', '.', 'function'),
  ins('1'),
  ins('2'),
  ins('3'),
  ins('-', '−', 'operator'),

  { label: '=', action: { type: 'enter' }, variant: 'accent' },
  { ...ins('0'), span: 3 },
  ins('+', '+', 'operator'),
];

export function Keypad({ onKey }: { onKey: (action: KeyAction) => void }): JSX.Element {
  return (
    <div className="keypad">
      {KEYS.map((key, i) => (
        <button
          key={`${key.label}-${i}`}
          type="button"
          className={`key${key.variant === undefined ? '' : ` key-${key.variant}`}`}
          style={key.span === undefined ? undefined : { gridColumn: `span ${key.span}` }}
          onClick={() => onKey(key.action)}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
