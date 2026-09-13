package com.schooldb.mobile.auth

data class AccountSwitchChoice(
    val id: String,
    val name: String,
    val role: String,
    val detail: String,
    val current: Boolean,
)

data class AccountSwitchUiState(
    val accounts: List<AccountSwitchChoice> = emptyList(),
    val loading: Boolean = true,
    val switchingId: String? = null,
    val error: String? = null,
)
