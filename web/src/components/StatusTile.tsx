import { Link } from 'react-router-dom';
import type { BlockSize, Status } from '../types';
import { Lamp } from './Lamp';

export const LAMP_PX: Record<BlockSize, number> = { S: 26, M: 34, L: 56 };

interface Props {
  status: Status;
  size?: BlockSize;
  /** 燈號積木的倍率（中 = 1、大 = 2）；有給的話優先於 size */
  scale?: 1 | 2;
  /** 小標題（小尺寸通常省略） */
  title?: string;
  /** 大字數值（大尺寸用） */
  value?: string;
  /** 燈號下方的一行文字，例如「3 台異常」 */
  text?: string;
  /** 螢幕閱讀器與滑鼠提示 */
  label: string;
  to?: string;
  fill?: boolean;
}

/**
 * 燈號磚塊：單顆燈 + 下方一行文字，依狀態上色。
 * 燈號牆的格子與「燈號積木」都用這個元件，所以長相一致。
 */
export function StatusTile({ status, size = 'M', scale, title, value, text, label, to, fill }: Props) {
  const cls = `tile tile--${status} ${scale ? `tile--k${scale}` : `tile--${size}`} ${fill ? 'tile--fill' : ''}`;
  const body = (
    <>
      {title && <span className="tile__title">{title}</span>}
      <Lamp status={status} size={scale ? 28 * scale : LAMP_PX[size]} />
      {value && <span className="tile__value">{value}</span>}
      {text && <span className="tile__text">{text}</span>}
    </>
  );
  return to ? (
    <Link to={to} className={cls} aria-label={label} title={label}>{body}</Link>
  ) : (
    <div className={cls} role="img" aria-label={label} title={label}>{body}</div>
  );
}

/** 最精簡的燈號（小尺寸）：只有一顆燈，沒有外框與文字；名稱與狀態放在滑鼠提示與螢幕閱讀器 */
export function LampDot({ status, label, to, size }: { status: Status; label: string; to?: string; size: number }) {
  const cls = `lampdot lampdot--${status}`;
  return to ? (
    <Link to={to} className={cls} aria-label={label} title={label}><Lamp status={status} size={size} /></Link>
  ) : (
    <div className={cls} role="img" aria-label={label} title={label}><Lamp status={status} size={size} /></div>
  );
}
