// Browser-side Razorpay checkout helpers.
//
// We don't bundle Razorpay's checkout — they require it to be loaded
// from their CDN at runtime so the modal stays in sync with backend
// payment-rail updates. This module lazy-injects the script the first
// time it's needed and resolves once `window.Razorpay` is available.
//
// Why a module instead of inlining: the Sponsor page mounts inside a
// lazy chunk; if we put the script tag in index.html it'd ship on the
// landing page too, slowing first paint for non-donors.

let scriptPromise = null;

export function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptPromise = null; // allow retry
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

// Opens the Razorpay checkout modal and resolves with the response
// after a successful payment, or rejects with a typed reason if the
// user dismisses / payment fails.
export function openRazorpayCheckout({
  keyId,
  orderId,
  amount,
  currency = 'INR',
  name = 'Environ',
  description = 'Sponsor trees',
  prefill,
  themeColor = '#059669',
}) {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay checkout script not loaded'));
      return;
    }
    let resolved = false;
    const rzp = new window.Razorpay({
      key: keyId,
      order_id: orderId,
      amount: String(amount),
      currency,
      name,
      description,
      prefill: prefill ?? undefined,
      theme: { color: themeColor },
      // Razorpay's onsuccess callback for the modal.
      handler: (response) => {
        resolved = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          if (!resolved) reject(Object.assign(new Error('Payment cancelled'), { cancelled: true }));
        },
      },
    });
    rzp.on('payment.failed', (failure) => {
      resolved = true;
      reject(
        Object.assign(new Error(failure?.error?.description ?? 'Payment failed'), {
          razorpayError: failure?.error,
        }),
      );
    });
    rzp.open();
  });
}
