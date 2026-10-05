package com.schooldb.support

import com.schooldb.support.tickets.TicketStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SupportPoliciesTest {
    @Test
    fun principalDesignationIsShownInsteadOfGenericRole() {
        assertEquals("Principal", displayAccountRole("SCHOOL_ADMIN", "Principal"))
        assertEquals("Vice Principal", displayAccountRole("SCHOOL_ADMIN", "Vice Principal"))
        assertEquals("School admin", displayAccountRole("SCHOOL_ADMIN", null))
    }

    @Test
    fun statusChoicesMatchServerTransitions() {
        assertEquals(
            listOf(TicketStatus.REOPENED, TicketStatus.CLOSED),
            validNextStatuses(TicketStatus.RESOLVED),
        )
        assertEquals(listOf(TicketStatus.REOPENED), validNextStatuses(TicketStatus.CLOSED))
        assertTrue(TicketStatus.WAITING in validNextStatuses(TicketStatus.IN_PROGRESS))
        assertFalse(TicketStatus.REOPENED in validNextStatuses(TicketStatus.OPEN))
    }

    @Test
    fun timestampsAreRenderedInIndiaTime() {
        assertEquals("05 Oct 2026, 5:30 AM", formatSupportTimestamp("2026-10-05T00:00:00Z"))
        assertEquals("not-a-date", formatSupportTimestamp("not-a-date"))
    }
}
