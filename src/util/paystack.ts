// Paystack Inline (v2). Opens the hosted checkout as a popup over the app for a
// transaction the backend already initialized, so the amount can't be tampered with.

type PaystackPopInstance = {
  resumeTransaction: (
    accessCode: string,
    callbacks: {
      onSuccess?: (tx: { reference: string }) => void;
      onCancel?: () => void;
      onError?: (e: { message?: string }) => void;
    },
  ) => void;
};

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopInstance;
  }
}

let loading: Promise<void> | null = null;

const loadScript = (): Promise<void> => {
  if (window.PaystackPop) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.paystack.co/v2/inline.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error('Couldn’t reach Paystack. Check your connection and try again.'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
};

export type PaystackResult = { kind: 'success'; reference: string } | { kind: 'cancelled' };

export async function openPaystack(accessCode: string): Promise<PaystackResult> {
  await loadScript();
  const popup = new window.PaystackPop!();
  return new Promise((resolve, reject) => {
    popup.resumeTransaction(accessCode, {
      onSuccess: (tx) => resolve({ kind: 'success', reference: tx.reference }),
      onCancel: () => resolve({ kind: 'cancelled' }),
      onError: (e) => reject(new Error(e?.message || 'Payment failed. Try again.')),
    });
  });
}
