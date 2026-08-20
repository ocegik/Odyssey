# OAuth regression QA

Run this against the deployed build in a clean browser profile (or after
clearing Odyssey's local storage):

1. Open `https://odysseyprep.vercel.app/#/login` and choose **Continue with
   Google**.
2. Complete consent. The browser may briefly return to the bare app URL with
   Supabase OAuth data in its fragment; it must then land on
   `https://odysseyprep.vercel.app/#/overview` with a signed-in dashboard.
3. Confirm DevTools → Application → Local Storage contains the Supabase auth
   session key (`sb-<project-ref>-auth-token`).
4. While still signed in, visit `/#/home` and `/#/login`. Each must redirect to
   `/#/overview` after the initial account check.

During this diagnostic release, the first console message is `[auth] App boot
URL:`. It records the unmodified return URL so the OAuth response can be
confirmed. Remove that temporary log after production QA because an implicit
OAuth response can include session tokens in its fragment.
