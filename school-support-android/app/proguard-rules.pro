# Clerk exposes callback and serialization types across library boundaries.
-keep class com.clerk.api.** { *; }
-keepattributes Signature,*Annotation*
# WorkManager's Room database and worker are instantiated through reflection.
-keep class androidx.work.impl.WorkDatabase_Impl { *; }
-keep class com.schooldb.support.notifications.SupportPushSync {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
