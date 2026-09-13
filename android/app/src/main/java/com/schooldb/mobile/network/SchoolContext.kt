package com.schooldb.mobile.network

import com.clerk.api.Clerk

object SchoolContext {
    fun schoolSlug(): String {
        val value = Clerk.activeUser?.publicMetadata?.get("schoolSlug")
            ?.toString()
            ?.trim('"')
            .orEmpty()
        if (value.isBlank() || value == "null") {
            throw ApiException("Your session has no school selected. Please sign in again.")
        }
        return value
    }
}
