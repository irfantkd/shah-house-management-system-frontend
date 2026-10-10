import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiLayoutGridLine,    RiLayoutGridFill,
  RiCalendarCheckLine, RiCalendarCheckFill,
  RiBankCardLine,      RiBankCardFill,
  RiCarLine,           RiCarFill,
  RiAppsLine,
} from 'react-icons/ri';

const haptic = () => { try { navigator.vibrate?.(5); } catch { /**/ } };

const TABS = [
  { label: 'Home',     icon: RiLayoutGridLine,    fill: RiLayoutGridFill,    path: '/',            end: true  },
  { label: 'Tasks',    icon: RiCalendarCheckLine, fill: RiCalendarCheckFill, path: '/maintenance', end: false },
  { label: 'Expenses', icon: RiBankCardLine,       fill: RiBankCardFill,      path: '/expenses',    end: false },
  { label: 'Fleet',    icon: RiCarLine,            fill: RiCarFill,           path: '/cars',        end: false },
];

const GOLD        = '#e5a800';
const INACTIVE    = 'rgba(255,255,255,0.38)';
const INACTIVE_LB = 'rgba(255,255,255,0.24)';

export default function MobileBottomNav({ onMenuOpen }) {
  const { pathname } = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'linear-gradient(180deg, rgba(8,18,40,0.95) 0%, rgba(4,10,22,0.99) 100%)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -24px 48px rgba(0,0,0,0.55), 0 -1px 0 rgba(0,0,0,0.40)',
      }}
    >
      {/* Gold centre-shimmer border at top — brand signature */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(229,168,0,0.25) 20%, rgba(229,168,0,0.60) 50%, rgba(229,168,0,0.25) 80%, transparent 100%)',
        }}
      />

      <div className="flex items-stretch h-18">

        {TABS.map(({ label, icon: Icon, fill: FillIcon, path, end }) => {
          const isActive = end ? pathname === path : pathname.startsWith(path);
          const TabIcon  = isActive ? FillIcon : Icon;

          return (
            <NavLink
              key={path}
              to={path}
              end={end}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 relative select-none"
              onPointerDown={haptic}
            >
              {/* Icon chip: pill lives around the icon only, slides via layoutId */}
              <div
                className="relative flex items-center justify-center"
                style={{ width: 52, height: 30 }}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-tab-chip"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'rgba(229,168,0,0.13)',
                        border: '1px solid rgba(229,168,0,0.30)',
                        boxShadow:
                          '0 0 20px rgba(229,168,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
                      }}
                      initial={{ opacity: 0, scale: 0.80 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.80 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                    />
                  )}
                </AnimatePresence>

                <motion.div
                  animate={{ scale: isActive ? 1.06 : 1 }}
                  transition={{ type: 'spring', stiffness: 440, damping: 30 }}
                  whileTap={{ scale: 0.74 }}
                  className="relative z-10"
                >
                  <TabIcon
                    style={{
                      width: 22,
                      height: 22,
                      color: isActive ? GOLD : INACTIVE,
                      filter: isActive
                        ? 'drop-shadow(0 0 9px rgba(229,168,0,0.60))'
                        : 'none',
                      transition: 'color 0.18s ease, filter 0.18s ease',
                    }}
                  />
                </motion.div>
              </div>

              {/* Label — sits below the chip, always visible */}
              <motion.span
                animate={{ color: isActive ? GOLD : INACTIVE_LB }}
                transition={{ duration: 0.18 }}
                className="text-[10.5px] font-semibold leading-none"
                style={{ letterSpacing: '0.025em' }}
              >
                {label}
              </motion.span>
            </NavLink>
          );
        })}

        {/* More / Menu button — same layout, no chip */}
        <motion.button
          type="button"
          onClick={onMenuOpen}
          whileTap={{ scale: 0.74 }}
          className="flex-1 flex flex-col items-center justify-center gap-1.5 relative select-none"
          onPointerDown={haptic}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ width: 52, height: 30 }}
          >
            <RiAppsLine
              style={{ width: 22, height: 22, color: INACTIVE }}
            />
          </div>
          <span
            className="text-[10.5px] font-semibold leading-none"
            style={{ color: INACTIVE_LB, letterSpacing: '0.025em' }}
          >
            More
          </span>
        </motion.button>

      </div>
    </nav>
  );
}
