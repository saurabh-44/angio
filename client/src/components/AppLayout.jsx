import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import { Button } from '@/components/ui/button.jsx';
import { primeNativePermissions } from '@/lib/nativePermissions.js';
import Sidebar from './Sidebar.jsx';
import UserMenu from './UserMenu.jsx';

// Shared app shell (Figma): a slim icon rail on the left, a rounded white
// content panel filling the rest, and the user chip floating over the panel's
// top-right. Mobile swaps the rail for a Sheet drawer triggered by a hamburger.
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Prime native camera + location permissions once authenticated. No-op on web.
  useEffect(() => {
    primeNativePermissions();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#EEF1EE]">
      {/* Desktop icon rail */}
      <aside className="hidden w-20 shrink-0 lg:flex">
        <div className="fixed inset-y-0 left-0 w-20">
          <Sidebar collapsed />
        </div>
      </aside>

      {/* Mobile drawer — full labelled nav */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col pt-[env(safe-area-inset-top)]">
        {/* Mobile nav trigger — floats top-left over the panel */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-2 top-2 z-30 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* User chip — floats over the panel's top-right. */}
        <div className="absolute right-6 top-5 z-30 sm:right-8 sm:top-6">
          <UserMenu />
        </div>

        <main className="flex-1 animate-fade-in px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pt-3">
          <div className="min-h-[calc(100vh-1.5rem)] rounded-3xl bg-white px-5 pb-6 pt-16 shadow-[0_8px_40px_rgba(0,0,0,0.06)] sm:p-8">
            <Suspense
              fallback={
                <div className="grid place-items-center py-24">
                  <Spinner label="Loading…" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
