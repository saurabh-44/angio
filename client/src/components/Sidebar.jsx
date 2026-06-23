import { NavLink } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_LABEL, useAuth } from '@/lib/auth.jsx';
import { NAV_BY_ROLE } from '@/app/navConfig.js';

// Used both inline (desktop, fixed left rail) and inside the Sheet (mobile).
// Caller controls width and visibility; this component just renders the
// brand block + nav items + role pill.
export default function Sidebar({ onNavigate }) {
  const { user, role } = useAuth();
  const items = NAV_BY_ROLE[role] ?? [];

  return (
    <nav className="flex h-full flex-col bg-card border-r border-border/60 pl-[env(safe-area-inset-left)]">
      <div className="px-6 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="inline-flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Leaf className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <div className="font-heading text-base font-bold tracking-tight">Environ</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {ROLE_LABEL[role] ?? 'Member'}
            </div>
          </div>
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-border/60">
        <div className="rounded-2xl bg-secondary/60 px-4 py-3">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Signed in
          </div>
          <div className="mt-0.5 text-sm font-medium text-foreground truncate" title={user?.email}>
            {user?.name ?? user?.email}
          </div>
        </div>
      </div>
    </nav>
  );
}
