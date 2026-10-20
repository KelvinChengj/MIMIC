import type { Layer } from '../types';

/** 頁面層級的名稱與說明 */
export const LAYER_META: Record<Layer, { label: string; hint: string; first: string; firstLabel: string }> = {
  duty: { label: '值班情境', hint: '燈號 = virtual tag，點燈號下鑽 InSQL tag 清單', first: 'lamp', firstLabel: '新增第一個燈號' },
  command: { label: '戰情指揮官', hint: '每顆燈代表一個值班情境，點燈號進入該值班情境', first: 'duty', firstLabel: '新增第一個值班情境燈號' },
};

export function LayerChip({ layer }: { layer: Layer }) {
  return <span className={`layer-chip layer-chip--${layer}`}>{LAYER_META[layer].label}</span>;
}

