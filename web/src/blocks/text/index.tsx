import type { BlockSize } from '../../types';
import { TextIcon } from '../icons';
import type { BlockDefinition, RenderProps } from '../types';

export interface TextProps {
  text: string;
}

const FONT: Record<BlockSize, number> = { S: 14, M: 20, L: 32 };
const WIDTH: Record<BlockSize, number> = { S: 220, M: 320, L: 520 };

function TextRender({ block, mode }: RenderProps<TextProps>) {
  return (
    <div
      className={`textblk textblk--${block.size}`}
      style={{ fontSize: FONT[block.size], width: mode === 'canvas' ? WIDTH[block.size] : undefined }}
    >
      {block.props.text || <span className="textblk__empty">（空白文字）</span>}
    </div>
  );
}

export const textBlock: BlockDefinition<TextProps> = {
  type: 'text',
  label: '文字',
  description: '標題或備註，用來說明這個區塊在看什麼。',
  category: '版面',
  icon: <TextIcon />,
  defaultProps: () => ({ text: '標題文字' }),
  defaultTitle: (n) => `文字 ${n}`,
  titleless: true,
  footprint: (b) => {
    const lines = Math.max(1, b.props.text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(([...l].length * FONT[b.size]) / WIDTH[b.size])), 0));
    return { w: WIDTH[b.size], h: Math.ceil(lines * FONT[b.size] * 1.5) + 8 };
  },
  Render: TextRender,
  Editor: ({ block, onProps }) => (
    <section className="be__sec">
      <h3>文字內容 <small>可換行；用右上角的小、中、大調整字級</small></h3>
      <textarea className="ef__input ef__input--plain ef__textarea" aria-label="文字內容" rows={4} value={block.props.text} maxLength={400} onChange={(e) => onProps({ text: e.target.value })} />
    </section>
  ),
};
