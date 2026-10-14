import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { NotFound } from './components/PageParts';
import { DrillRoute } from './pages/DrillPage';
import { EditRoute } from './pages/EditPage';
import { ExplorePage } from './pages/ExplorePage';
import { PageRoute } from './pages/PageRoute';
import { FavoritesProvider } from './state/FavoritesContext';
import { FdmProvider } from './state/FdmContext';
import { RulesProvider } from './state/RulesContext';
import { UiProvider } from './state/UiContext';

/** 單一檔案的線上 Demo 沒有伺服器可做路徑 fallback，改用 #/ 形式的網址 */
const Router = import.meta.env.VITE_HASH ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <UiProvider>
        <FdmProvider>
          <RulesProvider>
            <FavoritesProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Navigate to="/p/overview" replace />} />
                  <Route path="/p/:slug" element={<PageRoute />} />
                  <Route path="/p/:slug/edit" element={<EditRoute />} />
                  <Route path="/p/:slug/:site/:system" element={<DrillRoute />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </FavoritesProvider>
          </RulesProvider>
        </FdmProvider>
      </UiProvider>
    </Router>
  );
}
