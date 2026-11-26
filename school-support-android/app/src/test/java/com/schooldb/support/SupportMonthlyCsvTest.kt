package com.schooldb.support

import org.junit.Assert.assertEquals
import org.junit.Test

class SupportMonthlyCsvTest {
    @Test fun escapesQuotesAndNeutralizesFormulaCells() {
        assertEquals("\"a,b\"", supportCsvCell("a,b"))
        assertEquals("\"a\"\"b\"", supportCsvCell("a\"b"))
        assertEquals("\"'=1+1\"", supportCsvCell("=1+1"))
        assertEquals("\"42\"", supportCsvCell("42"))
    }
}
