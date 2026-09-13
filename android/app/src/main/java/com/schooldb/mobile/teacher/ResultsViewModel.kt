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

class ResultsViewModel(
    private val repository: ResultsRepository = ResultsRepository(),
) : ViewModel() {
    private val _uiState = MutableStateFlow(ResultsUiState())
    val uiState: StateFlow<ResultsUiState> = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        _uiState.value = _uiState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val schedules = withContext(Dispatchers.IO) { repository.loadSchedules() }
                _uiState.value = _uiState.value.copy(
                    schedules = schedules,
                    loading = false,
                    error = null,
                )
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun open(schedule: ResultSchedule) {
        _uiState.value = _uiState.value.copy(loading = true, error = null, message = null)
        viewModelScope.launch {
            try {
                val sheet = withContext(Dispatchers.IO) { repository.loadMarks(schedule) }
                _uiState.value = _uiState.value.copy(sheet = sheet, loading = false, error = null)
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun closeSheet() {
        _uiState.value = _uiState.value.copy(sheet = null, error = null, message = null)
    }

    fun setMarks(enrollmentId: String, value: String) {
        if (value.isNotEmpty() && value.toDoubleOrNull() == null) return
        updateStudent(enrollmentId) { it.copy(marks = value, status = "PRESENT") }
    }

    fun setStatus(enrollmentId: String, status: String) {
        updateStudent(enrollmentId) {
            it.copy(status = status, marks = if (status == "PRESENT") it.marks else "")
        }
    }

    fun save() {
        val sheet = _uiState.value.sheet ?: return
        if (!sheet.schedule.editable) return showMessage("This completed exam is read-only.")
        val invalid = sheet.students.firstOrNull { student ->
            student.status == "PRESENT" && student.marks.isNotBlank() &&
                (student.marks.toDoubleOrNull()?.let { it < 0 || it > sheet.schedule.maxMarks } != false)
        }
        if (invalid != null) {
            return showMessage("Marks for ${invalid.fullName} must be between 0 and ${sheet.schedule.maxMarks.displayNumber()}.")
        }

        _uiState.value = _uiState.value.copy(saving = true, message = null, error = null)
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { repository.save(sheet) }
                val refreshed = withContext(Dispatchers.IO) { repository.loadMarks(sheet.schedule) }
                _uiState.value = _uiState.value.copy(
                    sheet = refreshed,
                    saving = false,
                    message = "Marks saved successfully.",
                )
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null)
    }

    private fun updateStudent(enrollmentId: String, transform: (ResultStudent) -> ResultStudent) {
        val sheet = _uiState.value.sheet ?: return
        _uiState.value = _uiState.value.copy(
            sheet = sheet.copy(
                students = sheet.students.map {
                    if (it.enrollmentId == enrollmentId) transform(it) else it
                },
            ),
        )
    }

    private fun fail(error: Exception) {
        val text = when (error) {
            is ApiException -> error.message
            is IOException -> "Cannot reach SchoolDB. Check the server and your connection."
            else -> "Something went wrong. Please try again."
        }
        _uiState.value = _uiState.value.copy(loading = false, saving = false, error = text)
    }

    private fun showMessage(message: String) {
        _uiState.value = _uiState.value.copy(message = message)
    }
}
