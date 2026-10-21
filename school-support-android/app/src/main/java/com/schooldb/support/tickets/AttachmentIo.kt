package com.schooldb.support.tickets

import java.io.ByteArrayOutputStream
import java.io.InputStream

internal const val MAX_SUPPORT_ATTACHMENT_BYTES = 5 * 1024 * 1024

internal class AttachmentTooLargeException :
    Exception("Attachment must be smaller than 5 MB.")

internal fun InputStream.readBytesWithLimit(
    maxBytes: Int = MAX_SUPPORT_ATTACHMENT_BYTES,
): ByteArray {
    require(maxBytes >= 0) { "maxBytes must not be negative" }
    val output = ByteArrayOutputStream(minOf(maxBytes, DEFAULT_BUFFER_SIZE))
    val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
    var total = 0
    while (true) {
        val count = read(buffer)
        if (count < 0) break
        total += count
        if (total > maxBytes) throw AttachmentTooLargeException()
        output.write(buffer, 0, count)
    }
    return output.toByteArray()
}
