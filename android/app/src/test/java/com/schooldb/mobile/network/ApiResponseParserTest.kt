package com.schooldb.mobile.network

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ApiResponseParserTest {
    @Test
    fun parsesSuccessfulDataEnvelope() {
        val data = ApiResponseParser.parse("""{"data":{"students":42}}""", 200, "application/json")
        assertEquals(42, data.getInt("students"))
    }

    @Test
    fun acceptsEmptySuccessfulDeleteResponse() {
        assertEquals(0, ApiResponseParser.parse("", 204, null).length())
    }

    @Test
    fun preservesStructuredApiError() {
        val error = runCatching {
            ApiResponseParser.parse("""{"message":"Attendance is locked"}""", 409, "application/json")
        }.exceptionOrNull()
        assertEquals("Attendance is locked", error?.message)
    }

    @Test
    fun convertsHtmlFailureIntoSafeMessage() {
        val error = runCatching {
            ApiResponseParser.parse("<!DOCTYPE html><title>Error</title>", 502, "text/html")
        }.exceptionOrNull()
        assertEquals("SchoolDB is temporarily unavailable. Please try again.", error?.message)
    }

    @Test
    fun convertsUnauthorizedHtmlIntoSessionMessage() {
        val error = runCatching {
            ApiResponseParser.parse("<html>login</html>", 401, "text/html")
        }.exceptionOrNull()
        assertEquals("Your session expired. Please sign in again.", error?.message)
    }

    @Test
    fun rejectsSuccessfulResponseWithoutDataEnvelope() {
        val error = runCatching {
            ApiResponseParser.parse("""{"ok":true}""", 200, "application/json")
        }.exceptionOrNull()
        assertTrue(error is ApiException)
        assertEquals("SchoolDB returned an incomplete response. Please try again.", error?.message)
    }
}
