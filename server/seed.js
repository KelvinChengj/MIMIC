// 首次啟動時的範例頁面
const cond = (tag, op, value, value2) => ({ tag, op, value, value2 });
const rule = (id, color, mode, conds) => ({ id, color, mode, conds });

export function seedPages() {
  const now = new Date().toISOString();
  return {
    demo: {
      slug: 'demo',
      title: '廠務總覽（範例）',
      updatedAt: now,
      lights: [
        {
          id: 'l1', label: '冰水主機 1', fallback: 'green',
          rules: [
            rule('r1', 'red', 'any', [cond('CH-01.CHWS_T', '>', 8), cond('CH-01.LOAD', '>', 95)]),
            rule('r2', 'yellow', 'any', [cond('CH-01.CHWS_T', '>', 7.5), cond('CH-01.LOAD', '>', 85)]),
          ],
        },
        {
          id: 'l2', label: '冰水主機 2', fallback: 'green',
          rules: [
            rule('r1', 'red', 'any', [cond('CH-02.CHWS_T', '>', 8.5)]),
            rule('r2', 'yellow', 'any', [cond('CH-02.CHWS_T', '>', 7.5)]),
          ],
        },
        {
          id: 'l3', label: '冷卻水塔 1', fallback: 'green',
          rules: [
            rule('r1', 'red', 'all', [cond('CT-01.BASIN_T', '>', 33)]),
            rule('r2', 'yellow', 'all', [cond('CT-01.BASIN_T', '>', 31)]),
          ],
        },
        {
          id: 'l4', label: 'AHU-01 溫濕度', fallback: 'green',
          rules: [
            rule('r1', 'red', 'any', [cond('AHU-01.RH', 'between_out', 35, 55)]),
            rule('r2', 'yellow', 'any', [cond('AHU-01.SUP_T', 'between_out', 21, 23)]),
          ],
        },
        { id: 'l5', label: 'AHU-03 送風', fallback: 'green', rules: [rule('r1', 'red', 'any', [cond('AHU-03.SUP_T', '>', 25)])] },
        {
          id: 'l6', label: '壓縮空氣', fallback: 'green',
          rules: [
            rule('r1', 'red', 'any', [cond('AIR-01.PRESS', '<', 6.3)]),
            rule('r2', 'yellow', 'any', [cond('AIR-01.PRESS', '<', 6.6)]),
          ],
        },
        {
          id: 'l7', label: 'UPS-01 電池', fallback: 'green',
          rules: [
            rule('r1', 'red', 'any', [cond('UPS-01.BATT', '<', 85)]),
            rule('r2', 'yellow', 'any', [cond('UPS-01.BATT', '<', 92)]),
          ],
        },
        {
          id: 'l8', label: '廢水 pH', fallback: 'green',
          rules: [
            rule('r1', 'red', 'any', [cond('WWT-01.PH', 'between_out', 6, 8.5)]),
            rule('r2', 'yellow', 'any', [cond('WWT-01.PH', 'between_out', 6.5, 8)]),
          ],
        },
      ],
    },
  };
}
