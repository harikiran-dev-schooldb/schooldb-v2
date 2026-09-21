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

class NoticeViewModel(
    private val repository: NoticeRepository = NoticeRepository(),
) : ViewModel() {
    private val _uiState = MutableStateFlow(NoticeUiState())
    val uiState: StateFlow<NoticeUiState> = _uiState.asStateFlow()

    fun refresh() {
        _uiState.value = _uiState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val (unread, items) = withContext(Dispatchers.IO) { repository.load() }
                _uiState.value = _uiState.value.copy(
                    items = items,
                    unreadCount = unread,
                    loading = false,
                    error = null,
                )
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun open(item: NoticeItem) {
        _uiState.value = _uiState.value.copy(selected = item)
        if (item.read) return
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { repository.markRead(item.id) }
                val updated = item.copy(read = true)
                _uiState.value = _uiState.value.copy(
                    selected = updated,
                    items = _uiState.value.items.map { if (it.id == item.id) updated else it },
                    unreadCount = (_uiState.value.unreadCount - 1).coerceAtLeast(0),
                )
            } catch (_: Exception) {
                // The notice remains readable even if the read receipt cannot be saved.
            }
        }
    }

    fun close() {
        _uiState.value = _uiState.value.copy(selected = null)
    }

    private fun fail(error: Exception) {
        val text = when (error) {
            is ApiException -> error.message
            is IOException -> "Cannot reach SchoolDB. Check the server and your connection."
            else -> "Something went wrong. Please try again."
        }
        _uiState.value = _uiState.value.copy(loading = false, error = text)
    }
}
