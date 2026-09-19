import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val firebaseConfigFile = file("google-services.json")
if (firebaseConfigFile.exists()) {
    apply(plugin = "com.google.gms.google-services")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("keystore.properties")

if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

val clerkDevelopmentPublishableKey = providers.gradleProperty("CLERK_PUBLISHABLE_KEY")
    .orElse(providers.environmentVariable("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"))
    .orElse("")
    .get()

val clerkProductionPublishableKey = keystoreProperties
    .getProperty("clerkProductionPublishableKey")
    ?: providers.environmentVariable("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY").orNull
    ?: ""

val apiBaseUrlOverride = providers.gradleProperty("SCHOOLDB_API_BASE_URL")
    .orElse(providers.environmentVariable("SCHOOLDB_API_BASE_URL"))
    .orNull
    ?.trim()
    ?.takeIf { it.isNotEmpty() }

fun apiBaseUrl(defaultUrl: String): String =
    (apiBaseUrlOverride ?: defaultUrl).trimEnd('/') + "/"

android {
    namespace = "com.schooldb.mobile"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.schooldb.mobile"
        minSdk = 26
        targetSdk = 36
        versionCode = 4
        versionName = "0.2.1"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField(
            "String",
            "CLERK_PUBLISHABLE_KEY",
            "\"$clerkDevelopmentPublishableKey\""
        )
        buildConfigField("boolean", "FIREBASE_CONFIGURED", firebaseConfigFile.exists().toString())
    }

    if (keystorePropertiesFile.exists()) {
        signingConfigs {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        getByName("debug") {
            buildConfigField(
                "String",
                "API_BASE_URL",
                "\"${apiBaseUrl("http://10.0.2.2:3000/")}\""
            )
        }

        getByName("release") {
            buildConfigField(
                "String",
                "API_BASE_URL",
                "\"${apiBaseUrl("https://www.schooldb.co.in/")}\""
            )
            buildConfigField(
                "String",
                "CLERK_PUBLISHABLE_KEY",
                "\"$clerkProductionPublishableKey\""
            )

            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.08.00")
    val firebaseBom = platform("com.google.firebase:firebase-bom:34.19.0")

    implementation(composeBom)
    implementation(firebaseBom)
    androidTestImplementation(composeBom)

    implementation("androidx.activity:activity-compose:1.12.4")
    implementation("androidx.core:core-ktx:1.18.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("com.clerk:clerk-android-api:1.1.3")
    implementation("com.google.firebase:firebase-messaging")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
}
