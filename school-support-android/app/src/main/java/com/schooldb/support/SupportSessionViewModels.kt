package com.schooldb.support

import androidx.lifecycle.ViewModel
import com.schooldb.support.tickets.AdminAccount
import com.schooldb.support.tickets.AdminAccounts
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class SupportAuthUiState(
    val school: String = "",
    val phone: String = "",
    val code: String = "",
    val challenge: String = "",
    val accounts: List<Pair<String, String>> = emptyList(),
)

class SupportAuthViewModel : ViewModel() {
    private val _state = MutableStateFlow(SupportAuthUiState())
    val state = _state.asStateFlow()

    fun initializeSchool(school: String) {
        if (_state.value.school.isBlank()) _state.update { it.copy(school = school) }
    }

    fun setSchool(value: String) = _state.update { it.copy(school = value.trim()) }
    fun setPhone(value: String) = _state.update { it.copy(phone = value.filter(Char::isDigit).take(10)) }
    fun setCode(value: String) = _state.update { it.copy(code = value.filter(Char::isDigit).take(6)) }

    fun setAccountSelection(challenge: String, accounts: List<Pair<String, String>>) {
        _state.update { it.copy(challenge = challenge, accounts = accounts) }
    }

    fun clearCredentials() {
        _state.update { it.copy(phone = "", code = "", challenge = "", accounts = emptyList()) }
    }

    fun clearAll(defaultSchool: String = "") {
        _state.value = SupportAuthUiState(school = defaultSchool)
    }
}

data class SupportAdminUiState(
    val accounts: AdminAccounts? = null,
    val selected: AdminAccount? = null,
)

class SupportAdminViewModel : ViewModel() {
    private val _state = MutableStateFlow(SupportAdminUiState())
    val state = _state.asStateFlow()

    fun setAccounts(value: AdminAccounts?) = _state.update { it.copy(accounts = value) }
    fun select(value: AdminAccount?) = _state.update { it.copy(selected = value) }
    fun reset() { _state.value = SupportAdminUiState() }
}
