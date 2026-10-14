import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { makeBlock, newId, snap } from '../lib/blocks';
import type { UserBlock, UserPage } from '../types';
import { usePersistentState } from './storage';

interface UserPagesValue {
  pages: UserPage[];
  getPage: (slug: string) => UserPage | undefined;
  createPage: (title: string) => string;
  renamePage: (slug: string, title: string) => void;
  deletePage: (slug: string) => void;
  addBlock: (slug: string) => string;
  updateBlock: (slug: string, id: string, patch: Partial<UserBlock>) => void;
  moveBlock: (slug: string, id: string, x: number, y: number) => void;
  removeBlock: (slug: string, id: string) => void;
  duplicateBlock: (slug: string, id: string) => string | undefined;
}
const Ctx = createContext<UserPagesValue | null>(null);

export function UserPagesProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = usePersistentState<UserPage[]>('mimic.userpages.v1', []);

  const value = useMemo<UserPagesValue>(() => {
    const patchPage = (slug: string, fn: (p: UserPage) => UserPage) =>
      setPages((prev) => prev.map((p) => (p.slug === slug ? fn(p) : p)));
    return {
      pages,
      getPage: (slug) => pages.find((p) => p.slug === slug),
      createPage: (title) => {
        const slug = newId('u');
        setPages((prev) => [...prev, { slug, title: title.trim() || '未命名頁面', blocks: [], createdAt: Date.now() }]);
        return slug;
      },
      renamePage: (slug, title) => patchPage(slug, (p) => ({ ...p, title })),
      deletePage: (slug) => setPages((prev) => prev.filter((p) => p.slug !== slug)),
      addBlock: (slug) => {
        const id = newId('b');
        patchPage(slug, (p) => ({ ...p, blocks: [...p.blocks, { ...makeBlock(p.blocks), id }] }));
        return id;
      },
      updateBlock: (slug, id, patch) =>
        patchPage(slug, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      moveBlock: (slug, id, x, y) =>
        patchPage(slug, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === id ? { ...b, x: snap(x), y: snap(y) } : b)) })),
      removeBlock: (slug, id) => patchPage(slug, (p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== id) })),
      duplicateBlock: (slug, id) => {
        const src = pages.find((p) => p.slug === slug)?.blocks.find((b) => b.id === id);
        if (!src) return undefined;
        const copyId = newId('b');
        patchPage(slug, (p) => ({
          ...p,
          blocks: [...p.blocks, { ...src, id: copyId, title: `${src.title}（複製）`, x: src.x + 30, y: src.y + 30, vars: src.vars.map((v) => ({ ...v })) }],
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
