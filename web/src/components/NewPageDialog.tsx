import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../state/FavoritesContext';
import { useUi } from '../state/UiContext';
import { useUserPages } from '../state/UserPagesContext';
import { LAYER_META } from './LayerChip';
import { Modal } from './Modal';
import { PHASE_OPTIONS, SYSTEM_OPTIONS } from '../catalog/catalog';
import type { Layer } from '../types';

const NEW_GROUP = '__new__';

export function NewPageDialog() {
  const { newPage, closeNewPage, showToast } = useUi();
  const { groups, addGroup, addSlug } = useFavorites();
  const { createPage } = useUserPages();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState(newPage?.groupId ?? groups[0]?.id ?? NEW_GROUP);
  const [groupName, setGroupName] = useState('');
  const [layer, setLayer] = useState<Layer>('duty');
  const [system, setSystem] = useState('');
  const [phase, setPhase] = useState('');
  const ready = !!system && !!phase;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const slug = createPage(title, layer, { system, phase });
    const gid = groupId === NEW_GROUP || !groups.some((g) => g.id === groupId) ? addGroup(groupName || '我的頁面') : groupId;
    addSlug(gid, slug);
    closeNewPage();
    showToast('已建立空白頁面，從左側積木庫加入積木');
    navigate(`/p/${slug}/edit`);
  };

  return (
    <Modal title="新增頁面" size="sm" onClose={closeNewPage}>
      <form className="newpage" onSubmit={submit}>
        <p className="newpage__hint">建立後會進入空白畫布，可以自由新增積木。</p>
        <fieldset className="layer-pick">
          <legend>頁面層級</legend>
          {(['duty', 'command'] as Layer[]).map((l) => (
            <label key={l} className={layer === l ? 'is-on' : ''}>
              <input type="radio" name="np-layer" value={l} checked={layer === l} onChange={() => setLayer(l)} />
              <b>{LAYER_META[l].label}</b>
              <small>{LAYER_META[l].hint}</small>
            </label>
          ))}
        </fieldset>
        <div className="ef">
          <label htmlFor="np-title">頁面名稱</label>
          <input id="np-title" className="ef__input ef__input--plain" autoFocus value={title} maxLength={40} placeholder="例：F18P2 超純水值班" onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="be__pair">
          <div className="ef">
            <label htmlFor="np-system">System <small className="req">必填</small></label>
            <select id="np-system" className="ef__input ef__input--plain" required value={system} onChange={(e) => setSystem(e.target.value)}>
              <option value="" disabled>請選擇系統</option>
              {SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="ef">
            <label htmlFor="np-phase">Phase <small className="req">必填</small></label>
            <select id="np-phase" className="ef__input ef__input--plain" required value={phase} onChange={(e) => setPhase(e.target.value)}>
              <option value="" disabled>請選擇廠區</option>
              {PHASE_OPTIONS.map((s) => <option key={s} value={s}>{s === 'F18A' ? 'F18A（全廠）' : s}</option>)}
            </select>
          </div>
        </div>
        <div className="ef">
          <label htmlFor="np-group">放在哪個分類</label>
          <select id="np-group" className="ef__input ef__input--plain" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            <option value={NEW_GROUP}>＋ 新分類…</option>
          </select>
        </div>
        {(groupId === NEW_GROUP || groups.length === 0) && (
          <div className="ef">
            <label htmlFor="np-gname">新分類名稱</label>
            <input id="np-gname" className="ef__input ef__input--plain" value={groupName} maxLength={20} placeholder="例：我的頁面" onChange={(e) => setGroupName(e.target.value)} />
          </div>
        )}
        <div className="newpage__actions">
          <button type="button" className="btn" onClick={closeNewPage}>取消</button>
          <button type="submit" className="btn btn--primary" disabled={!ready} title={ready ? undefined : '請先選擇 System 與 Phase'}>建立頁面</button>
        </div>
      </form>
    </Modal>
  );
}
