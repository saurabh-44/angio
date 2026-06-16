import { createContext, forwardRef, useCallback, useContext, useMemo, useState } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva } from 'class-variance-authority';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-border/60 bg-card p-4 pr-8 shadow-soft',
  {
    variants: {
      variant: {
        default: '',
        success: 'border-leaf-200 bg-leaf-50',
        error: 'border-destructive/30 bg-destructive/5',
        info: 'border-secondary bg-secondary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const ICONS = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const ICON_COLORS = {
  default: 'text-foreground',
  success: 'text-leaf-700',
  error: 'text-destructive',
  info: 'text-secondary-foreground',
};

export const Toast = forwardRef(({ className, variant = 'default', title, description, ...props }, ref) => {
  const Icon = ICONS[variant] ?? Info;
  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        toastVariants({ variant }),
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=closed]:slide-out-to-right-full',
        className,
      )}
      {...props}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ICON_COLORS[variant])} aria-hidden />
      <div className="flex-1">
        {title && (
          <ToastPrimitive.Title className="font-semibold text-foreground leading-snug">
            {title}
          </ToastPrimitive.Title>
        )}
        {description && (
          <ToastPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
            {description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
});
Toast.displayName = 'Toast';

// Provider that wires the imperative `toast(...)` API into Radix's
// declarative ToastProvider. Components anywhere in the tree call
// useToast().toast({ title, description, variant }).
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, ...opts }]);
    return id;
  }, []);

  const api = useMemo(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error' }),
      info: (title, description) => toast({ title, description, variant: 'info' }),
      dismiss,
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            title={t.title}
            description={t.description}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
          />
        ))}
        <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
