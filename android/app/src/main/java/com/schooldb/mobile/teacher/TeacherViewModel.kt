package com.schooldb.mobile.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.clerk.api.Clerk
import com.clerk.api.network.serialization.errorMessage
import com.clerk.api.network.serialization.onFailure
import com.schooldb.mobile.network.ApiException
import com.schooldb.mobile.notifications.PushNotificationManager
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class TeacherViewModel(
    private val repository: TeacherRepository = TeacherRepository(),
) : ViewModel() {
    private val _uiState = MutableStateFlow(TeacherUiState())
    val uiState: StateFlow<TeacherUiState> = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        _uiState.value = _uiState.value.copy(loading = true, message = null, error = null)
        viewModelScope.launch {
            try {
                val context = withContext(Dispatchers.IO) { repository.context() }
                val dashboard = if (context.role == "TEACHER") {
                    withContext(Dispatchers.IO) { repository.dashboard() }
                } else {
                    null
                }
                _uiState.value = TeacherUiState(
                    context = context,
                    dashboard = dashboard,
                    loading = false,
                )
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun openAttendance(period: TeachingPeriod) {
        if (period.attendanceLocked) return showMessage("This attendance session is locked.")
        _uiState.value = _uiState.value.copy(loading = true, message = null)
        viewModelScope.launch {
            try {
                val sheet = withContext(Dispatchers.IO) { repository.openAttendance(period) }
                _uiState.value = _uiState.value.copy(attendanceSheet = sheet, loading = false)
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun openDailyAttendance(target: DailyAttendanceTarget) {
        if (target.attendanceLocked) return showMessage("This attendance session is locked.")
        _uiState.value = _uiState.value.copy(loading = true, message = null, error = null)
        viewModelScope.launch {
            try {
                val sheet = withContext(Dispatchers.IO) { repository.openDailyAttendance(target) }
                _uiState.value = _uiState.value.copy(attendanceSheet = sheet, loading = false)
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun setStatus(studentId: String, status: AttendanceStatus) {
        val sheet = _uiState.value.attendanceSheet ?: return
        _uiState.value = _uiState.value.copy(
            attendanceSheet = sheet.copy(
                students = sheet.students.map { student ->
                    if (student.studentId == studentId) student.copy(status = status) else student
                },
            ),
        )
    }

    fun saveAttendance() {
        val sheet = _uiState.value.attendanceSheet ?: return
        if (sheet.students.isEmpty()) return showMessage("There are no active students in this class.")
        _uiState.value = _uiState.value.copy(saving = true, message = null)
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { repository.saveAttendance(sheet) }
                val dashboard = withContext(Dispatchers.IO) { repository.dashboard() }
                _uiState.value = TeacherUiState(
                    context = _uiState.value.context,
                    dashboard = dashboard,
                    loading = false,
                    message = "Attendance saved successfully.",
                )
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun closeAttendance() {
        _uiState.value = _uiState.value.copy(attendanceSheet = null, message = null)
    }

    fun signOut() {
        viewModelScope.launch {
            withContext(Dispatchers.IO) { PushNotificationManager.unregisterCurrentDevice() }
            Clerk.auth.signOut().onFailure { showMessage(it.errorMessage) }
        }
    }

    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null)
    }

    private fun fail(error: Exception) {
        val message = when (error) {
            is ApiException -> error.message
            is IOException -> "Cannot reach SchoolDB. Check the server and your connection."
            else -> "Something went wrong. Please try again."
        }
        _uiState.value = _uiState.value.copy(loading = false, saving = false, error = message)
    }

    private fun showMessage(message: String) {
        _uiState.value = _uiState.value.copy(loading = false, saving = false, message = message)
    }
}
