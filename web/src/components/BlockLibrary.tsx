import { blockLibrary } from '../blocks/registry';
import type { Layer } from '../types';
import { PlusIcon } from './Icons';

/** 積木庫：列出所有已註冊的積木種類，點一下就加到畫布 */
export function BlockLibrary({ layer, onAdd }: { layer: Layer; onAdd: (type: string) => void }) {
  return (
    <aside className="library" aria-label="積木庫">
      <h2>積木庫</h2>
      <p className="library__hint">點一下加到畫布，再拖曳擺放。</p>
      {blockLibrary(layer).map((g) => (
        <section key={g.category} aria-label={g.category}>
          <h3>{g.category}</h3>
          <ul>
            {g.items.map((d) => (
              <li key={d.type}>
                <button className="lib-item" onClick={() => onAdd(d.type)} aria-label={`新增${d.label}積木：${d.description}`}>
                  <span className="lib-item__icon">{d.icon}</span>
                  <span className="lib-item__text"><b>{d.label}</b><small>{d.description}</small></span>
                  <PlusIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}
