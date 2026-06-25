import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import UserMenu from './UserMenu.jsx';

// Transparent top strip over the light page — just the mobile nav trigger and
// the user chip on the right. The page itself renders its own heading
// (e.g. "Dashboard"), so no title lives here.
export default function TopBar({ onOpenSidebar }) {
  return (
    <header className="sticky top-0 z-30 bg-[#EEF1EE]/80 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center gap-4 px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6">
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
        <div className="min-w-0 flex-1" />
        <UserMenu />
      </div>
    </header>
  );
}
