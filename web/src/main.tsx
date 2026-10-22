import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { resetDemoStorage } from './state/storage';
import './styles.css';

// 網址帶 reset=1（例如 /p/overview?reset=1 或 #/p/overview?reset=1）：先清除瀏覽器裡的設定，呈現原始展示畫面
if (/[?&]reset=1\b/.test(window.location.href)) {
  resetDemoStorage();
  window.history.replaceState(null, '', window.location.href.replace(/([?&])reset=1\b&?/, '$1').replace(/[?&]$/, ''));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
