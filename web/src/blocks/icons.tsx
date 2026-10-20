/** 積木庫裡每種積木的小圖示（單色線條 + 狀態色塊） */
const svg = (children: React.ReactNode) => (
  <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">{children}</svg>
);

export const LampIcon = () =>
  svg(<><rect x="3" y="3" width="26" height="26" rx="6" fill="#fff" stroke="#cfccc6" /><circle cx="16" cy="14" r="6" fill="#4b7f4a" /><path d="m13.2 14 2 2 3.6-3.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 24h12" stroke="#9aa0a8" strokeWidth="1.6" strokeLinecap="round" /></>);

/** 值班情境燈號：一顆燈代表一整頁燈號 */
export const DutyIcon = () =>
  svg(<><rect x="3" y="3" width="12" height="12" rx="3" fill="#f8e6e3" stroke="#b3342a" /><rect x="17" y="3" width="12" height="12" rx="3" fill="#fff" stroke="#4b7f4a" /><rect x="3" y="17" width="12" height="12" rx="3" fill="#fff" stroke="#4b7f4a" /><rect x="17" y="17" width="12" height="12" rx="3" fill="#fbf3d6" stroke="#d9a21f" /></>);

export const TextIcon = () =>
  svg(<><rect x="3" y="3" width="26" height="26" rx="6" fill="#fff" stroke="#cfccc6" strokeDasharray="3 3" /><path d="M10 11h12M16 11v11" stroke="#2b4764" strokeWidth="2.2" strokeLinecap="round" /></>);
