import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabaseConfigured } from '../lib/supabase';
import UpdatePrompt from './UpdatePrompt';

const PUBLIC_NAV = [
  { to: '/', label: 'About Us', end: true },
  { to: '/featured', label: 'Featured This Week' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/recipes', label: 'Recipes & Ingredients' },
  { to: '/products', label: 'Products' },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Inventory', end: true },
  { to: '/admin/labels', label: 'Labels' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/recipes', label: 'Recipes' },
  { to: '/admin/ingredients', label: 'Ingredients' },
  { to: '/admin/featured', label: 'Featured' },
  { to: '/admin/timeline', label: 'Timeline' },
  { to: '/admin/about', label: 'About page' },
];

export default function Layout() {
  const { session, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const inAdmin = loc.pathname.startsWith('/admin');

  return (
    <div className="app">
      <header className="site-header">
        <div className="container header-row">
          <Link to="/" className="brand" onClick={() => setOpen(false)}>
            <img src="/favicon.svg" alt="" width={36} height={36} />
            <span>Kathryn&rsquo;s Bakery</span>
          </Link>
          <button className="menu-btn" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((o) => !o)}>
            ☰
          </button>
          <nav className={`main-nav ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
            {PUBLIC_NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                {n.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className="admin-link">
                Admin
              </NavLink>
            )}
          </nav>
        </div>
        {isAdmin && inAdmin && (
          <nav className="admin-nav">
            <div className="container">
              {ADMIN_NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}>
                  {n.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      {!supabaseConfigured && (
        <div className="container">
          <p className="alert warn">
            Supabase isn&rsquo;t configured. Copy <code>.env.example</code> to <code>.env.local</code> and set{' '}
            <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      )}

      <main className="container main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-row">
          <span>© {new Date().getFullYear()} Kathryn&rsquo;s Bakery</span>
          {session ? (
            <button className="link" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <Link to="/login">Staff sign in</Link>
          )}
        </div>
      </footer>
      <UpdatePrompt />
    </div>
  );
}
