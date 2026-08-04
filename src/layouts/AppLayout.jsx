import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from '../components/layout/Sidebar';
import Navbar  from '../components/layout/Navbar';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import { setProperties } from '../store/slices/propertiesSlice';
import { selectCurrentPropertyId } from '../store/slices/propertiesSlice';
import { useGetQuery, usePostMutation } from '../api/apiSlice';
import { registerServiceWorker, subscribeToPush, requestNotificationPermission } from '../utils/notificationUtils';

const SIDEBAR_FULL = 260;
const SIDEBAR_MINI = 68;

export default function AppLayout() {
  const dispatch    = useDispatch();
  const isAuth      = useSelector(selectIsAuthenticated);
  const propertyId  = useSelector(selectCurrentPropertyId);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);
  const [isDesktop,   setIsDesktop]   = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const pushSetupDone = useRef(false);

  const [subscribeMut]  = usePostMutation();
  const [generateMut]   = usePostMutation();

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { data: propertiesList } = useGetQuery({ path: '/properties' }, { skip: !isAuth });

  useEffect(() => {
    if (propertiesList) dispatch(setProperties(propertiesList));
  }, [propertiesList, dispatch]);

  /* ── Service Worker + Push setup (runs once after auth + propertyId ready) */
  useEffect(() => {
    if (!isAuth || !propertyId || pushSetupDone.current) return;
    pushSetupDone.current = true;

    (async () => {
      /* 1. Register SW */
      const swReg = await registerServiceWorker();

      /* 2. Generate fresh notifications from DB scan */
      try {
        await generateMut({ path: `/notifications/generate?propertyId=${propertyId}`, body: {} }).unwrap();
      } catch { /* non-critical */ }

      /* 3. Request browser notification permission */
      const permission = await requestNotificationPermission();
      if (permission !== 'granted' || !swReg) return;

      /* 4. Get VAPID key and subscribe to push */
      try {
        const vapidRes = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/vapid-public-key`,
          { credentials: 'include' },
        );
        if (!vapidRes.ok) return;
        const { data: vapidKey } = await vapidRes.json();
        const sub = await subscribeToPush(vapidKey);
        if (!sub) return;
        await subscribeMut({
          path: '/notifications/push-subscribe',
          body: { subscription: sub.toJSON(), propertyId },
        }).unwrap();
      } catch { /* push setup non-critical — app still works without it */ }
    })();
  }, [isAuth, propertyId]);

  const sidebarWidth = collapsed ? SIDEBAR_MINI : SIDEBAR_FULL;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div
        className="min-h-screen flex flex-col"
        style={{
          paddingLeft: isDesktop ? sidebarWidth : 0,
          transition: 'padding-left 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-350 mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
