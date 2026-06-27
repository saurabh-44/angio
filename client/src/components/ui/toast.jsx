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

// New theme: white card with a bold coloured left accent + icon chip and a
// strong shadow so toasts clearly pop over the page. Colour language matches
// the app — green = success, red = error, blue = info.
const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-[#E2E8F0] border-l-4 bg-white p-4 pr-9 shadow-[0_14px_36px_-10px_rgba(0,31,0,0.32)]',
  {
    variants: {
      variant: {
        default: 'border-l-[#1E1E1E]',
        success: 'border-l-[#0B5000]',
        error: 'border-l-[#DC2626]',
        info: 'border-l-[#346EC4]',
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

const ICON_CHIPS = {
  default: 'bg-[#1E1E1E]/10 text-[#1E1E1E]',
  success: 'bg-[#0B5000]/10 text-[#0B5000]',
  error: 'bg-[#DC2626]/10 text-[#DC2626]',
  info: 'bg-[#346EC4]/10 text-[#346EC4]',
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
      <span
        className={cn(
          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full',
          ICON_CHIPS[variant] ?? ICON_CHIPS.default,
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="flex-1">
        {title && (
          <ToastPrimitive.Title className="font-semibold leading-snug text-[#001F00]">
            {title}
          </ToastPrimitive.Title>
        )}
        {description && (
          <ToastPrimitive.Description className="mt-0.5 text-sm text-[#1E1E1E]/60">
            {description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close className="absolute right-2.5 top-2.5 rounded-md p-1 text-[#1E1E1E]/40 transition-colors hover:text-[#001F00] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
        <ToastPrimitive.Viewport className="fixed z-[100] flex max-h-screen flex-col gap-2 outline-none top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] sm:left-auto sm:w-full sm:max-w-sm" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
