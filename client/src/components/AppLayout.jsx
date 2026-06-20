import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';

// Shared app shell for every authenticated dashboard. Desktop has a
// fixed left sidebar; mobile uses a Sheet drawer triggered from the
// top bar's hamburger.
//
// The <Outlet /> is wrapped in Suspense so route-level code splits
// (React.lazy in router.jsx) show a spinner without unmounting the
// chrome around them.
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 shrink-0">
        <div className="fixed inset-y-0 left-0 w-64">
          <Sidebar />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-w-7xl w-full mx-auto animate-fade-in">
          <Suspense
            fallback={
              <div className="grid place-items-center py-24">
                <Spinner label="Loading…" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
