import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { registerBuiltinBlocks } from './blocks';
import { Layout } from './components/Layout';
import { NotFound } from './components/PageParts';
import { DrillRoute } from './pages/DrillPage';
import { EditRoute } from './pages/EditRoute';
import { LampDrillRoute } from './pages/LampDrillPage';
import { ExplorePage } from './pages/ExplorePage';
import { PageRoute } from './pages/PageRoute';
import { SystemEditRoute } from './pages/SystemEditPage';
import { SystemsPage } from './pages/SystemsPage';
import { FavoritesProvider } from './state/FavoritesContext';
import { FdmProvider } from './state/FdmContext';
import { SystemsProvider } from './state/SystemsContext';
import { UiProvider } from './state/UiContext';
import { UserPagesProvider } from './state/UserPagesContext';

registerBuiltinBlocks();

/** 單一檔案的線上 Demo 沒有伺服器可做路徑 fallback，改用 #/ 形式的網址 */
const Router = import.meta.env.VITE_HASH ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <UiProvider>
        <SystemsProvider>
          <UserPagesProvider>
            {/* FDM 取值要知道「需要哪些 Tag」，所以放在情境定義與頁面之內 */}
            <FdmProvider>
              <FavoritesProvider>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<Navigate to="/p/overview" replace />} />
                    <Route path="/p/:slug" element={<PageRoute />} />
                    <Route path="/p/:slug/edit" element={<EditRoute />} />
                    <Route path="/p/:slug/b/:blockId" element={<LampDrillRoute />} />
                    <Route path="/p/:slug/:site/:system" element={<DrillRoute />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/scenarios" element={<SystemsPage />} />
                    <Route path="/scenarios/:id" element={<SystemEditRoute />} />
                    {/* 舊網址（改名「情境」之前） */}
                    <Route path="/systems/*" element={<Navigate to="/scenarios" replace />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </FavoritesProvider>
            </FdmProvider>
          </UserPagesProvider>
        </SystemsProvider>
      </UiProvider>
    </Router>
  );
}
