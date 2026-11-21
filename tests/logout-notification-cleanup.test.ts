import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("web logout disables push before ending the Clerk session", () => {
  const logout = source("src/app/[schoolSlug]/logout/page.tsx");
  const push = source("src/lib/browser-push.ts");

  assert.ok(logout.indexOf("await disableBrowserPush(schoolSlug)") < logout.indexOf("await signOut"));
  assert.match(push, /await setBrowserPushSession\(null\)/);
  assert.match(push, /registration\.getNotifications\(\)/);
  assert.match(push, /notification\.close\(\)/);
  assert.match(push, /subscription\?\.unsubscribe\(\)/);
  assert.match(push, /method: "DELETE"/);
});

test("main Android logout clears notifications and unregisters the push installation", () => {
  const manager = source(
    "android/app/src/main/java/com/schooldb/mobile/notifications/PushNotificationManager.kt",
  );
  const auth = source(
    "android/app/src/main/java/com/schooldb/mobile/auth/AuthViewModel.kt",
  );
  const teacher = source(
    "android/app/src/main/java/com/schooldb/mobile/teacher/TeacherViewModel.kt",
  );

  assert.match(manager, /NotificationManagerCompat\.from\(context\)\.cancelAll\(\)/);
  assert.match(manager, /FirebaseMessaging\.getInstance\(\)\.unregister\(\)/);
  assert.match(auth, /PushNotificationManager\.unregisterCurrentDevice\(\)/);
  assert.match(teacher, /PushNotificationManager\.unregisterCurrentDevice\(\)/);
});

test("support Android logout clears notifications and schedules durable token cleanup", () => {
  const activity = source(
    "school-support-android/app/src/main/java/com/schooldb/support/MainActivity.kt",
  );
  const sync = source(
    "school-support-android/app/src/main/java/com/schooldb/support/notifications/SupportPushSync.kt",
  );

  assert.match(activity, /NotificationManager::class\.java\)\.cancelAll\(\)/);
  assert.match(activity, /putBoolean\("delete_token", true\)/);
  assert.ok(activity.indexOf("unregisterPushDevice") < activity.indexOf("api.signOut()"));
  assert.match(sync, /FirebaseMessaging\.getInstance\(\)\.unregister\(\)/);
});
