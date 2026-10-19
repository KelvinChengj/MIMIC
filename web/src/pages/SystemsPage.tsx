import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SITES } from '../catalog/catalog';
import { formatClock } from '../components/Topbar';
import { PlusIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageParts';
import { useFdm } from '../state/FdmContext';
import { groupRefs, useSystemRefs } from '../state/derived';
import { useSystems } from '../state/SystemsContext';
import { useUi } from '../state/UiContext';

const KIND = { open: '開啟網頁', refresh: '按重新整理', check: '檢查新加入的 Tag' } as const;

export const formatDate = (ms?: number) => {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${formatClock(ms).slice(0, 5)}`;
};

/** /scenarios：情境清單。情境 = 各廠區包含哪些 Tag，由情境負責人維護 */
export function SystemsPage() {
  const { systems } = useSystems();
  const refs = useSystemRefs();
  const { stats } = useFdm();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title="情境管理"
        sub="情境負責人維護各廠區包含哪些 Tag"
        actions={<button className="btn btn--primary" onClick={() => setAdding(true)}><PlusIcon size={16} /> 新增情境</button>}
      />

      <section className="card sysnote">
        <ul>
          <li><b>引用方式</b>：燈號積木選「整個情境」時只記住「廠區 + 情境代號」，不複製 Tag 清單。這裡改了，所有引用的積木一起更新。</li>
          <li><b>燈號</b>：情境內任一 Tag 為 OOS 亮紅；否則任一為 OOC 亮黃；每次取值後集中算一次，所有積木共用。</li>
          <li>
            <b>FDM 取值</b>：只在開啟網頁與按重新整理時，把所有情境與燈號積木需要的 Tag 去除重複後合成一次批次請求。
            最近一次：{KIND[stats.lastKind]}，<span className="mono">{formatClock(stats.lastAt)}</span>，{stats.lastTags} 個 Tag。
          </li>
        </ul>
      </section>

      <section className="card card--flush">
        <table className="explore-table systems-table">
          <thead>
            <tr>
              <th>情境</th>
              <th>負責人</th>
              {SITES.map((s) => <th key={s.id} className="num">{s.name}</th>)}
              <th className="num">引用頁面</th>
              <th>最後修改</th>
            </tr>
          </thead>
          <tbody>
            {systems.map((sys) => (
              <tr key={sys.id} onClick={() => navigate(`/scenarios/${sys.id}`)}>
                <td>
                  <Link to={`/scenarios/${sys.id}`} onClick={(e) => e.stopPropagation()}><b>{sys.name}</b></Link>
                  {sys.short && <code className="systems-table__short">{sys.short}</code>}
                  {sys.custom && <span className="systems-table__new">新增</span>}
                </td>
                <td>{sys.owner || '—'}</td>
                {SITES.map((s) => <td key={s.id} className="num">{sys.tags[s.id]?.length ?? 0}</td>)}
                <td className="num">{groupRefs(refs.get(sys.id) ?? []).length}</td>
                <td>{formatDate(sys.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {adding && <NewSystemDialog onClose={() => setAdding(false)} />}
    </>
  );
}

function NewSystemDialog({ onClose }: { onClose: () => void }) {
  const { createSystem } = useSystems();
  const { showToast } = useUi();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = createSystem(name, short);
    onClose();
    showToast('已建立情境，接著加入各廠區的 Tag');
    navigate(`/scenarios/${id}`);
  };
  return (
    <Modal title="新增情境" size="sm" onClose={onClose}>
      <form className="newpage" onSubmit={submit}>
        <div className="ef">
          <label htmlFor="ns-name">情境名稱</label>
          <input id="ns-name" className="ef__input ef__input--plain" autoFocus value={name} maxLength={20} placeholder="例：純水回收" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="ef">
          <label htmlFor="ns-short">代號</label>
          <input id="ns-short" className="ef__input" value={short} maxLength={8} placeholder="例：RCL" onChange={(e) => setShort(e.target.value)} />
        </div>
        <div className="newpage__actions">
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="submit" className="btn btn--primary" disabled={!name.trim()}>建立情境</button>
        </div>
      </form>
    </Modal>
  );
}
