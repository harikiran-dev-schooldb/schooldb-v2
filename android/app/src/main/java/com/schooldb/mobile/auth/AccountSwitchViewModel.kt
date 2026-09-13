package com.schooldb.mobile.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.schooldb.mobile.network.ApiException
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AccountSwitchViewModel(
    private val repository: AccountSwitchRepository = AccountSwitchRepository(),
    private val sessionManager: AuthSessionManager = AuthSessionManager(),
) : ViewModel() {
    private val _uiState = MutableStateFlow(AccountSwitchUiState())
    val uiState: StateFlow<AccountSwitchUiState> = _uiState.asStateFlow()

    fun refresh() {
        _uiState.value = _uiState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val accounts = withContext(Dispatchers.IO) { repository.accounts() }
                _uiState.value = AccountSwitchUiState(accounts = accounts, loading = false)
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun switchAccount(account: AccountSwitchChoice, onComplete: () -> Unit) {
        if (account.current || _uiState.value.switchingId != null) return
        _uiState.value = _uiState.value.copy(switchingId = account.id, error = null)
        viewModelScope.launch {
            try {
                val ticket = withContext(Dispatchers.IO) { repository.switch(account.id) }
                    ?: throw AuthException("The server did not return an account session.")
                sessionManager.activate(ticket)
                onComplete()
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    private fun fail(error: Exception) {
        val message = when (error) {
            is ApiException, is AuthException -> error.message ?: "Account switch failed."
            is IOException -> "Cannot reach SchoolDB. Check your connection."
            else -> "Account switch failed. Please try again."
        }
        _uiState.value = _uiState.value.copy(loading = false, switchingId = null, error = message)
    }
}
