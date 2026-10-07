// 模擬 FDM 資料（伺服器預設資料源，也供純前端試玩版使用）
export const MOCK_TAGS = [
  { tag: 'CH-01.CHWS_T', name: '冰水主機 1 出水溫度', unit: '°C', area: '冰水系統', base: 7.0, amp: 1.6, period: 90 },
  { tag: 'CH-01.LOAD', name: '冰水主機 1 負載率', unit: '%', area: '冰水系統', base: 68, amp: 30, period: 140 },
  { tag: 'CH-02.CHWS_T', name: '冰水主機 2 出水溫度', unit: '°C', area: '冰水系統', base: 7.2, amp: 2.2, period: 110 },
  { tag: 'CH-02.LOAD', name: '冰水主機 2 負載率', unit: '%', area: '冰水系統', base: 55, amp: 40, period: 170 },
  { tag: 'CT-01.BASIN_T', name: '冷卻水塔 1 水盆溫度', unit: '°C', area: '冷卻水系統', base: 30, amp: 4, period: 120 },
  { tag: 'AHU-01.SUP_T', name: 'AHU-01 送風溫度', unit: '°C', area: '空調箱', base: 22, amp: 1.5, period: 80 },
  { tag: 'AHU-01.RH', name: 'AHU-01 相對濕度', unit: '%RH', area: '空調箱', base: 45, amp: 9, period: 100 },
  { tag: 'AHU-02.DP', name: 'AHU-02 濾網壓差', unit: 'Pa', area: '空調箱', base: 180, amp: 90, period: 200 },
  { tag: 'AHU-03.SUP_T', name: 'AHU-03 送風溫度（通訊中斷）', unit: '°C', area: '空調箱', offline: true },
  { tag: 'AIR-01.PRESS', name: '壓縮空氣主管壓力', unit: 'bar', area: '氣體系統', base: 7.0, amp: 0.9, period: 75 },
  { tag: 'N2-01.PURITY', name: '氮氣純度', unit: '%', area: '氣體系統', base: 99.9985, amp: 0.0012, period: 130 },
  { tag: 'UPS-01.BATT', name: 'UPS-01 電池電量', unit: '%', area: '電力系統', base: 92, amp: 12, period: 260 },
  { tag: 'PW-01.COND', name: '純水導電度', unit: 'µS/cm', area: '純水系統', base: 0.07, amp: 0.05, period: 95 },
  { tag: 'WWT-01.PH', name: '廢水 pH 值', unit: 'pH', area: '廢水系統', base: 7.2, amp: 1.4, period: 150 },
];

export function mockValue(def, nowMs) {
  if (def.offline) return null;
  const t = nowMs / 1000;
  const v = def.base + def.amp * Math.sin((2 * Math.PI * t) / def.period + def.tag.length);
  return Math.round(v * 10000) / 10000;
}
