import { SIZES, SIZE_LABEL } from '../blocks/layout';
import type { BlockSize } from '../types';

/** 小 / 中 / 大 三段切換 */
export function SizeSwitch({ value, onChange, compact, hint }: {
  value: BlockSize;
  onChange: (s: BlockSize) => void;
  compact?: boolean;
  hint?: (s: BlockSize) => string;
}) {
  return (
    <div className={`sizes ${compact ? 'sizes--compact' : ''}`} role="group" aria-label="積木尺寸">
      {SIZES.map((s) => (
        <button
          key={s} type="button" className={value === s ? 'is-on' : ''} aria-pressed={value === s}
          aria-label={`尺寸：${SIZE_LABEL[s]}`}
          title={`尺寸：${SIZE_LABEL[s]}${hint ? `（${hint(s)}）` : ''}`}
          onClick={(e) => { e.stopPropagation(); onChange(s); }}
        >
          {SIZE_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
