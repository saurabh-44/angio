import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import UserMenu from './UserMenu.jsx';

// Builds breadcrumb-style page title from the current URL. Cheap heuristic
// — humanises the last segment. Pages with custom titles can override
// via the optional `title` prop.
export default function TopBar({ onOpenSidebar, title }) {
  const { pathname } = useLocation();
  const resolvedTitle = useMemo(() => {
    if (title) return title;
    const last = pathname.split('/').filter(Boolean).pop() ?? '';
    if (!last) return 'Overview';
    return last
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [pathname, title]);

  return (
    // pt = iOS status-bar / notch inset so the header bg fills that strip
    // and the content row sits below it (not under the clock/battery).
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-lg font-semibold tracking-tight truncate">
            {resolvedTitle}
          </h1>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
