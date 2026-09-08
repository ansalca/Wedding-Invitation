import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import WeddingInvitation from './WeddingInvitation.jsx';

/* The admin dashboard lives at /#admin (or /admin when the host rewrites
   the path). It renders instead of the invitation — same bundle, no extra
   router, and the code is split so guests never download it. */
const AdminRsvp = lazy(() => import('./components/AdminRsvp.jsx'));

function isAdminRoute() {
  try {
    if (window.location.hash === '#admin') return true;
    const path = window.location.pathname.replace(/\/+$/, '');
    return path.endsWith('/admin');
  } catch {
    return false;
  }
}

const App = isAdminRoute() ? (
  <Suspense fallback={<div className="admin-boot" aria-label="Loading" />}>
    <AdminRsvp />
  </Suspense>
) : (
  <WeddingInvitation />
);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {App}
  </React.StrictMode>
);
