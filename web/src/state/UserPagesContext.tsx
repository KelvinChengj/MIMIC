import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { builtinLayoutPage } from '../blocks/builtin';
import { nextFreePosition, snap } from '../blocks/layout';
import { createBlock, footprintOf, normalizeBlock } from '../blocks/registry';
import { newId } from '../lib/blocks';
import type { PageBlock, UserPage } from '../types';
import { usePersistentState } from './storage';

interface UserPagesValue {
  pages: UserPage[];
  getPage: (slug: string) => UserPage | undefined;
  createPage: (title: string) => string;
  renamePage: (slug: string, title: string) => void;
  deletePage: (slug: string) => void;
  /** 內建頁面：丟掉使用者改過的版面，回到預設 */
  resetLayout: (slug: string) => void;
  addBlock: (slug: string, type: string) => string;
  updateBlock: (slug: string, id: string, patch: Partial<PageBlock>) => void;
  moveBlock: (slug: string, id: string, x: number, y: number) => void;
  removeBlock: (slug: string, id: string) => void;
  duplicateBlock: (slug: string, id: string) => string | undefined;
}
const Ctx = createContext<UserPagesValue | null>(null);

export function UserPagesProvider({ children }: { children: ReactNode }) {
  const [stored, setPages] = usePersistentState<UserPage[]>('mimic.userpages.v1', []);
  // 舊版只有燈號積木、沒有 type / size 欄位；讀進來時統一轉成新格式
  const pages = useMemo(() => stored.map((p) => ({ ...p, blocks: p.blocks.map(normalizeBlock) })), [stored]);

  const value = useMemo<UserPagesValue>(() => {
    // 內建頁面（燈號牆）第一次被修改時，才把預設版面存進來
    const patchPage = (slug: string, fn: (p: UserPage) => UserPage) =>
      setPages((prev) => {
        if (prev.some((p) => p.slug === slug)) return prev.map((p) => (p.slug === slug ? fn(p) : p));
        const seed = builtinLayoutPage(slug);
        return seed ? [...prev, fn(seed)] : prev;
      });
    const find = (slug: string) => pages.find((p) => p.slug === slug) ?? builtinLayoutPage(slug);
    return {
      pages,
      getPage: find,
      createPage: (title) => {
        const slug = newId('u');
        setPages((prev) => [...prev, { slug, title: title.trim() || '未命名頁面', blocks: [], createdAt: Date.now() }]);
        return slug;
      },
      renamePage: (slug, title) => patchPage(slug, (p) => ({ ...p, title })),
      deletePage: (slug) => setPages((prev) => prev.filter((p) => p.slug !== slug || p.builtin)),
      resetLayout: (slug) => setPages((prev) => prev.filter((p) => !(p.slug === slug && p.builtin))),
      addBlock: (slug, type) => {
        const block = createBlock(type, find(slug)?.blocks ?? []);
        patchPage(slug, (p) => ({ ...p, blocks: [...p.blocks, block] }));
        return block.id;
      },
      updateBlock: (slug, id, patch) =>
        patchPage(slug, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      moveBlock: (slug, id, x, y) =>
        patchPage(slug, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === id ? { ...b, x: snap(x), y: snap(y) } : b)) })),
      removeBlock: (slug, id) => patchPage(slug, (p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== id) })),
      duplicateBlock: (slug, id) => {
        const all = find(slug)?.blocks ?? [];
        const src = all.find((b) => b.id === id);
        if (!src) return undefined;
        const copyId = newId('b');
        // 複本放在畫布上第一個空位，不疊在原件上
        const at = nextFreePosition(all, footprintOf, footprintOf(src));
        patchPage(slug, (p) => ({
          ...p,
          blocks: [...p.blocks, { ...src, id: copyId, title: src.title ? `${src.title}（複製）` : '', ...at, props: structuredClone(src.props) }],
        }));
        return copyId;
      },
    };
  }, [pages, setPages]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserPages() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUserPages 必須在 UserPagesProvider 內使用');
  return v;
}
