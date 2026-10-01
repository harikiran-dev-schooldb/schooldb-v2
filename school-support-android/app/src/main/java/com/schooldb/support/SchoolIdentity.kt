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
        try {
            val bytes = read(URL(base, path), 5 * 1024 * 1024)
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
            var sample = 1
            while (bounds.outWidth / sample > 256 || bounds.outHeight / sample > 256) sample *= 2
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
        } catch (cancelled: CancellationException) { throw cancelled }
        catch (_: Exception) { null }
    }
    SchoolIdentity(school.getString("name"), bitmap)
}

@Composable
internal fun SchoolIdentityMark(identity: SchoolIdentity?, modifier: Modifier = Modifier) {
    if (identity?.logo == null) { BrandMark(modifier); return }
    Surface(modifier, shape = MaterialTheme.shapes.medium, color = androidx.compose.ui.graphics.Color.White) {
        Image(identity.logo.asImageBitmap(), "${identity.name} logo",
            Modifier.fillMaxSize().padding(3.dp), contentScale = ContentScale.Fit)
    }
}
