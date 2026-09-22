package com.schooldb.support

enum class SupportPage {
    LOADING,
    LOGIN,
    OTP,
    ACCOUNTS,
    DASHBOARD,
    CREATE_TICKET,
    TICKET_DETAIL,
    ADMINS,
    ADMIN_FORM,
}

enum class DashboardTab(val label: String) {
    OVERVIEW("Overview"),
    TICKETS("Tickets"),
    ANALYTICS("Analytics"),
}
