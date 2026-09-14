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
                    detailsLoading = selectedId != null,
                )
                if (selectedId != null) loadDetails(selectedId)
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
            _uiState.value = _uiState.value.copy(
                selectedStudentId = studentId,
                details = null,
                detailsLoading = true,
                detailsError = null,
                leaveMessage = null,
            )
            viewModelScope.launch { loadDetails(studentId) }
        }
    }

    fun refreshDetails() {
        val studentId = _uiState.value.selectedStudentId ?: return
        _uiState.value = _uiState.value.copy(detailsLoading = true, detailsError = null)
        viewModelScope.launch { loadDetails(studentId) }
    }

    fun submitLeave(startDate: String, endDate: String, reason: String) {
        val studentId = _uiState.value.selectedStudentId ?: return
        _uiState.value = _uiState.value.copy(leaveSaving = true, leaveMessage = null)
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { repository.submitLeave(studentId, startDate, endDate, reason) }
                if (_uiState.value.selectedStudentId == studentId) {
                    _uiState.value = _uiState.value.copy(
                        leaveSaving = false,
                        leaveMessage = "Leave request submitted for review.",
                    )
                    loadDetails(studentId)
                }
            } catch (error: Exception) {
                if (_uiState.value.selectedStudentId == studentId) {
                    _uiState.value = _uiState.value.copy(
                        leaveSaving = false,
                        leaveMessage = requestError(error, "Unable to submit the leave request."),
                    )
                }
            }
        }
    }

    fun cancelLeave(requestId: String) {
        val studentId = _uiState.value.selectedStudentId ?: return
        _uiState.value = _uiState.value.copy(leaveSaving = true, leaveMessage = null)
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { repository.cancelLeave(studentId, requestId) }
                if (_uiState.value.selectedStudentId == studentId) {
                    _uiState.value = _uiState.value.copy(
                        leaveSaving = false,
                        leaveMessage = "Leave request cancelled.",
                    )
                    loadDetails(studentId)
                }
            } catch (error: Exception) {
                if (_uiState.value.selectedStudentId == studentId) {
                    _uiState.value = _uiState.value.copy(
                        leaveSaving = false,
                        leaveMessage = requestError(error, "Unable to cancel the leave request."),
                    )
                }
            }
        }
    }

    private suspend fun loadDetails(studentId: String) {
        try {
            val details = withContext(Dispatchers.IO) { repository.details(studentId) }
            if (_uiState.value.selectedStudentId == studentId) {
                _uiState.value = _uiState.value.copy(
                    details = details,
                    detailsLoading = false,
                    detailsError = null,
                )
            }
        } catch (error: Exception) {
            if (_uiState.value.selectedStudentId == studentId) {
                val message = when (error) {
                    is ApiException -> error.message ?: "SchoolDB request failed."
                    is IOException -> "Cannot reach SchoolDB. Check the server and your connection."
                    else -> "Unable to load this student's details."
                }
                _uiState.value = _uiState.value.copy(
                    detailsLoading = false,
                    detailsError = message,
                )
            }
        }
    }

    private fun requestError(error: Exception, fallback: String) = when (error) {
        is ApiException -> error.message ?: fallback
        is IOException -> "Cannot reach SchoolDB. Check the server and your connection."
        else -> fallback
    }

}
