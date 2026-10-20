import { describe, expect, it } from 'vitest';
import { evaluateLamp, findVTag, lampVTag, type TagIndex } from './blocks';

const UPW = { site: 'f18p2', name: 'F18P2.UPW.LAMP' };
const index = (rows: [string, number | null][]): TagIndex => new Map(rows.map(([k, value]) => [k, { value }]));

describe('evaluateLamp：virtual tag 的值就是燈號代碼', () => {
  it('2 紅、1 黃、0 綠', () => {
    expect(evaluateLamp(UPW, index([['f18p2|F18P2.UPW.LAMP', 2]]))).toMatchObject({ status: 'red', reason: 'ok', text: '異常', value: 2 });
    expect(evaluateLamp(UPW, index([['f18p2|F18P2.UPW.LAMP', 1]])).status).toBe('yellow');
    expect(evaluateLamp(UPW, index([['f18p2|F18P2.UPW.LAMP', 0]])).status).toBe('green');
  });
  it('沒有值、或值不在代碼表上 → 灰', () => {
    expect(evaluateLamp(UPW, index([['f18p2|F18P2.UPW.LAMP', null]]))).toMatchObject({ status: 'gray', reason: 'nodata' });
    expect(evaluateLamp(UPW, index([['f18p2|F18P2.UPW.LAMP', 7]])).status).toBe('gray');
    expect(evaluateLamp(UPW, index([])).status).toBe('gray');
  });
  it('沒選 virtual tag → 灰「尚未選擇」；上游沒有 → 無效', () => {
    expect(evaluateLamp(undefined, index([]))).toMatchObject({ status: 'gray', reason: 'empty' });
    expect(evaluateLamp({ site: 'f18p2', name: 'NOPE' }, index([]))).toMatchObject({ status: 'gray', reason: 'invalid' });
  });
  it('有效的 virtual tag 帶出說明與組成的 InSQL tag', () => {
    const r = evaluateLamp(UPW, index([]));
    expect(r.info?.desc).toBe('F18P2 廠區 超純水燈號');
    expect(r.info?.sources).toHaveLength(8);
  });
});

describe('lampVTag：舊資料轉換', () => {
  it('有 vtag 時直接用', () => expect(lampVTag({ vtag: UPW })).toEqual(UPW));
  it('舊版「整個情境」轉成該廠區 × 系統的 virtual tag', () => expect(lampVTag({ source: { site: 'f18p2', system: 'upw' } })).toEqual(UPW));
  it('舊版「選取 Tag」沒有對應的 virtual tag', () => expect(lampVTag({ tags: [{ site: 'f18p2', tag: 'UPW-POL-02.TOC' }] })).toBeUndefined());
});

describe('findVTag：依名稱找 virtual tag', () => {
  it('不分大小寫、去掉空白', () => expect(findVTag('f18p2', ' f18p2.upw.lamp ')?.key).toBe('f18p2|F18P2.UPW.LAMP'));
  it('依廠區：別的廠區的名稱找不到', () => expect(findVTag('f18p1', 'F18P2.UPW.LAMP')).toBeUndefined());
});
