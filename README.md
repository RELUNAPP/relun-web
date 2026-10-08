# Relun for the web

React + Vite + TypeScript copy of the Android app (`relun-android/`). It talks to the same `relun-backend` (REST + Socket.IO).

The UI matches Android screen for screen. On a desktop browser it renders as a phone-width column centred on the page. **Any UI or UX change made to relun-android must be made here too.**

## Run it

1. Start the backend (`relun-backend`, `npm run dev`, port 9000).
2. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` if the API isn't on `http://localhost:9000/`.
3. `npm install`, then `npm run dev` and open http://localhost:5173.

In development the app calls its own origin, and Vite forwards `/api` and `/socket.io` to the backend on port 9000.

**On a phone (same Wi-Fi):** run `npm run dev:phone` and open `https://<your-pc-ip>:5173`. Accept the certificate warning; the certificate is self-signed. You need https because browsers only allow location access on secure pages. Windows Firewall must allow port 5173 on your network.

`npm run build` writes a static site to `dist/`. Serve it with an SPA fallback, so every path returns `index.html`.

## Coin purchases (Paystack)

Android sells coins through Google Play; the web uses Paystack.

1. On the backend, set `PAYSTACK_SECRET_KEY` (and optionally `PAYSTACK_CURRENCY` and the `PAYSTACK_PRICE_COINS_*` prices in kobo; see `relun-backend/.env.example`).
2. In the Paystack dashboard, set the webhook URL to `https://<api-host>/api/coins/paystack/webhook`.

The flow works like this. The backend creates the transaction (it sets the amount, so the client can't change it), the app opens the Paystack popup, and coins are credited after the backend verifies the charge with Paystack. The webhook credits the coins if the tab closes before that happens. Either path credits a purchase only once.

## Not on the web (yet)

- Push notifications. Real-time messages arrive over Socket.IO while the tab is open.

## Layout

```
src/data/        DTOs, models, fetch client with token refresh, Socket.IO, repositories, app store
src/navigation/  Stack (slide transitions), shell (MainViewModel), MainFlow, AppActions
src/components/  Buttons, inputs, visuals, controls (sheets, dialogs, toasts, rows)
src/screens/     auth, onboarding, discover, profile, match, messages, chat, dates, me, settings, sheets
src/theme.ts     Colours, segment accents, type scale (same values as Android ui/theme)
```

Android `foo/BarScreen.kt` maps to web `src/screens/foo/BarScreen.tsx`, and view models become hooks or stores in the same folder.
