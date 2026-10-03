# SchoolDB PWA notifications

SchoolDB uses two web notification transports:

- Firebase Cloud Messaging for Android and Chromium browsers.
- Standards-based VAPID Web Push for Safari and iPhone/iPad Home Screen apps.

## Configure standards-based Web Push

Generate one long-lived VAPID key pair:

```bash
npm run web-push:keys
```

Store the generated keys in the production environment. The public key is safe
to expose to browsers; the private key must remain server-only.

```text
NEXT_PUBLIC_WEB_PUSH_VAPID_KEY=<public key>
WEB_PUSH_VAPID_PRIVATE_KEY=<private key>
WEB_PUSH_SUBJECT=mailto:support@schooldb.co.in
```

Keep this key pair stable. Replacing it requires users to enable Safari/iPhone
notifications again.

Apply the database migration before deploying the application:

```bash
npm run db:migrate:deploy
```

The existing Firebase web and server credentials remain required for Android
and Chromium delivery.

## iPhone/iPad verification

1. Use iOS/iPadOS 16.4 or later and open the production HTTPS site.
2. Tap **Share**, then **Add to Home Screen**.
3. Launch SchoolDB from its Home Screen icon and sign in.
4. Open the notification menu, tap **Browser alerts**, and allow notifications.
5. Publish an announcement for that user.
6. Verify delivery on the Lock Screen, notification tap routing, foreground
   inbox refresh, and the Home Screen badge.

Notification permission cannot be requested from a normal iPhone browser tab;
Apple only exposes Web Push to an installed Home Screen web app.
