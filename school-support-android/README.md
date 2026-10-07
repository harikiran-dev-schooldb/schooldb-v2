# School Support Android

One shared internal ticketing app for staff and administrators across every SchoolDB school. Users enter their school code at sign-in, followed by the same WhatsApp OTP and Clerk flow as the main Android app. The support app keeps its own session.

## Run locally

1. Apply the repository migrations to a local SchoolDB database and start the web server on port 3000.
2. Configure `CLERK_PUBLISHABLE_KEY` in `~/.gradle/gradle.properties` (the same development key used by `android/`).
3. Open this directory in Android Studio, or build with `./gradlew :app:assembleDebug`.
4. Install the debug APK on an emulator. Debug connects to `http://10.0.2.2:3000/`.

The debug APK's default server address works only in an emulator. For a physical phone on the
same Wi-Fi network as the development computer, build with
`../android/gradlew -p . :app:assembleDebug -PSCHOOLDB_API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:3000/`
and keep the local web server running. Rebuild if the computer's LAN address changes.

For a production install, build `:app:assembleRelease`. The signed release APK connects to
`https://www.schooldb.co.in/` and uses the production Clerk key. A debug install must be
uninstalled before installing release because the signing keys differ; this clears only the app's
local sign-in state. Tickets remain on the server.

The app signs in staff, lists accessible tickets, creates tickets, searches students by name or admission number, shows details, and adds replies. School admins can assign staff and update status and priority. Staff see tickets they created or were assigned; school admins see all tickets in their school.

The launcher and default in-app brand mark use the same light-mode SchoolDB identity as the main Android and web apps. A school-specific uploaded logo still replaces the default mark after sign-in.

Release 0.9.0 adds staff replies with admin-only internal notes, valid status-transition choices with confirmation, Principal and Vice Principal designations, message/activity timestamps, navigation-safe ticket and reply drafts, retryable push-device cleanup, and OTP-free switching between accounts linked to the same verified mobile number.

Super Admins can open **Manage administrators** from the support dashboard to create or update
Super Admin and School Admin accounts. New administrators sign in with the mobile number entered
there and a WhatsApp OTP. An administrator cannot edit their own account from this screen.

Ticket records are stored in SchoolDB. The first migration is `20260920080000_support_tickets`. The API routes are under `/api/v1/support/`.

## Parent query QR

After deploying the `20260920140000_parent_support_qr` migration and the web app, a school admin can open **Parent query QR** on the support dashboard. The printable page is at `https://www.schooldb.co.in/<school-code>/parent-query/qr`; its QR opens the public form at `/<school-code>/parent-query`. Parents do not sign in. They choose class and section, search for their child, select a category, and submit a subject and description. A name and phone number can be added for follow-up. The query appears in the admin ticket list with a **PARENT QUERY** label and sends a push alert to active Super Admin and School Admin devices. Notes added inside the app are internal; contact the parent using the provided number when a response is needed.

The debug build allows cleartext traffic for the local server. The release build disallows cleartext traffic and reads the production Clerk publishable key and signing key from `android/keystore.properties` (or the publishable key from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`).

## Push notification setup

Keep the shared Firebase file at `app/google-services.json`. It must contain an Android client for `com.schooldb.support`. The API key must be allowed to call the Firebase Installations API; otherwise token retrieval fails with `FIS_AUTH_ERROR`. One Firebase registration and one installed app serve all schools; push payloads continue to be checked against the signed-in school code.

Release 0.8.0 requires the matching server `src/lib/support-push.ts` update: messages are data-only and include `schoolSlug`, `title`, `body`, and `ticketId`. Deploy the server change alongside the APK; legacy unscoped messages are rejected by the updated client. Device registration and logout token deletion retry through WorkManager when connectivity returns. Notification taps only open tickets for the signed-in school. Android notification permission and the Support tickets channel must be enabled.

## School branding

Upload or replace the school logo on the website's **Schools** page. After sign-in, the app reads the public school branding endpoint and displays the school name and logo in its dashboard header. Returning to the app refreshes branding. Schools without a logo retain the default mark; no separate school-specific APK is needed.

School branding is stored in app-private, school-scoped files and restored on cold startup, including after RAM cleanup. Network failures retain the last downloaded logo; a successful response explicitly removing the logo clears the saved image. The pull-to-refresh indicator is reserved for explicit refresh requests, not ticket selections, filtering, or background synchronization.

Startup observes Clerk's active-session flow before loading the dashboard, with up to three attempts for temporary network/token failures. While the initial data is unavailable, the dashboard explicitly shows loading rather than presenting an empty account as ready. The overview hero uses the main Android app's light neutral surface, dark text, and indigo accents.
