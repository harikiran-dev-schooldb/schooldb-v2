package com.schooldb.mobile.family

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FamilyFlowPolicyTest {
    @Test
    fun onlyLatestDetailsRequestCanUpdateState() {
        val tracker = DetailsRequestTracker()

        val firstRequest = tracker.next()
        val secondRequest = tracker.next()

        assertFalse(tracker.isCurrent(firstRequest))
        assertTrue(tracker.isCurrent(secondRequest))
    }

    @Test
    fun studentAttendanceUsesSelectedMonth() {
        val records = attendanceRecords()

        val visible = attendanceRecordsForRole("STUDENT", records, "2026-10")

        assertEquals(listOf("october"), visible.map { it.id })
    }

    @Test
    fun parentAttendanceDoesNotHideOtherMonths() {
        val records = attendanceRecords()

        val visible = attendanceRecordsForRole("PARENT", records, "2026-10")

        assertEquals(records, visible)
    }

    private fun attendanceRecords() = listOf(
        FamilyAttendanceRecord(
            id = "september",
            date = "2026-09-30T00:00:00.000Z",
            sessionType = "DAILY",
            subjectName = null,
            status = "PRESENT",
            remarks = null,
        ),
        FamilyAttendanceRecord(
            id = "october",
            date = "2026-10-01T00:00:00.000Z",
            sessionType = "DAILY",
            subjectName = null,
            status = "ABSENT",
            remarks = null,
        ),
    )
}
