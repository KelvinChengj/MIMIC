import { describe, expect, it } from 'vitest';
import { addGroup, addSlug, deleteGroup, moveGroup, movePage, nudgeGroup, nudgePage, removeSlug, renameGroup, type FavGroup } from './favorites';

const G = (): FavGroup[] => [
  { id: 'g1', name: '一', slugs: ['a', 'b', 'c'] },
  { id: 'g2', name: '二', slugs: ['d'] },
  { id: 'g3', name: '三', slugs: [] },
];
const layout = (gs: FavGroup[]) => gs.map((g) => g.slugs.join('')).join('|');

describe('movePage', () => {
  it('同分類內往前插', () => expect(layout(movePage(G(), 'c', 'g1', 'a'))).toBe('cab|d|'));
  it('同分類內移到最後', () => expect(layout(movePage(G(), 'a', 'g1', null))).toBe('bca|d|'));
  it('跨分類插入指定位置', () => expect(layout(movePage(G(), 'b', 'g2', 'd'))).toBe('ac|bd|'));
  it('移到空分類', () => expect(layout(movePage(G(), 'a', 'g3', null))).toBe('bc|d|a'));
  it('放在自己前面不變', () => expect(movePage(G(), 'a', 'g1', 'a')).toEqual(G()));
  it('不存在的分類不變', () => expect(movePage(G(), 'a', 'x', null)).toEqual(G()));
  it('不修改原陣列', () => { const g = G(); movePage(g, 'a', 'g2', null); expect(g).toEqual(G()); });
});

describe('nudgePage', () => {
  it('分類內上移 / 下移', () => {
    expect(layout(nudgePage(G(), 'b', -1))).toBe('bac|d|');
    expect(layout(nudgePage(G(), 'b', 1))).toBe('acb|d|');
  });
  it('分類最上方再上移 → 跨到上一個分類最後', () => expect(layout(nudgePage(G(), 'd', -1))).toBe('abcd||'));
  it('分類最下方再下移 → 跨到下一個分類最前', () => expect(layout(nudgePage(G(), 'c', 1))).toBe('ab|cd|'));
  it('最頂 / 最底不動', () => {
    expect(nudgePage(G(), 'a', -1)).toEqual(G());
    const g = G(); g[1].slugs = []; g[2].slugs = ['z'];
    expect(nudgePage(g, 'z', 1)).toEqual(g);
  });
  it('跨過空分類時落在相鄰的空分類', () => expect(layout(nudgePage(G(), 'd', 1))).toBe('abc||d'));
});

describe('分類', () => {
  it('moveGroup', () => {
    expect(moveGroup(G(), 'g3', 'g1').map((g) => g.id)).toEqual(['g3', 'g1', 'g2']);
    expect(moveGroup(G(), 'g1', null).map((g) => g.id)).toEqual(['g2', 'g3', 'g1']);
  });
  it('nudgeGroup', () => {
    expect(nudgeGroup(G(), 'g2', -1).map((g) => g.id)).toEqual(['g2', 'g1', 'g3']);
    expect(nudgeGroup(G(), 'g1', -1)).toEqual(G());
  });
  it('addGroup / renameGroup', () => {
    const g = addGroup(G(), 'n', '  新的  ');
    expect(g[3]).toEqual({ id: 'n', name: '新的', slugs: [] });
    expect(addGroup(G(), 'n', ' ')[3].name).toBe('新分類');
    expect(renameGroup(G(), 'g1', '改').find((x) => x.id === 'g1')!.name).toBe('改');
    expect(renameGroup(G(), 'g1', ' ')).toEqual(G());
  });
  it('deleteGroup：頁面併到上一個分類', () => expect(layout(deleteGroup(G(), 'g2'))).toBe('abcd|'));
  it('deleteGroup：第一個分類的頁面併到下一個最前', () => expect(layout(deleteGroup(G(), 'g1'))).toBe('abcd|'));
  it('deleteGroup：只剩一個分類時不刪', () => {
    const one = [G()[0]];
    expect(deleteGroup(one, 'g1')).toEqual(one);
  });
  it('addSlug / removeSlug', () => {
    expect(layout(addSlug(G(), 'g3', 'x'))).toBe('abc|d|x');
    expect(layout(addSlug(G(), 'g1', 'a'))).toBe('abc|d|');
    expect(layout(removeSlug(G(), 'b'))).toBe('ac|d|');
  });
});
