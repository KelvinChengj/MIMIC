import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../state/FavoritesContext';
import { useUi } from '../state/UiContext';
import { useUserPages } from '../state/UserPagesContext';
import { Modal } from './Modal';

const NEW_GROUP = '__new__';

export function NewPageDialog() {
  const { newPage, closeNewPage, showToast } = useUi();
  const { groups, addGroup, addSlug } = useFavorites();
  const { createPage } = useUserPages();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState(newPage?.groupId ?? groups[0]?.id ?? NEW_GROUP);
  const [groupName, setGroupName] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const slug = createPage(title);
    const gid = groupId === NEW_GROUP || !groups.some((g) => g.id === groupId) ? addGroup(groupName || '我的頁面') : groupId;
    addSlug(gid, slug);
    closeNewPage();
    showToast('已建立空白頁面，按「＋ 燈號積木」開始');
    navigate(`/p/${slug}/edit`);
  };

  return (
    <Modal title="新增頁面" size="sm" onClose={closeNewPage}>
      <form className="newpage" onSubmit={submit}>
        <p className="newpage__hint">建立後會進入空白畫布，可以自由新增燈號積木。</p>
        <div className="ef">
          <label htmlFor="np-title">頁面名稱</label>
          <input id="np-title" className="ef__input ef__input--plain" autoFocus value={title} maxLength={40} placeholder="例：F18P2 超純水值班" onChange={(e) => setTitle(e.target.value)} />
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
          <button type="submit" className="btn btn--primary">建立頁面</button>
        </div>
      </form>
    </Modal>
  );
}
