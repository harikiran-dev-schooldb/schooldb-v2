# Android App Builder

The Super Admin **Android App Builder** creates a school-specific signed release
APK through GitHub Actions.

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

1. A Super Admin selects a school, uploads a PNG logo and that Android
   package's `google-services.json`, and starts the build.
2. The web app validates the package and stores the protected build input.
3. GitHub Actions downloads the input with a one-time random token.
4. The workflow creates or updates the school flavor, signs the release APK,
   and stores it as a 30-day GitHub Actions artifact.
5. The page polls build status and provides an authenticated download link.

Firebase files, logos, callback tokens, and signing secrets are not committed
to Git.
