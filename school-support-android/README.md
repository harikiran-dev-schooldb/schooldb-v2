# School Support Android

Standalone internal ticketing app for SchoolDB staff and school admins. It uses the same school code, WhatsApp OTP and Clerk sign-in flow as the main Android app, but keeps its own session.

## Run locally

1. Apply the repository migrations to a local SchoolDB database and start the web server on port 3000.
2. Configure `CLERK_PUBLISHABLE_KEY` in `~/.gradle/gradle.properties` (the same development key used by `android/`).
3. Open this directory in Android Studio, or build with `../android/gradlew -p . :app:assembleDebug`.
4. Install the debug APK on an emulator. Debug connects to `http://10.0.2.2:3000/`.

The app signs in staff, lists accessible tickets, creates tickets, searches students by name or admission number, shows details, and adds replies. School admins can assign staff and update status and priority. Staff see tickets they created or were assigned; school admins see all tickets in their school.

Ticket records are stored in SchoolDB. The first migration is `20260920080000_support_tickets`. The API routes are under `/api/v1/support/`.

The debug build allows cleartext traffic for the local emulator server. The release build uses `https://www.schooldb.co.in/` and disallows cleartext traffic.
