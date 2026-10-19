import { SITES } from '../catalog/catalog';
import { useSystems } from '../state/SystemsContext';

/** 單選廠區與情境（摘要、Tag 清單、燈號積木用） */
export function SiteSystemSelect({ site, system, onChange }: {
  site: string;
  system: string;
  onChange: (patch: { site?: string; system?: string }) => void;
}) {
  const { systems } = useSystems();
  return (
    <section className="be__sec">
      <h3>資料來源 <small>這個積木顯示哪個廠區的哪個情境</small></h3>
      <div className="be__pair">
        <div className="ef">
          <label htmlFor="sel-site">廠區</label>
          <select id="sel-site" className="ef__input ef__input--plain" value={site} onChange={(e) => onChange({ site: e.target.value })}>
            {SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="ef">
          <label htmlFor="sel-system">情境</label>
          <select id="sel-system" className="ef__input ef__input--plain" value={system} onChange={(e) => onChange({ system: e.target.value })}>
            {systems.map((s) => <option key={s.id} value={s.id}>{s.name}{s.short ? ` ${s.short}` : ''}</option>)}
          </select>
        </div>
      </div>
    </section>
  );
}

/** 複選廠區與情境（燈號牆積木用），至少保留一個 */
export function SiteSystemChecks({ sites, systems, onChange }: {
  sites: string[];
  systems: string[];
  onChange: (patch: { sites?: string[]; systems?: string[] }) => void;
}) {
  const all = useSystems().systems;
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? (list.length > 1 ? list.filter((x) => x !== id) : list) : [...list, id];
  return (
    <section className="be__sec">
      <h3>顯示範圍 <small>燈號牆的列是廠區、欄是情境，至少各選一個</small></h3>
      <fieldset className="checks">
        <legend>廠區（列）</legend>
        {SITES.map((s) => (
          <label key={s.id}><input type="checkbox" checked={sites.includes(s.id)} onChange={() => onChange({ sites: toggle(sites, s.id) })} /> {s.name}</label>
        ))}
      </fieldset>
      <fieldset className="checks">
        <legend>情境（欄）</legend>
        {all.map((s) => (
          <label key={s.id}><input type="checkbox" checked={systems.includes(s.id)} onChange={() => onChange({ systems: toggle(systems, s.id) })} /> {s.name}</label>
        ))}
      </fieldset>
    </section>
  );
}
