package com.schooldb.mobile.auth

data class SchoolAccount(
    val id: String,
    val name: String,
    val role: String,
)

sealed interface AuthStep {
    data object SignIn : AuthStep
    data class Verify(val schoolSlug: String, val phone: String) : AuthStep
    data class ChooseAccount(
        val schoolSlug: String,
        val challengeId: String,
        val accounts: List<SchoolAccount>,
    ) : AuthStep
    data object SignedIn : AuthStep
}

data class AuthUiState(
    val step: AuthStep = AuthStep.SignIn,
    val loading: Boolean = false,
    val message: String? = null,
)

sealed interface VerifyResult {
    data class SignedIn(val token: String) : VerifyResult
    data class ChooseAccount(
        val challengeId: String,
        val accounts: List<SchoolAccount>,
    ) : VerifyResult
}
