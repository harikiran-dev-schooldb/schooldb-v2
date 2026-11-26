package com.schooldb.support

import com.schooldb.support.tickets.TicketStatus
import com.schooldb.support.tickets.StaffOption
import org.junit.Assert.*
import org.junit.Test

class GuidedSupportTest {
    @Test fun guidedTransitionsAreAllowed() {
        TicketStatus.entries.forEach { status ->
            listOf(true, false).forEach { assigned ->
                val action = guidedAction(status, assigned)
                action.nextStatus?.let { assertTrue(it in validNextStatuses(status)) }
            }
        }
    }

    @Test fun roleAndWorkloadRankingIsDeterministic() {
        val staff = listOf(StaffOption("a", "A", "TEACHER", 0),
            StaffOption("b", "B", "ACCOUNTANT", 4), StaffOption("c", "C", "ACCOUNTANT", 1))
        assertEquals("c", rankStaff("FEES", staff).first().id)
        assertEquals("a", rankStaff("MAINTENANCE", staff).first().id)
    }
}
