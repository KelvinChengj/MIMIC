/** 積木庫裡每種積木的小圖示（單色線條 + 狀態色塊） */
const svg = (children: React.ReactNode) => (
  <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">{children}</svg>
);

export const LampIcon = () =>
  svg(<><rect x="3" y="3" width="26" height="26" rx="6" fill="#fff" stroke="#cfccc6" /><circle cx="16" cy="14" r="6" fill="#4b7f4a" /><path d="m13.2 14 2 2 3.6-3.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 24h12" stroke="#9aa0a8" strokeWidth="1.6" strokeLinecap="round" /></>);

export const WallIcon = () =>
  svg(<><rect x="3" y="3" width="12" height="12" rx="3" fill="#f8e6e3" stroke="#b3342a" /><rect x="17" y="3" width="12" height="12" rx="3" fill="#fff" stroke="#4b7f4a" /><rect x="3" y="17" width="12" height="12" rx="3" fill="#fff" stroke="#4b7f4a" /><rect x="17" y="17" width="12" height="12" rx="3" fill="#fbf3d6" stroke="#d9a21f" /></>);

export const SummaryIcon = () =>
  svg(<><rect x="3" y="5" width="26" height="22" rx="5" fill="#fdf6f5" stroke="#e2aaa4" /><circle cx="10.5" cy="16" r="4.5" fill="#b3342a" /><path d="M18 12h8M18 16h8M18 20h5" stroke="#6b7280" strokeWidth="1.6" strokeLinecap="round" /></>);

export const TagsIcon = () =>
  svg(<><rect x="3" y="5" width="26" height="22" rx="4" fill="#fff" stroke="#cfccc6" /><path d="M3 11h26M3 17h26M3 23h26" stroke="#e4e2de" /><circle cx="22" cy="14" r="2" fill="#b3342a" /><circle cx="22" cy="20" r="2" fill="#d9a21f" /><path d="M7 14h8M7 20h6" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" /></>);

export const TextIcon = () =>
  svg(<><rect x="3" y="3" width="26" height="26" rx="6" fill="#fff" stroke="#cfccc6" strokeDasharray="3 3" /><path d="M10 11h12M16 11v11" stroke="#2b4764" strokeWidth="2.2" strokeLinecap="round" /></>);
