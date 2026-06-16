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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 backdrop-blur px-4 sm:px-6">
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
    </header>
  );
}
