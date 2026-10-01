# School Support Android App

The Super Admin **Support Android App** page creates one universal signed release
APK and Play Store AAB through GitHub Actions. The same package is installed for
every school; users enter their school code when signing in.

## Web application environment

Configure these values in the deployed SchoolDB web application:

- `GITHUB_ACTIONS_TOKEN`: fine-grained GitHub token for the repository with
  **Actions: Read and write** permission.
- `GITHUB_ANDROID_REPOSITORY`: defaults to
  `harikiran-dev-schooldb/schooldb-v2`.
- `GITHUB_ANDROID_BUILD_WORKFLOW`: defaults to
  `android-school-build.yml`.
- `GITHUB_ANDROID_BUILD_REF`: defaults to `main`.
- `NEXT_PUBLIC_BASE_URL`: the public HTTPS URL GitHub Actions can call.

Apply the `20260923203000_android_app_builds` database migration before using
the page.

## GitHub Actions secrets

Add these repository Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `CLERK_PUBLISHABLE_KEY`

Create `ANDROID_KEYSTORE_BASE64` by base64-encoding the Android release
keystore as one line.

## Build flow

1. A Super Admin uploads the shared `google-services.json` and starts the build.
2. The web app verifies that Firebase contains the `com.schooldb.support`
   Android client and stores the protected build input.
3. GitHub Actions downloads the input with a one-time random token.
4. The workflow builds and signs the universal release APK and AAB and stores
   them as 30-day GitHub Actions artifacts.
5. The page polls build status and provides an authenticated download link.

Firebase files, callback tokens, and signing secrets are not committed to Git.
Adding a school requires no Android configuration or rebuild.
