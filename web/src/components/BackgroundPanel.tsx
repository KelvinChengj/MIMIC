import { useRef, useState, type ChangeEvent } from 'react';
import { backgroundUrl, BUILTIN_BACKGROUNDS } from '../blocks/backgrounds';
import type { PageBackground } from '../types';

const TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
/** 展示版存在瀏覽器（localStorage 約 5 MB），圖檔限制小一點；正式版改存後端 */
const MAX_BYTES = 1.5 * 1024 * 1024;

/** 讀圖檔：轉成 data URL 並取得原始寬高（SVG 沒寫寬高時用 1200 × 720）；太大或太小時換算成 1200 寬 */
function readImage(file: File): Promise<PageBackground> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('讀取圖檔失敗'));
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new Error('無法顯示這個圖檔'));
      img.onload = () => {
        let w = img.naturalWidth || 1200;
        let h = img.naturalHeight || 720;
        if (w > 2400 || w < 400) { h = Math.round((h * 1200) / w); w = 1200; }
        resolve({ src, width: w, height: h, name: file.name, opacity: 1 });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 編輯模式的「底圖」區：上傳平面圖或套用範本，調整透明度、更換、移除。
 * 有底圖時頁面變成地圖型 MIMIC：燈號座標以底圖為準，檢視時圖和燈號一起縮放。
 */
export function BackgroundPanel({ background, onChange }: { background?: PageBackground; onChange: (bg: PageBackground | undefined) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError('請選 PNG、JPG、SVG 或 WebP 圖檔');
    if (f.size > MAX_BYTES) return setError(`圖檔 ${(f.size / 1024 / 1024).toFixed(1)} MB，展示版限 1.5 MB 以內`);
    try {
      const bg = await readImage(f);
      setError('');
      onChange({ ...bg, opacity: background?.opacity ?? 1 });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="bgpanel" aria-label="底圖">
      <h3>底圖 <small>地圖型 MIMIC</small></h3>
      <input ref={file} type="file" accept=".png,.jpg,.jpeg,.svg,.webp" hidden aria-label="選擇底圖圖檔" onChange={pick} />
      {background ? (
        <>
          <img className="bgpanel__thumb" src={backgroundUrl(background.src)} alt="" />
          <p className="bgpanel__name">{background.name ?? '底圖'}<small>{background.width} × {background.height}</small></p>
          <label className="bgpanel__range">
            <span>底圖透明度 <b>{Math.round((background.opacity ?? 1) * 100)}%</b></span>
            <input
              type="range" min={20} max={100} step={5} aria-label="底圖透明度"
              value={Math.round((background.opacity ?? 1) * 100)}
              onChange={(e) => onChange({ ...background, opacity: Number(e.target.value) / 100 })}
            />
          </label>
          <div className="bgpanel__actions">
            <button className="btn btn--xs" onClick={() => file.current?.click()}>更換圖檔</button>
            <button className={`btn btn--xs ${confirm ? 'btn--danger' : ''}`} onClick={() => (confirm ? (onChange(undefined), setConfirm(false)) : setConfirm(true))} onBlur={() => setConfirm(false)}>
              {confirm ? '確定移除？' : '移除底圖'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="bgpanel__hint">放上無塵室平面圖，再把小尺寸燈號擺到各區塊。</p>
          <div className="bgpanel__actions">
            <button className="btn btn--xs" onClick={() => file.current?.click()}>上傳圖檔</button>
            {BUILTIN_BACKGROUNDS.map((bg) => (
              <button key={bg.src} className="btn btn--xs" onClick={() => onChange({ ...bg, opacity: 1 })}>套用範本：無塵室示意圖</button>
            ))}
          </div>
        </>
      )}
      {error && <p className="bgpanel__error" role="alert">{error}</p>}
      <p className="bgpanel__note">PNG、JPG、SVG，1.5 MB 以內。展示版存在瀏覽器；正式版存後端並控管權限。</p>
    </section>
  );
}
