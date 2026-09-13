package com.schooldb.mobile.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.schooldb.mobile.network.ApiException
import java.io.IOException
import java.time.LocalDate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class HomeworkViewModel(
    private val repository: HomeworkRepository = HomeworkRepository(),
) : ViewModel() {
    private val _uiState = MutableStateFlow(HomeworkUiState())
    val uiState: StateFlow<HomeworkUiState> = _uiState.asStateFlow()

    init { refresh() }

    fun refresh() {
        _uiState.value = _uiState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val (allocations, items) = withContext(Dispatchers.IO) { repository.load() }
                _uiState.value = _uiState.value.copy(
                    allocations = allocations,
                    items = items,
                    loading = false,
                    error = null,
                )
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun startCreating() {
        _uiState.value = _uiState.value.copy(showForm = true, editingItem = null, message = null, error = null)
    }

    fun startEditing(item: HomeworkItem) {
        _uiState.value = _uiState.value.copy(showForm = true, editingItem = item, message = null, error = null)
    }

    fun cancelCreating() {
        _uiState.value = _uiState.value.copy(
            showForm = false,
            editingItem = null,
            saving = false,
            message = null,
            error = null,
        )
    }

    fun publish(allocationId: String?, title: String, description: String, dueDate: String) {
        if (allocationId == null) return message("Choose a class, section and subject.")
        if (title.isBlank()) return message("Enter a homework title.")
        val parsedDueDate = runCatching { LocalDate.parse(dueDate) }.getOrNull()
            ?: return message("Enter the due date as YYYY-MM-DD.")
        if (parsedDueDate.isBefore(LocalDate.now())) return message("Due date cannot be before today.")

        _uiState.value = _uiState.value.copy(saving = true, message = null, error = null)
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    repository.save(
                        _uiState.value.editingItem?.id,
                        allocationId,
                        title.trim(),
                        description.trim(),
                        parsedDueDate.toString(),
                    )
                }
                val (allocations, items) = withContext(Dispatchers.IO) { repository.load() }
                _uiState.value = HomeworkUiState(
                    allocations = allocations,
                    items = items,
                    loading = false,
                    saving = false,
                    showForm = false,
                    message = if (_uiState.value.editingItem == null) {
                        "Homework published successfully."
                    } else {
                        "Homework updated successfully."
                    },
                )
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null)
    }

    private fun fail(error: Exception) {
        val text = when (error) {
            is ApiException -> error.message
            is IOException -> "Cannot reach SchoolDB. Check the server and your connection."
            else -> "Something went wrong. Please try again."
        }
        _uiState.value = _uiState.value.copy(loading = false, saving = false, error = text)
    }

    private fun message(text: String) {
        _uiState.value = _uiState.value.copy(message = text)
    }
}
