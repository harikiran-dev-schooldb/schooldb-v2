# Clerk and Firebase publish consumer rules. Keep JSON models and coroutine
# continuations readable while allowing R8 to optimize the rest of the app.
-keepattributes Signature,InnerClasses,EnclosingMethod
-keepattributes RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,AnnotationDefault

# JSONObject repositories are accessed directly, not through reflection.
# Retain Firebase Messaging service callbacks invoked by the Android runtime.
-keep class com.schooldb.mobile.notifications.SchoolDbMessagingService { *; }
