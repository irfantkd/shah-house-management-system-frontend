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
const INACTIVE    = 'rgba(255,255,255,0.40)';
const INACTIVE_LB = 'rgba(255,255,255,0.26)';

export default function MobileBottomNav({ onMenuOpen }) {
  const { pathname } = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'linear-gradient(180deg, #0d2248 0%, #091830 100%)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        /* Single inset gold line at top + depth shadow underneath — no extra divs */
        boxShadow:
          'inset 0 1px 0 rgba(229,168,0,0.48), 0 -12px 32px rgba(0,0,0,0.32)',
      }}
    >
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
              {/* Active chip — clean flat pill, slides between tabs */}
              <div
                className="relative flex items-center justify-center"
                style={{ width: 54, height: 32 }}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-tab-chip"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'rgba(229,168,0,0.11)',
                        border: '1px solid rgba(229,168,0,0.36)',
                        boxShadow: '0 0 14px rgba(229,168,0,0.18)',
                      }}
                      initial={{ opacity: 0, scale: 0.80 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.80 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    />
                  )}
                </AnimatePresence>

                <motion.div
                  animate={{ scale: isActive ? 1.06 : 1 }}
                  transition={{ type: 'spring', stiffness: 440, damping: 30 }}
                  whileTap={{ scale: 0.76 }}
                  className="relative z-10"
                >
                  <TabIcon
                    style={{
                      width: 22,
                      height: 22,
                      color: isActive ? GOLD : INACTIVE,
                      filter: isActive
                        ? 'drop-shadow(0 0 7px rgba(229,168,0,0.58))'
                        : 'none',
                      transition: 'color 0.16s ease, filter 0.16s ease',
                    }}
                  />
                </motion.div>
              </div>

              {/* Label */}
              <motion.span
                animate={{ color: isActive ? GOLD : INACTIVE_LB }}
                transition={{ duration: 0.16 }}
                className="text-[10.5px] font-semibold leading-none"
                style={{ letterSpacing: '0.03em' }}
              >
                {label}
              </motion.span>
            </NavLink>
          );
        })}

        {/* More / Menu button */}
        <motion.button
          type="button"
          onClick={onMenuOpen}
          whileTap={{ scale: 0.76 }}
          className="flex-1 flex flex-col items-center justify-center gap-1.5 relative select-none"
          onPointerDown={haptic}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ width: 54, height: 32 }}
          >
            <RiAppsLine style={{ width: 22, height: 22, color: INACTIVE }} />
          </div>
          <span
            className="text-[10.5px] font-semibold leading-none"
            style={{ color: INACTIVE_LB, letterSpacing: '0.03em' }}
          >
            More
          </span>
        </motion.button>

      </div>
    </nav>
  );
}
