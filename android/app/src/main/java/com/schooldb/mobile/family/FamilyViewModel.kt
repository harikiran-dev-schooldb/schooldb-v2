package com.schooldb.mobile.family

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

class FamilyViewModel(
    private val repository: FamilyRepository = FamilyRepository(),
) : ViewModel() {
    private val _uiState = MutableStateFlow(FamilyUiState())
    val uiState: StateFlow<FamilyUiState> = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        _uiState.value = _uiState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val dashboard = withContext(Dispatchers.IO) { repository.dashboard() }
                val previousSelection = _uiState.value.selectedStudentId
                val selectedId = dashboard.students
                    .firstOrNull { it.id == previousSelection }
                    ?.id
                    ?: dashboard.students.firstOrNull()?.id
                _uiState.value = FamilyUiState(
                    dashboard = dashboard,
                    selectedStudentId = selectedId,
                    loading = false,
                )
            } catch (error: Exception) {
                val message = when (error) {
                    is ApiException -> error.message ?: "SchoolDB request failed."
                    is IOException -> "Cannot reach SchoolDB. Check the server and your connection."
                    else -> "Something went wrong. Please try again."
                }
                _uiState.value = _uiState.value.copy(loading = false, error = message)
            }
        }
    }

    fun selectStudent(studentId: String) {
        if (_uiState.value.dashboard?.students?.any { it.id == studentId } == true) {
            _uiState.value = _uiState.value.copy(selectedStudentId = studentId)
        }
    }

}
