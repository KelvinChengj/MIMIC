import { describe, expect, it } from 'vitest';
import { ALL_TAGS, TAG_BY_KEY, checkTagInput, evaluateLamp, lampTags, tagKey, type TagIndex } from './blocks';
import type { TagReading } from '../types';

const reading = (name: string, value: number | null, isOOS = false, isOOC = false): TagReading => ({ name, desc: '', metric: name.split('.')[1], value, isOOS, isOOC });
const index = (rows: [string, string, TagReading][]): TagIndex => new Map(rows.map(([site, tag, r]) => [tagKey(site, tag), r]));

const TOC = { site: 'f18p2', tag: 'UPW-POL-02.TOC' };
const RES = { site: 'f18p2', tag: 'UPW-POL-03.RES' };
const PRS = { site: 'f18p2', tag: 'UPW-LOOP-01.PRS' };

describe('evaluateLamp：依 FDM 旗標，不需設定條件', () => {
  const idx = index([
    ['f18p2', TOC.tag, reading(TOC.tag, 3.4, true)],
    ['f18p2', RES.tag, reading(RES.tag, 17.9, false, true)],
    ['f18p2', PRS.tag, reading(PRS.tag, 3.6)],
  ]);
  it('任一 OOS → 紅，文字為統計', () => {
    const r = evaluateLamp([TOC, RES, PRS], idx);
    expect([r.status, r.label, r.text]).toEqual(['red', '異常', '1 台異常']);
  });
  it('無 OOS、有 OOC → 黃', () => {
    const r = evaluateLamp([RES, PRS], idx);
    expect([r.status, r.text]).toEqual(['yellow', '1/2 台']);
  });
  it('都正常 → 綠', () => expect(evaluateLamp([PRS], idx).status).toBe('green'));
  it('只選一個 Tag 時顯示它的數值與單位', () => {
    expect(evaluateLamp([TOC], idx).text).toBe('3.4 ppb');
    expect(evaluateLamp([RES], idx).text).toBe('17.9 MΩ·cm');
  });
  it('沒有選 Tag → 灰「尚未選擇 Tag」', () => expect(evaluateLamp([], idx)).toMatchObject({ status: 'gray', reason: 'empty', text: '尚未選擇 Tag' }));
  it('FDM 沒有這個 Tag → 無效，不計入燈號', () => {
    const r = evaluateLamp([{ site: 'f18p2', tag: 'NOPE.TOC' }, PRS], idx);
    expect(r.status).toBe('green');
    expect(r.tags.map((t) => t.valid)).toEqual([false, true]);
    expect(evaluateLamp([{ site: 'f18p2', tag: 'NOPE.TOC' }], idx)).toMatchObject({ status: 'gray', reason: 'invalid' });
  });
  it('全部無資料 → 灰', () => {
    const r = evaluateLamp([TOC], index([['f18p2', TOC.tag, reading(TOC.tag, null)]]));
    expect([r.status, r.reason, r.text]).toEqual(['gray', 'nodata', '無資料']);
  });
});

describe('lampTags：舊資料轉換與去重', () => {
  it('舊版資料點（自訂算式時期）轉成 Tag，沒選 Tag 的略過', () => {
    expect(lampTags({ vars: [{ name: 'A', ...TOC }, { name: 'B' }] })).toEqual([TOC]);
  });
  it('有 tags 時以 tags 為準', () => expect(lampTags({ tags: [RES], vars: [{ name: 'A', ...TOC }] })).toEqual([RES]));
  it('重複的 Tag 只算一次', () => expect(lampTags({ tags: [TOC, TOC, RES] })).toEqual([TOC, RES]));
});

describe('checkTagInput：設定 Tag 並向 FDM 檢查是否有效', () => {
  it('可一次貼多個，換行 / 空白 / 逗號分隔，不分大小寫', () => {
    const r = checkTagInput('upw-pol-02.toc\nUPW-POL-03.RES, UPW-LOOP-01.PRS', 'f18p2', []);
    expect(r.added).toEqual([TOC, RES, PRS]);
    expect(r.missing).toEqual([]);
  });
  it('FDM 找不到的列為 missing', () => {
    const r = checkTagInput('UPW-POL-02.TOC NOT-A-TAG', 'f18p2', []);
    expect(r.added).toEqual([TOC]);
    expect(r.missing).toEqual(['NOT-A-TAG']);
  });
  it('已在清單中的列為 duplicate，不重複加入', () => {
    const r = checkTagInput('UPW-POL-02.TOC', 'f18p2', [TOC]);
    expect(r).toEqual({ added: [], duplicate: ['UPW-POL-02.TOC'], missing: [] });
  });
  it('依廠區檢查：該廠區沒有的 Tag 視為找不到', () => {
    // F18P7 廠區較小，各系統少了最後兩個 Tag；以排氣的最後一個為例
    const last = ALL_TAGS.filter((t) => t.siteId === 'f18p1' && t.systemId === 'exhaust').at(-1)!.name;
    expect(checkTagInput(last, 'f18p7', []).missing).toEqual([last]);
    expect(checkTagInput(last, 'f18p1', []).added).toEqual([{ site: 'f18p1', tag: last }]);
  });
  it('空白輸入不加入任何東西', () => expect(checkTagInput('  \n ', 'f18p2', [])).toEqual({ added: [], duplicate: [], missing: [] }));
});

describe('Tag 主檔', () => {
  it('涵蓋所有廠區', () => {
    expect(new Set(ALL_TAGS.map((t) => t.siteId)).size).toBe(4);
    expect(ALL_TAGS.length).toBe(TAG_BY_KEY.size);
  });
});
