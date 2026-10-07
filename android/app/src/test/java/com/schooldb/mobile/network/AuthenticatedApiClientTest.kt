package com.schooldb.mobile.network

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class AuthenticatedApiClientTest {
    @Test
    fun cacheKeyIsScopedToTheSignedInUserAndSchool() {
        val firstUser = apiCacheKey("user-1", "school-a", "/api/v1/mobile/family/dashboard")
        val secondUser = apiCacheKey("user-2", "school-a", "/api/v1/mobile/family/dashboard")
        val secondSchool = apiCacheKey("user-1", "school-b", "/api/v1/mobile/family/dashboard")

        assertNotEquals(firstUser, secondUser)
        assertNotEquals(firstUser, secondSchool)
        assertEquals("user-1|school-a|api/v1/mobile/family/dashboard", firstUser)
    }
}
