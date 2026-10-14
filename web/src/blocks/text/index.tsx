import type { BlockSize, PageBlock } from '../../types';
import { TextIcon } from '../icons';
import type { BlockDefinition, RenderProps } from '../types';

export interface TextProps {
  text: string;
}

const FONT: Record<BlockSize, number> = { S: 14, M: 20, L: 32 };
/** 單行放不下時換行的最大寬度 */
const MAX_W: Record<BlockSize, number> = { S: 220, M: 320, L: 520 };
const PAD = 16;

const textWidthOf = (line: string, font: number) =>
  [...line].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 1.05 : 0.6), 0) * font;

/** 文字積木佔用的大小：寬度跟著內容（不超過該尺寸的上限），超過就換行 */
export function textFootprint(text: string, size: BlockSize): { w: number; h: number } {
  const font = FONT[size];
  const lines = text.split('\n');
  const longest = Math.max(...lines.map((l) => textWidthOf(l, font)), 0);
  const w = Math.min(MAX_W[size], Math.max(48, Math.ceil(longest) + PAD));
  const rows = lines.reduce((n, l) => n + Math.max(1, Math.ceil(textWidthOf(l, font) / (w - PAD))), 0);
  return { w, h: Math.ceil(rows * font * 1.5) + 8 };
}

function TextRender({ block, mode }: RenderProps<TextProps>) {
  const fp = textFootprint(block.props.text, block.size);
  return (
    <div
      className={`textblk textblk--${block.size}`}
      style={{ fontSize: FONT[block.size], width: mode === 'canvas' ? fp.w : undefined }}
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
  footprint: (b: PageBlock<TextProps>) => textFootprint(b.props.text, b.size),
  Render: TextRender,
  Editor: ({ block, onProps }) => (
    <section className="be__sec">
      <h3>文字內容 <small>可換行；用預覽旁的小、中、大調整字級</small></h3>
      <textarea className="ef__input ef__input--plain ef__textarea" aria-label="文字內容" rows={4} value={block.props.text} maxLength={400} onChange={(e) => onProps({ text: e.target.value })} />
    </section>
  ),
};
