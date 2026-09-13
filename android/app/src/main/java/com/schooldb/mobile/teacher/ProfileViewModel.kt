package com.schooldb.mobile.teacher

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

class ProfileViewModel(
    private val repository: ProfileRepository = ProfileRepository(),
) : ViewModel() {
    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        _uiState.value = _uiState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val profile = withContext(Dispatchers.IO) { repository.load() }
                _uiState.value = ProfileUiState(profile = profile, loading = false)
            } catch (error: Exception) {
                val message = when (error) {
                    is ApiException -> error.message
                    is IOException -> "Cannot reach SchoolDB. Check the server and your connection."
                    else -> "Something went wrong. Please try again."
                }
                _uiState.value = _uiState.value.copy(loading = false, error = message)
            }
        }
    }
}
