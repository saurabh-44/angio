import { NavLink } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_LABEL, useAuth } from '@/lib/auth.jsx';
import { NAV_BY_ROLE } from '@/app/navConfig.js';
import { HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

// Two presentations of the same nav:
//   collapsed  → desktop icon rail (Figma): floating pill icons, active one
//                filled dark green, the rest outlined grey.
//   default    → mobile Sheet drawer with brand block + labelled rows.
export default function Sidebar({ onNavigate, collapsed }) {
  const { user, role } = useAuth();
  const items = NAV_BY_ROLE[role] ?? [];

  if (collapsed) {
    return (
      <nav className="flex h-full flex-col items-center gap-8 py-8">
        <NavLink
          to={`/${role?.startsWith('ngo') ? 'admin' : role ?? ''}`}
          aria-label="Home"
          className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0B5000] text-white"
        >
          <Leaf className="h-5 w-5" aria-hidden />
        </NavLink>
        <ul className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={item.label}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'grid h-12 w-12 place-items-center rounded-full transition-colors',
                    isActive
                      ? 'bg-[#001F00] text-white'
                      : 'border border-[#B4B4B4] text-[#001F00] hover:border-[#0B5000] hover:text-[#0B5000]',
                  )
                }
              >
                <item.icon className="h-5 w-5" aria-hidden />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="flex h-full flex-col bg-white pl-[env(safe-area-inset-left)]">
      <div className="px-6 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="inline-flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0B5000] text-white">
            <Leaf className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <div className="text-base font-bold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
              Environ
            </div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {ROLE_LABEL[role] ?? 'Member'}
            </div>
          </div>
        </div>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex cursor-pointer items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#001F00] text-white'
                    : 'text-[#001F00] hover:bg-[#0B5000]/10',
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="border-t border-border/60 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
        <div className="rounded-2xl bg-[#0B5000]/5 px-4 py-3">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Signed in</div>
          <div className="mt-0.5 truncate text-sm font-medium text-[#001F00]" title={user?.email}>
            {user?.name ?? user?.email}
          </div>
        </div>
      </div>
    </nav>
  );
}
