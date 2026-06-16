import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth.jsx';
import { ToastProvider } from '@/components/ui/toast.jsx';
import { queryClient } from '@/lib/queryClient.js';
import AppRouter from '@/app/router.jsx';

export default function App() {
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
