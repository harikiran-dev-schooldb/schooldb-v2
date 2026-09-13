package com.schooldb.mobile.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.clerk.api.Clerk
import com.schooldb.mobile.BuildConfig
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AuthViewModel(
    private val repository: AuthRepository = AuthRepository(),
    private val sessionManager: AuthSessionManager = AuthSessionManager(),
) : ViewModel() {
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isNotBlank()) {
            viewModelScope.launch {
                combine(Clerk.isInitialized, Clerk.userFlow) { initialized, user ->
                    initialized to (user != null)
                }.collect { (initialized, signedIn) ->
                    if (signedIn) {
                        _uiState.value = AuthUiState(AuthStep.SignedIn)
                    } else if (initialized && _uiState.value.step is AuthStep.SignedIn) {
                        _uiState.value = AuthUiState()
                    }
                }
            }
        }
    }

    fun sendOtp(schoolSlug: String, phone: String) {
        val cleanSchool = schoolSlug.trim().lowercase()
        val cleanPhone = phone.filter(Char::isDigit).takeLast(10)
        if (cleanSchool.isBlank()) return showMessage("Enter your school code.")
        if (cleanPhone.length != 10) return showMessage("Enter a valid 10-digit mobile number.")

        runRequest {
            repository.sendOtp(cleanSchool, cleanPhone)
            _uiState.value = AuthUiState(step = AuthStep.Verify(cleanSchool, cleanPhone))
        }
    }

    fun verifyOtp(otp: String) {
        val current = _uiState.value.step as? AuthStep.Verify ?: return
        val cleanOtp = otp.filter(Char::isDigit)
        if (cleanOtp.length != 6) return showMessage("Enter the 6-digit code.")

        runRequest {
            when (val result = repository.verifyOtp(current.schoolSlug, current.phone, cleanOtp)) {
                is VerifyResult.SignedIn -> finishSignIn(result.token)
                is VerifyResult.ChooseAccount -> _uiState.value = AuthUiState(
                    AuthStep.ChooseAccount(current.schoolSlug, result.challengeId, result.accounts),
                )
            }
        }
    }

    fun selectAccount(accountId: String) {
        val current = _uiState.value.step as? AuthStep.ChooseAccount ?: return
        runRequest {
            when (val result = repository.selectAccount(current.schoolSlug, current.challengeId, accountId)) {
                is VerifyResult.SignedIn -> finishSignIn(result.token)
                is VerifyResult.ChooseAccount -> showMessage("Please choose an account.")
            }
        }
    }

    fun backToSignIn() {
        _uiState.value = AuthUiState()
    }

    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null)
    }

    private fun runRequest(block: suspend () -> Unit) {
        if (_uiState.value.loading) return
        _uiState.value = _uiState.value.copy(loading = true, message = null)
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { block() }
            } catch (error: Exception) {
                val message = when (error) {
                    is AuthException -> error.message
                    is IOException -> "Cannot reach SchoolDB. Check your connection and server address."
                    else -> "Something went wrong. Please try again."
                }
                _uiState.value = _uiState.value.copy(loading = false, message = message)
            }
        }
    }

    private fun showMessage(message: String) {
        _uiState.value = _uiState.value.copy(loading = false, message = message)
    }

    private suspend fun finishSignIn(ticket: String) {
        sessionManager.activate(ticket)
        _uiState.value = AuthUiState(AuthStep.SignedIn)
    }
}
