import { lazy, Suspense } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { PrinterProvider } from './lib/printer';
import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import Loading from './components/Loading';
import About from './pages/About';
import Featured from './pages/Featured';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import Products from './pages/Products';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Admin screens are split out so public visitors don't download them.
const Inventory = lazy(() => import('./pages/admin/Inventory'));
const Labels = lazy(() => import('./pages/admin/Labels'));
const ManageProducts = lazy(() => import('./pages/admin/ManageProducts'));
const ManageRecipes = lazy(() => import('./pages/admin/ManageRecipes'));
const ManageIngredients = lazy(() => import('./pages/admin/ManageIngredients'));
const ManageFeatured = lazy(() => import('./pages/admin/ManageFeatured'));
const ManageAbout = lazy(() => import('./pages/admin/ManageAbout'));

function AdminShell() {
  return (
    <PrinterProvider>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </PrinterProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<About />} />
            <Route path="featured" element={<Featured />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="recipes/:slug" element={<RecipeDetail />} />
            <Route path="products" element={<Products />} />
            <Route path="login" element={<Login />} />
            <Route path="admin" element={<RequireAdmin />}>
              <Route element={<AdminShell />}>
                <Route index element={<Inventory />} />
                <Route path="labels" element={<Labels />} />
                <Route path="products" element={<ManageProducts />} />
                <Route path="recipes" element={<ManageRecipes />} />
                <Route path="ingredients" element={<ManageIngredients />} />
                <Route path="featured" element={<ManageFeatured />} />
                <Route path="about" element={<ManageAbout />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
