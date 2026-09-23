import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val firebaseConfigFile = file("google-services.json")
val kotakFirebaseConfigFile = file("src/kotak/google-services.json")
if (firebaseConfigFile.exists() || kotakFirebaseConfigFile.exists()) {
    apply(plugin = "com.google.gms.google-services")
}

val clerkKey = providers.gradleProperty("CLERK_PUBLISHABLE_KEY")
    .orElse(providers.environmentVariable("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"))
    .orElse("").get()
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("../android/keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}
val productionClerkKey = keystoreProperties.getProperty("clerkProductionPublishableKey")
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
    namespace = "com.schooldb.support"
    compileSdk = 37

    if (keystorePropertiesFile.exists()) {
        signingConfigs {
            create("release") {
                storeFile = rootProject.file("../android/app/${keystoreProperties.getProperty("storeFile")}")
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    defaultConfig {
        applicationId = "com.schooldb.support"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "0.2.0"
        buildConfigField("String", "CLERK_PUBLISHABLE_KEY", "\"$clerkKey\"")
        buildConfigField("boolean", "FIREBASE_CONFIGURED", (firebaseConfigFile.exists() || kotakFirebaseConfigFile.exists()).toString())
        // Safe generic defaults. Each school flavor overrides these values.
        buildConfigField("String", "DEFAULT_SCHOOL_SLUG", "\"\"")
        buildConfigField("String", "BRAND_SCHOOL_NAME", "\"School Support\"")
        buildConfigField("String", "BRAND_SHORT_NAME", "\"SCHOOL SUPPORT\"")
        buildConfigField("String", "BRAND_LOCATION", "\"\"")
        buildConfigField("String", "BRAND_SUPPORT_LABEL", "\"SUPPORT\"")
        buildConfigField("Long", "BRAND_PRIMARY_COLOR", "0xFF235A8CL")
        buildConfigField("Long", "BRAND_SECONDARY_COLOR", "0xFF2E7D4FL")
        buildConfigField("Long", "BRAND_ACCENT_COLOR", "0xFFE0A62BL")
        buildConfigField("Long", "BRAND_DANGER_COLOR", "0xFFC7352EL")
        resValue("string", "brand_app_name", "School Support")
    }

    flavorDimensions += "school"

productFlavors {

    // Existing/demo app
    create("demo") {
        dimension = "school"

        // Preserve existing Firebase / installed app identity
        applicationId = "com.schooldb.support"

        buildConfigField("String", "DEFAULT_SCHOOL_SLUG", "\"demo\"")
        buildConfigField("String", "BRAND_SCHOOL_NAME", "\"Kotak Salesian School\"")
        buildConfigField("String", "BRAND_SHORT_NAME", "\"KOTAK SALESIAN SCHOOL\"")
        buildConfigField("String", "BRAND_LOCATION", "\"Visakhapatnam\"")
        buildConfigField("String", "BRAND_SUPPORT_LABEL", "\"KOTAK SUPPORT\"")

        buildConfigField("Long", "BRAND_PRIMARY_COLOR", "0xFF235A8CL")
        buildConfigField("Long", "BRAND_SECONDARY_COLOR", "0xFF2E7D4FL")
        buildConfigField("Long", "BRAND_ACCENT_COLOR", "0xFFE0A62BL")
        buildConfigField("Long", "BRAND_DANGER_COLOR", "0xFFC7352EL")

        resValue("string", "brand_app_name", "Kotak Salesian School Demo")
    }

    // Actual Kotak school
    create("kotak") {
        dimension = "school"

        // Separate Android app
        applicationId = "com.schooldb.support.kotak"

        buildConfigField("String", "DEFAULT_SCHOOL_SLUG", "\"kotak\"")
        buildConfigField("String", "BRAND_SCHOOL_NAME", "\"Kotak Salesian School\"")
        buildConfigField("String", "BRAND_SHORT_NAME", "\"KOTAK SALESIAN SCHOOL\"")
        buildConfigField("String", "BRAND_LOCATION", "\"Visakhapatnam\"")
        buildConfigField("String", "BRAND_SUPPORT_LABEL", "\"KOTAK SUPPORT\"")

        buildConfigField("Long", "BRAND_PRIMARY_COLOR", "0xFF235A8CL")
        buildConfigField("Long", "BRAND_SECONDARY_COLOR", "0xFF2E7D4FL")
        buildConfigField("Long", "BRAND_ACCENT_COLOR", "0xFFE0A62BL")
        buildConfigField("Long", "BRAND_DANGER_COLOR", "0xFFC7352EL")

        resValue("string", "brand_app_name", "Kotak Salesian School")
    }
}

    buildTypes {
    getByName("debug") {
        resValue("bool", "uses_cleartext_traffic", "true")
        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"${apiBaseUrl("http://10.0.2.2:3000/")}\""
        )
    }

    getByName("release") {
        resValue("bool", "uses_cleartext_traffic", "false")
        isMinifyEnabled = false
        if (keystorePropertiesFile.exists()) {
            signingConfig = signingConfigs.getByName("release")
        }
        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"${apiBaseUrl("https://www.schooldb.co.in/")}\""
        )
        buildConfigField(
            "String",
            "CLERK_PUBLISHABLE_KEY",
            "\"$productionClerkKey\""
        )
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
    val firebaseBom = platform("com.google.firebase:firebase-bom:34.19.0")
    implementation(composeBom)
    implementation(firebaseBom)
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
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
