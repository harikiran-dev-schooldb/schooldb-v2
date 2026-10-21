package com.schooldb.mobile.family

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.schooldb.mobile.network.ApiException
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

internal suspend fun openFamilyDocument(
    context: Context,
    studentId: String,
    document: FamilyDocument,
): String? = try {
    val downloaded = withContext(Dispatchers.IO) {
        val response = FamilyRepository().downloadDocument(studentId, document.id)
        val directory = File(context.cacheDir, "document-previews").apply {
            mkdirs()
            listFiles()?.forEach { it.delete() }
        }
        val safeName = document.originalName
            .replace(Regex("[^A-Za-z0-9._-]"), "_")
            .take(120)
            .ifBlank { "document" }
        File(directory, "${document.id}-$safeName").apply {
            writeBytes(response.bytes)
        } to response.contentType
    }
    val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.files",
        downloaded.first,
    )
    val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, downloaded.second)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    runCatching { context.startActivity(intent) }
        .fold(
            onSuccess = { null },
            onFailure = { "No app can open this document type." },
        )
} catch (error: Exception) {
    if (error is ApiException) error.message else "Unable to open this document."
}
