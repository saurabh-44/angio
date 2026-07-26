import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth.jsx';
import { ToastProvider } from '@/components/ui/toast.jsx';
import { queryClient } from '@/lib/queryClient.js';
import { isNative } from '@/lib/nativeAuth.js';
import AppRouter from '@/app/router.jsx';

// Android's system back gesture/button fires the Capacitor `backButton` event.
// Walk the router (pushState) history when we can; at the first entry, leave the
// app instead of dead-ending. iOS uses the native WKWebView edge-swipe instead
// (enabled in MainViewController.swift), so this listener is a no-op there.
function useAndroidBackButton() {
  useEffect(() => {
    if (!isNative) return undefined;
    let remove;
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else CapApp.exitApp();
      }).then((handle) => {
        remove = () => handle.remove();
      });
    });
    return () => remove?.();
  }, []);
}

export default function App() {
  useAndroidBackButton();
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
