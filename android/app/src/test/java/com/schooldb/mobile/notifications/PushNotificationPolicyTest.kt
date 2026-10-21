package com.schooldb.mobile.notifications

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PushNotificationPolicyTest {
    @Test
    fun acceptsOnlyTheActiveUsersSchool() {
        assertTrue(
            notificationBelongsToActiveSchool(
                hasActiveSession = true,
                activeUser = "user-1",
                activeSchool = "school-a",
                messageSchool = "school-a",
            ),
        )
        assertFalse(
            notificationBelongsToActiveSchool(
                hasActiveSession = true,
                activeUser = "user-1",
                activeSchool = "school-a",
                messageSchool = "school-b",
            ),
        )
    }

    @Test
    fun rejectsMessagesAfterLogoutOrWithoutScope() {
        assertFalse(notificationBelongsToActiveSchool(false, "user-1", "school-a", "school-a"))
        assertFalse(notificationBelongsToActiveSchool(true, null, "school-a", "school-a"))
        assertFalse(notificationBelongsToActiveSchool(true, "user-1", null, "school-a"))
        assertFalse(notificationBelongsToActiveSchool(true, "user-1", "school-a", null))
    }
}
