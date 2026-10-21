package com.schooldb.support

enum class SupportPage {
    LOADING,
    LOGIN,
    EMAIL_LOGIN,
    OTP,
    EMAIL_OTP,
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
    PROFILE("Profile"),
}

internal fun shouldLockSupportApp(isAuthenticated: Boolean, secureReentry: Boolean): Boolean =
    isAuthenticated && secureReentry
