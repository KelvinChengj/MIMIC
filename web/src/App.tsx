import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { registerBuiltinBlocks } from './blocks';
import { Layout } from './components/Layout';
import { NotFound } from './components/PageParts';
import { EditRoute } from './pages/EditRoute';
import { LampDrillRoute, LegacyDrillRoute } from './pages/LampDrillPage';
import { ExplorePage } from './pages/ExplorePage';
import { PageRoute } from './pages/PageRoute';
import { VTagDrillRoute, VTagsPage } from './pages/VTagsPage';
import { FavoritesProvider } from './state/FavoritesContext';
import { FdmProvider } from './state/FdmContext';
import { UiProvider } from './state/UiContext';
import { UserPagesProvider } from './state/UserPagesContext';

registerBuiltinBlocks();

/** 單一檔案的線上 Demo 沒有伺服器可做路徑 fallback，改用 #/ 形式的網址 */
const Router = import.meta.env.VITE_HASH ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <UiProvider>
        <UserPagesProvider>
          {/* FDM 取值要知道「頁面用到哪些 virtual tag」，所以放在頁面之內 */}
          <FdmProvider>
            <FavoritesProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Navigate to="/p/overview" replace />} />
                  <Route path="/p/:slug" element={<PageRoute />} />
                  <Route path="/p/:slug/edit" element={<EditRoute />} />
                  <Route path="/p/:slug/b/:blockId" element={<LampDrillRoute />} />
                  <Route path="/p/:slug/:site/:system" element={<LegacyDrillRoute />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/vtags" element={<VTagsPage />} />
                  <Route path="/vtags/:site/:name" element={<VTagDrillRoute />} />
                  {/* 舊網址（系統管理 / 情境管理） */}
                  <Route path="/systems/*" element={<Navigate to="/vtags" replace />} />
                  <Route path="/scenarios/*" element={<Navigate to="/vtags" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </FavoritesProvider>
          </FdmProvider>
        </UserPagesProvider>
      </UiProvider>
    </Router>
  );
}
