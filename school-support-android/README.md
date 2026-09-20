# School Support Android

Standalone internal ticketing app for SchoolDB staff and school admins. It uses the same school code, WhatsApp OTP and Clerk sign-in flow as the main Android app, but keeps its own session.

## Run locally

1. Apply the repository migrations to a local SchoolDB database and start the web server on port 3000.
2. Configure `CLERK_PUBLISHABLE_KEY` in `~/.gradle/gradle.properties` (the same development key used by `android/`).
3. Open this directory in Android Studio, or build with `../android/gradlew -p . :app:assembleDebug`.
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

Super Admins can open **Manage administrators** from the support dashboard to create or update
Super Admin and School Admin accounts. New administrators sign in with the mobile number entered
there and a WhatsApp OTP. An administrator cannot edit their own account from this screen.

Ticket records are stored in SchoolDB. The first migration is `20260920080000_support_tickets`. The API routes are under `/api/v1/support/`.

## Parent query QR

After deploying the `20260920140000_parent_support_qr` migration and the web app, a school admin can open **Parent query QR** on the support dashboard. The printable page is at `https://www.schooldb.co.in/<school-code>/parent-query/qr`; its QR opens the public form at `/<school-code>/parent-query`. Parents do not sign in. They choose class and section, search for their child, select a category, and submit a subject and description. A name and phone number can be added for follow-up. The query appears in the admin ticket list with a **PARENT QUERY** label and sends a push alert to active Super Admin and School Admin devices. Notes added inside the app are internal; contact the parent using the provided number when a response is needed.

The debug build allows cleartext traffic for the local server. The release build disallows cleartext traffic and reads the production Clerk publishable key and signing key from `android/keystore.properties` (or the publishable key from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`).

## Push notification setup

Keep `app/google-services.json` configured for `com.schooldb.support`. When its support client contains multiple `api_key` entries, the Google Services build plugin uses the first one. That key must be allowed to call the Firebase Installations API; otherwise Firebase token retrieval fails with `FIS_AUTH_ERROR` and the server has no support device to notify. The working release configuration for this project uses the same Firebase project key as the main Android app. After changing the JSON file, rebuild and reinstall the support app, then open it while signed in so it can register the device.
