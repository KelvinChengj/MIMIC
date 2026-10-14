import { STATUS_META } from '../lib/status';
import type { Status } from '../types';

/** 燈號小圓點（側欄、表格用）；用 aria-label 補足色盲 / 螢幕閱讀器 */
export function Dot({ status, className = '' }: { status: Status; className?: string }) {
  return (
    <span
      className={`dot dot--${status} ${className}`}
      role="img"
      aria-label={`${STATUS_META[status].label}燈 ${STATUS_META[status].badge}`}
      title={STATUS_META[status].badge}
    />
  );
}

/** 圓形燈號圖示：✓ 綠、✕ 紅、! 黃、? 灰，形狀也能區分狀態 */
export function Lamp({ status, size = 34 }: { status: Status; size?: number }) {
  const glyph = {
    green: <path d="m7 12.5 3.2 3.2L17 8.8" />,
    red: <path d="m8 8 8 8M16 8l-8 8" />,
    yellow: <path d="M12 7v6.2M12 16.6v.1" />,
    gray: <path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1.9-1.1 1.6M12 16.6v.1" />,
  }[status];
  return (
    <svg className={`lamp lamp--${status}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <g fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {glyph}
      </g>
    </svg>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge--${status}`}>{STATUS_META[status].badge}</span>;
}

export function Legend() {
  return (
    <ul className="legend">
      {(['red', 'yellow', 'green', 'gray'] as Status[]).map((s) => (
        <li key={s}>
          <Dot status={s} />
          {STATUS_META[s].legend}
        </li>
      ))}
    </ul>
  );
}
