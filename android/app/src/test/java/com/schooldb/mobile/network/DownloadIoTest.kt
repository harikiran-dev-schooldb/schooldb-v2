package com.schooldb.mobile.network

import java.io.ByteArrayInputStream
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DownloadIoTest {
    @Test
    fun readsPayloadAtTheLimit() {
        val payload = ByteArray(32) { it.toByte() }

        assertArrayEquals(payload, ByteArrayInputStream(payload).readBytesWithLimit(32))
    }

    @Test
    fun rejectsPayloadBeyondTheLimitWithoutReturningIt() {
        val failure = runCatching {
            ByteArrayInputStream(ByteArray(33)).readBytesWithLimit(32)
        }.exceptionOrNull()

        assertTrue(failure is DownloadTooLargeException)
    }
}
