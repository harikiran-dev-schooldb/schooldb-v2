plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val clerkKey = providers.gradleProperty("CLERK_PUBLISHABLE_KEY")
    .orElse(providers.environmentVariable("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"))
    .orElse("").get()

android {
    namespace = "com.schooldb.support"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.schooldb.support"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "CLERK_PUBLISHABLE_KEY", "\"$clerkKey\"")
    }

    buildTypes {
        getByName("debug") {
            resValue("bool", "uses_cleartext_traffic", "true")
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000/\"")
        }
        getByName("release") {
            resValue("bool", "uses_cleartext_traffic", "false")
            isMinifyEnabled = false
            buildConfigField("String", "API_BASE_URL", "\"https://www.schooldb.co.in/\"")
        }
    }

    buildFeatures { buildConfig = true; compose = true; resValues = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.08.00")
    implementation(composeBom)
    implementation("androidx.activity:activity-compose:1.12.4")
    implementation("androidx.core:core-ktx:1.18.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    implementation("com.clerk:clerk-android-api:1.1.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
