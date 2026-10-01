package com.schooldb.support

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.CancellationException
import org.json.JSONObject
import java.net.URL
import java.net.HttpURLConnection

internal data class SchoolIdentity(val name: String, val logo: Bitmap?)

/** App-private, school-scoped storage survives process death and RAM cleanup. */
internal class SchoolIdentityCache(context: android.content.Context) {
    private val directory = java.io.File(context.filesDir, "school-branding")
    private fun file(slug: String): android.util.AtomicFile {
        val key = java.security.MessageDigest.getInstance("SHA-256")
            .digest(slug.toByteArray()).joinToString("") { "%02x".format(it) }
        return android.util.AtomicFile(java.io.File(directory, "$key.json"))
    }

    suspend fun read(slug: String): SchoolIdentity? = withContext(Dispatchers.IO) {
        try {
            val json = JSONObject(file(slug).openRead().use { it.bufferedReader().readText() })
            val logo = json.optString("logo").takeIf { it.isNotBlank() }?.let {
                val bytes = android.util.Base64.decode(it, android.util.Base64.NO_WRAP)
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            }
            SchoolIdentity(json.getString("name"), logo)
        } catch (cancelled: CancellationException) { throw cancelled }
        catch (_: Exception) { null }
    }

    suspend fun write(slug: String, identity: SchoolIdentity) = withContext(Dispatchers.IO) {
        directory.mkdirs()
        val logo = identity.logo?.let { bitmap ->
            val bytes = java.io.ByteArrayOutputStream()
            check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, bytes))
            android.util.Base64.encodeToString(bytes.toByteArray(), android.util.Base64.NO_WRAP)
        }.orEmpty()
        val bytes = JSONObject().put("name", identity.name).put("logo", logo).toString().toByteArray()
        val target = file(slug)
        val stream = target.startWrite()
        try {
            stream.write(bytes)
            target.finishWrite(stream)
        } catch (error: Exception) {
            target.failWrite(stream)
            throw error
        }
    }
}

internal suspend fun loadSchoolIdentity(slug: String): SchoolIdentity = withContext(Dispatchers.IO) {
    val base = URL(BuildConfig.API_BASE_URL)
    fun read(url: URL, maxBytes: Int): ByteArray {
        require(url.host == base.host && url.protocol == base.protocol)
        val connection = url.openConnection() as HttpURLConnection
        return try {
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.instanceFollowRedirects = false
            check(connection.responseCode == 200)
            connection.inputStream.use { stream ->
                val output = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(8192)
                while (true) {
                    val count = stream.read(buffer)
                    if (count < 0) break
                    check(output.size() + count <= maxBytes)
                    output.write(buffer, 0, count)
                }
                output.toByteArray()
            }
        } finally { connection.disconnect() }
    }
    val encoded = java.net.URLEncoder.encode(slug, "UTF-8")
    val school = JSONObject(String(read(URL(base, "api/v1/public/schools/$encoded/branding"), 64 * 1024), Charsets.UTF_8))
        .getJSONObject("data").getJSONObject("school")
    val logoPath = school.optString("logo").takeIf { it.isNotBlank() && it != "null" }
    val bitmap = logoPath?.let { path ->
            val bytes = read(URL(base, path), 5 * 1024 * 1024)
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
            var sample = 1
            while (bounds.outWidth / sample > 256 || bounds.outHeight / sample > 256) sample *= 2
            checkNotNull(BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample }))
    }
    SchoolIdentity(school.getString("name"), bitmap)
}

@Composable
internal fun SchoolIdentityMark(identity: SchoolIdentity?, modifier: Modifier = Modifier, loading: Boolean = false) {
    if (loading && identity == null) {
        Surface(modifier, shape = MaterialTheme.shapes.medium, color = Indigo.copy(alpha = .08f)) { }
        return
    }
    if (identity?.logo == null) { BrandMark(modifier); return }
    Surface(modifier, shape = MaterialTheme.shapes.medium, color = androidx.compose.ui.graphics.Color.White) {
        Image(identity.logo.asImageBitmap(), "${identity.name} logo",
            Modifier.fillMaxSize().padding(3.dp), contentScale = ContentScale.Fit)
    }
}
