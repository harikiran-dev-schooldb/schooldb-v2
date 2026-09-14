# SchoolDB Android

Native Android client built with Kotlin and Jetpack Compose.

## First milestone

- School and mobile-number sign in
- WhatsApp OTP delivery and verification through the existing SchoolDB API
- Account selection when a number belongs to multiple users
- Emulator and production backend configuration

## Open and run

1. Open the `android` directory in Android Studio.
2. Let Android Studio install JDK 17 and synchronize Gradle if prompted.
3. Add your Clerk publishable key to `~/.gradle/gradle.properties`:

   ```properties
   CLERK_PUBLISHABLE_KEY=pk_test_your_key
   ```

4. Start the SchoolDB web server from the repository root with `npm run dev`.
5. Run the Android `app` configuration on an emulator.

The debug build connects to `http://10.0.2.2:3000/`, which is the Android emulator alias for the host machine.

To use another server, add this to `~/.gradle/gradle.properties` or pass it on the command line:

```properties
SCHOOLDB_API_BASE_URL=https://your-schooldb.example.com/
```

Production builds reject cleartext HTTP traffic. Use an HTTPS URL for deployed environments.

The app redeems the short-lived ticket returned by the SchoolDB OTP endpoint through Clerk's native Android SDK. The SDK then owns session persistence and refresh.

## Push notifications

Push notifications use Firebase Cloud Messaging installation IDs (FIDs). Add the Android app
`com.schooldb.mobile` to the Firebase project and download its
`google-services.json` file into `android/app/`. The file is ignored by Git.

Configure these server environment variables from the same Firebase project's
service account:

```properties
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

Without `google-services.json`, Android builds normally but push registration is
disabled. Without the three server variables, announcements are still published
but push delivery is skipped.
