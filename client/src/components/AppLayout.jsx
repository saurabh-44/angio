import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import { Button } from '@/components/ui/button.jsx';
import { primeNativePermissions } from '@/lib/nativePermissions.js';
import { HeaderSlotContext } from './PageHeading.jsx';
import Sidebar from './Sidebar.jsx';
import UserMenu from './UserMenu.jsx';

// Shared app shell (Figma): a slim icon rail on the left, a white content panel
// filling the rest, and — on desktop — a top bar in the grey area above the
// panel holding the page title (left) + the user chip (right). Mobile swaps the
// rail for a Sheet drawer and floats the chip over the panel.
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // The desktop top-bar slot pages portal their heading into (see PageHeading).
  const [headerSlot, setHeaderSlot] = useState(null);

  // Prime native camera + location permissions once authenticated. No-op on web.
  useEffect(() => {
    primeNativePermissions();
  }, []);

  return (
    <HeaderSlotContext.Provider value={headerSlot}>
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

        {/* Mobile user chip — floats over the panel's top-right. */}
        <div className="absolute right-6 top-5 z-30 sm:right-8 sm:top-6 lg:hidden">
          <UserMenu />
        </div>

        {/* Desktop top bar — page title (portaled by the page) on the left and
            the user chip on the right, sitting in the grey area above the white
            panel. */}
        <div className="hidden items-center justify-between gap-4 px-8 pb-5 pt-6 lg:flex">
          <div ref={setHeaderSlot} className="min-w-0 flex-1" />
          <UserMenu />
        </div>

        <main className="flex-1 animate-fade-in px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pt-3 lg:flex lg:p-0">
          {/* Desktop: the panel is flush to the right/bottom edges with only the
              top-left corner curved (where it meets the icon rail + top bar).
              Mobile keeps the inset rounded card. */}
          <div className="min-h-[calc(100vh-1.5rem)] w-full rounded-3xl bg-white px-5 pb-6 pt-16 shadow-[0_8px_40px_rgba(0,0,0,0.06)] sm:p-8 lg:min-h-0 lg:rounded-bl-none lg:rounded-br-none lg:rounded-tr-none">
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
    </HeaderSlotContext.Provider>
  );
}
