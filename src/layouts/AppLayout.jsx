import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from '../components/layout/Sidebar';
import Navbar  from '../components/layout/Navbar';
import { toggleSidebar } from '../store/slices/uiSlice';

const SIDEBAR_FULL = 260;
const SIDEBAR_MINI = 68;

export default function AppLayout() {
  const dispatch    = useDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const [isDesktop,  setIsDesktop]  = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
