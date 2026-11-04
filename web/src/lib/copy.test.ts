import { describe, expect, it } from 'vitest';
import { builtinLayoutPage } from '../blocks/builtin';
import type { TextProps } from '../blocks/text';
import type { LampProps } from '../types';
import { copyTitle, planCopy, sitesInPage } from './copy';

const water = builtinLayoutPage('f18p2-water')!;
const names = (blocks: { type: string; props: unknown }[]) =>
  blocks.filter((b) => b.type === 'lamp').map((b) => (b.props as LampProps).vtag?.name ?? '（未綁定）');

describe('複製頁面', () => {
  it('不換廠區：內容相同、名稱加「（複本）」，而且是深拷貝', () => {
    const plan = planCopy(water);
    expect(names(plan.blocks)).toEqual(names(water.blocks));
    expect(plan.rebound).toBe(0);
    expect(copyTitle(water.title)).toBe('F18P2 水系統值班（複本）');
    (plan.blocks.find((b) => b.type === 'lamp')!.props as LampProps).vtag!.name = 'X';
    expect(names(water.blocks)[0]).toBe('F18P2.UPW.PRE.LAMP');
  });

  it('換廠區：燈號改綁同名 virtual tag、找不到的清空，名稱與文字跟著換', () => {
    const plan = planCopy(water, { from: 'f18p2', to: 'f18p3' });
    expect(names(plan.blocks)).toEqual([
      '（未綁定）', // F18P3 沒有前處理 Tag：清空，避免 F18P3 的頁面顯示 F18P2 的燈號
      'F18P3.UPW.RO.LAMP', 'F18P3.UPW.EDI.LAMP', 'F18P3.UPW.POL.LAMP', 'F18P3.UPW.LOOP.LAMP',
    ]);
    expect(plan.rebound).toBe(4);
    expect(plan.missing).toEqual(['前處理']);
    expect((plan.blocks.find((b) => b.id === 'title')!.props as TextProps).text).toBe('F18P3 廠區 · 超純水');
    expect(copyTitle(water.title, { from: 'f18p2', to: 'f18p3' })).toBe('F18P3 水系統值班');
    expect(water.blocks.find((b) => b.id === 'title')!.props).toEqual({ text: 'F18P2 廠區 · 超純水' });
  });

  it('地圖頁換廠區：底圖不變，12 顆燈號全部改綁', () => {
    const map = builtinLayoutPage('cleanroom-hvac')!;
    expect(sitesInPage(map)).toEqual(['f18p2']);
    const plan = planCopy(map, { from: 'f18p2', to: 'f18p1' });
    expect(plan.rebound).toBe(12);
    expect(plan.missing).toEqual([]);
    expect(names(plan.blocks).every((n) => n.startsWith('F18P1.'))).toBe(true);
  });

  it('多廠區的頁面只換指定的廠區', () => {
    const upw = builtinLayoutPage('upw')!;
    expect(sitesInPage(upw)).toEqual(['f18p1', 'f18p2', 'f18p3', 'f18p7']);
    const plan = planCopy(upw, { from: 'f18p7', to: 'f18p1' });
    expect(plan.rebound).toBe(1);
    expect(names(plan.blocks)).toEqual(['F18P1.UPW.LAMP', 'F18P2.UPW.LAMP', 'F18P3.UPW.LAMP', 'F18P1.UPW.LAMP']);
  });
});
