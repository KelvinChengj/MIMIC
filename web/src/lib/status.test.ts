import { describe, expect, it } from 'vitest';
import { fetchLamps, fetchVTagDetail, judge, VTAGS } from './fdm';
import { LAMP_CODE, ruleLines, summarize, tagStatus, vtagStatus, worstOf } from './status';

describe('tagStatus：只看 FDM 旗標', () => {
  it('無資料為灰（即使旗標有值也一樣）', () => expect(tagStatus({ value: null, isOOS: true, isOOC: false })).toBe('gray'));
  it('isOOS → 紅', () => expect(tagStatus({ value: 3.4, isOOS: true, isOOC: false })).toBe('red'));
  it('isOOC → 黃', () => expect(tagStatus({ value: 2.4, isOOS: false, isOOC: true })).toBe('yellow'));
  it('兩者都是時以 OOS 為準', () => expect(tagStatus({ value: 9, isOOS: true, isOOC: true })).toBe('red'));
  it('都沒有 → 綠', () => expect(tagStatus({ value: 0.4, isOOS: false, isOOC: false })).toBe('green'));
});

describe('模擬 FDM 的判定 judge', () => {
  const limits = { yellowHigh: 1, redHigh: 3, yellowLow: -1, redLow: -3 };
  it('超出規格界限 → OOS（不同時算 OOC）', () => expect(judge(limits, 3.4)).toEqual({ isOOS: true, isOOC: false }));
  it('超出管制界限 → OOC', () => expect(judge(limits, 2)).toEqual({ isOOS: false, isOOC: true }));
  it('下限同理', () => {
    expect(judge(limits, -4)).toEqual({ isOOS: true, isOOC: false });
    expect(judge(limits, -2)).toEqual({ isOOS: false, isOOC: true });
  });
  it('界限內與無資料都不是', () => {
    expect(judge(limits, 0.5)).toEqual({ isOOS: false, isOOC: false });
    expect(judge(limits, null)).toEqual({ isOOS: false, isOOC: false });
  });
});

describe('summarize / worstOf', () => {
  it('紅 > 黃 > 綠 > 灰', () => {
    expect(summarize(['green', 'yellow', 'red']).status).toBe('red');
    expect(summarize(['green', 'yellow']).status).toBe('yellow');
    expect(summarize(['green', 'gray']).status).toBe('green');
    expect(summarize(['gray', 'gray']).status).toBe('gray');
  });
  it('頁面彙整時灰優先於綠', () => expect(worstOf(['green', 'gray'])).toBe('gray'));
});

describe('virtual tag 燈號代碼', () => {
  it('對照表：0 綠、1 黃、2 紅', () => expect(LAMP_CODE).toEqual({ 0: 'green', 1: 'yellow', 2: 'red' }));
  it('沒有值或不在表上 → 灰', () => {
    expect(vtagStatus(null)).toBe('gray');
    expect(vtagStatus(undefined)).toBe('gray');
    expect(vtagStatus(9)).toBe('gray');
  });
});

describe('示範資料（FDM 模擬）', () => {
  const snap = fetchLamps(VTAGS.map((v) => v.key), 0, 0);
  const code = (k: string) => snap.readings[k]?.value;
  it('virtual tag 的值是燈號代碼：F18P2 超純水 2、F18P1 電力 2、正常 0、F18P7 排氣沒資料', () => {
    expect(code('f18p2|F18P2.UPW.LAMP')).toBe(2);
    expect(code('f18p1|F18P1.PWR.LAMP')).toBe(2);
    expect(code('f18p1|F18P1.UPW.LAMP')).toBe(0);
    expect(code('f18p7|F18P7.EXH.LAMP')).toBeNull();
  });
  it('只回傳要求的 virtual tag；沒有的不回傳', () => {
    expect(Object.keys(fetchLamps(['f18p2|F18P2.UPW.LAMP', 'f18p2|NOPE'], 0, 0).readings)).toEqual(['f18p2|F18P2.UPW.LAMP']);
  });
  it('下鑽讀回 InSQL tag：F18P2 超純水 3 OOS、2 OOC、1 無資料，共 8 點', () => {
    const d = fetchVTagDetail('f18p2|F18P2.UPW.LAMP', 0, 0)!;
    const st = d.tags.map(tagStatus);
    expect([d.tags.length, st.filter((x) => x === 'red').length, st.filter((x) => x === 'yellow').length, st.filter((x) => x === 'gray').length]).toEqual([8, 3, 2, 1]);
    expect(d.tags[0]).toMatchObject({ key: 'f18p2|UPW-POL-01.RES', unit: 'MΩ·cm' });
    expect(fetchVTagDetail('f18p2|NOPE', 0, 0)).toBeNull();
  });
  it('重新整理後正常的仍是正常', () => expect(fetchLamps(['f18p1|F18P1.UPW.LAMP'], 7, 0).readings['f18p1|F18P1.UPW.LAMP'].value).toBe(0));
});

describe('ruleLines', () => {
  it('四條固定規則，以 virtual tag 的值說明', () => {
    const lines = ruleLines();
    expect(lines.map((l) => l.status)).toEqual(['red', 'yellow', 'green', 'gray']);
    expect(lines[0].text).toContain('值為 2');
    expect(lines[1].text).toContain('值為 1');
    expect(lines[2].text).toContain('值為 0');
  });
});
