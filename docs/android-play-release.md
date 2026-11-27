# Android Play release

SchoolDB and School Support use the `Android Release Artifacts` GitHub Actions workflow. Every run builds, tests, lints and signs both APK and AAB artifacts. A manual run can additionally upload both AABs to Google Play Internal Testing.

## One-time Play Console setup

1. Create a Google Cloud service account for GitHub Actions.
2. Grant that account release access to both `com.schooldb.mobile` and `com.schooldb.support` in Play Console.
3. Add the complete service-account JSON as the repository Actions secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
4. Confirm each Play Console app has an Internal Testing track and tester list.

Never commit the service-account JSON, signing keystore, passwords or generated Firebase configuration.

## Prepare a release

1. Increment `android/.version-code` and `school-support-android/.version-code`. Play version codes must always increase.
2. Update each app's `versionName` when the public release name changes.
3. Update the localized files under `distribution/google-play/*/whatsnew/`.
4. Push the release commit and wait for the normal CI workflow to pass, including both emulator jobs.

## Upload to Internal Testing

1. Open **Actions → Android Release Artifacts → Run workflow**.
2. Select the release commit on `main`.
3. Enable **Upload both signed AABs to Google Play Internal Testing**.
4. Run the workflow and confirm both upload steps pass.
5. Install both apps from the Internal Testing links and complete the physical-device checklist below.

The workflow never uploads on an ordinary push or tag. Uploading requires a manual workflow dispatch with the guarded input enabled. Promotion beyond Internal Testing remains a deliberate Play Console action.

## Physical-device checklist

- Sign in and sign out for administrator, teacher, parent and student accounts.
- Confirm sign-out removes displayed notifications and the signed-out account receives no new alerts.
- Verify school switching does not show another school's cached data or notifications.
- Test students, attendance, homework, exams, marks, failures, fees, follow-ups, notifications and reports as permitted by each role.
- Test light and dark themes, font scaling, portrait/landscape rotation and a tablet-sized device.
- Test offline messaging and recovery after reconnecting; do not save critical data while disconnected.
- Confirm external links, downloads, uploads and Android back navigation.
- Review Play pre-launch reports, crashes, ANRs and de-obfuscation mapping uploads before promotion.
