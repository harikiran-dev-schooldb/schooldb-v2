# SchoolDB iOS APNs Production Setup

The backend can deliver native iOS SchoolDB notifications directly through Apple Push Notification service (APNs). Android/web delivery continues through Firebase.

## Required Apple setup

Use a paid Apple Developer Program team. Personal Teams cannot provision the Push Notifications capability.

1. Register or open the explicit App ID `com.schooldb.mobile`.
2. Enable **Push Notifications** for the App ID.
3. Create an APNs authentication key (`.p8`) and record:
   - Key ID
   - Team ID
4. Keep the `.p8` private key outside Git and local source control.
5. Regenerate/refresh the provisioning profile after enabling the capability.

## Vercel production environment

Configure these variables for the SchoolDB production project:

```text
APNS_KEY_ID=<Apple Key ID>
APNS_TEAM_ID=<Apple Team ID>
APNS_PRIVATE_KEY=<contents of AuthKey_XXXXXXXXXX.p8>
APNS_BUNDLE_ID=com.schooldb.mobile
APNS_ENVIRONMENT=production
```

`APNS_PRIVATE_KEY` may contain real newlines or escaped `\n`; SchoolDB normalizes both forms.

For a locally signed development build using an APNs development entitlement, use `APNS_ENVIRONMENT=sandbox` on the backend environment serving that test. TestFlight and App Store builds use `production`.

## Delivery behavior

- iOS device tokens are stored as `PushDevice.platform = IOS`.
- Announcement and event notifications send through APNs HTTP/2.
- Android and web notifications remain on Firebase.
- APNs tokens rejected as `BadDeviceToken`, `DeviceTokenNotForTopic` or `Unregistered` are disabled automatically.
- Notification payloads include `announcementId`, `schoolId`, `category`, `priority` and `link` for in-app routing.
- APNs provider JWTs are ES256 signed and cached for less than one hour.

## Production verification

1. Deploy `main` with all five APNs environment variables.
2. Install a Release/TestFlight SchoolDB build.
3. Sign in and allow notifications.
4. Verify an enabled IOS row is created in `PushDevice`.
5. Publish an announcement targeted to that user.
6. Verify foreground and background delivery.
7. Tap the push and verify SchoolDB opens the role-specific notifications screen.
8. Sign out and verify the device registration becomes disabled for that user.
