package com.schooldb.mobile.network

import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream

internal const val MAX_MOBILE_DOWNLOAD_BYTES = 5 * 1024 * 1024

internal class DownloadTooLargeException :
    IOException("Document must be 5 MB or smaller.")

internal fun InputStream.readBytesWithLimit(
    maxBytes: Int = MAX_MOBILE_DOWNLOAD_BYTES,
): ByteArray {
    require(maxBytes >= 0) { "maxBytes must not be negative" }
    val output = ByteArrayOutputStream(minOf(maxBytes, DEFAULT_BUFFER_SIZE))
    val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
    var total = 0
    while (true) {
        val count = read(buffer)
        if (count < 0) break
        total += count
        if (total > maxBytes) throw DownloadTooLargeException()
        output.write(buffer, 0, count)
    }
    return output.toByteArray()
}
