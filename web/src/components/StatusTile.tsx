import { Link } from 'react-router-dom';
import type { BlockSize, Status } from '../types';
import { Lamp } from './Lamp';

export const LAMP_PX: Record<BlockSize, number> = { S: 26, M: 34, L: 56 };

interface Props {
  status: Status;
  size?: BlockSize;
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
export function StatusTile({ status, size = 'M', title, value, text, label, to, fill }: Props) {
  const cls = `tile tile--${status} tile--${size} ${fill ? 'tile--fill' : ''}`;
  const body = (
    <>
      {title && <span className="tile__title">{title}</span>}
      <Lamp status={status} size={LAMP_PX[size]} />
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
