package com.schooldb.support.tickets

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.CancellationException

data class SupportTicketUiState(
    val tickets: List<TicketSummary> = emptyList(),
    val ticketsLoading: Boolean = false,
    val ticketsLoaded: Boolean = false,
    val isAdmin: Boolean = false,
    val canManageAdmins: Boolean = false,
    val summary: List<Int> = listOf(0, 0, 0, 0),
    val detail: TicketDetail? = null,
    val staff: List<StaffOption> = emptyList(),
    val analytics: SupportAnalytics? = null,
    val analyticsLoading: Boolean = false,
    val analyticsError: String? = null,
    val query: String = "",
    val filter: String = "ALL",
    val page: Int = 1,
    val total: Int = 0,
    val totalPages: Int = 1,
    val showingCachedData: Boolean = false,
    val cachedAt: Long? = null,
)

class SupportTicketViewModel(
    private val repository: SupportRepository = SupportRepository(),
) : ViewModel() {
    private val _state = MutableStateFlow(SupportTicketUiState())
    val state = _state.asStateFlow()

    fun setQuery(value: String) {
        _state.update { it.copy(query = value) }
    }

    fun setFilter(value: String) {
        _state.update { it.copy(filter = value, page = 1) }
    }

    fun setPage(value: Int) {
        _state.update { it.copy(page = value) }
    }

    suspend fun restoreCachedTickets(cache: SupportTicketCache, school: String) {
        if (state.value.ticketsLoaded) return
        val cached = withContext(Dispatchers.IO) { cache.read(school) } ?: return
        if (state.value.ticketsLoaded) return
        applyTicketList(cached.result, showingCachedData = true, cachedAt = cached.savedAt)
    }

    suspend fun loadTickets(
        school: String,
        filter: String = state.value.filter,
        query: String = state.value.query,
        targetPage: Int = state.value.page,
        cache: SupportTicketCache? = null,
    ) {
        _state.update { it.copy(ticketsLoading = true) }
        try {
            val result = repository.tickets(school, filter, query, targetPage)
            applyTicketList(result, showingCachedData = false, cachedAt = System.currentTimeMillis())
            if ((filter.isBlank() || filter == "ALL") && query.isBlank() && targetPage == 1) {
                withContext(Dispatchers.IO) { cache?.write(school, result) }
            }
        } catch (error: Throwable) {
            _state.update { it.copy(ticketsLoading = false) }
            throw error
        }
    }

    private fun applyTicketList(result: TicketList, showingCachedData: Boolean, cachedAt: Long?) {
        _state.update {
            it.copy(
                tickets = result.tickets,
                ticketsLoading = false,
                ticketsLoaded = true,
                isAdmin = result.isAdmin,
                canManageAdmins = result.canManageAdmins,
                summary = listOf(result.open, result.inProgress, result.urgent, result.resolved),
                page = result.page,
                total = result.total,
                totalPages = result.totalPages,
                showingCachedData = showingCachedData,
                cachedAt = cachedAt,
            )
        }
    }

    suspend fun loadDetail(school: String, id: String): TicketDetail {
        val ticket = repository.detail(school, id)
        _state.update { it.copy(detail = ticket) }
        return ticket
    }

    suspend fun loadStaff(school: String) {
        if (state.value.staff.isNotEmpty()) return
        val staff = repository.staff(school)
        _state.update { it.copy(staff = staff) }
    }

    suspend fun loadAnalytics(school: String, force: Boolean = false) {
        if (state.value.analyticsLoading) return
        if (!force && state.value.analytics != null) return
        _state.update { it.copy(analyticsLoading = true, analyticsError = null) }
        try {
            val analytics = repository.analytics(school)
            _state.update { it.copy(analytics = analytics, analyticsLoading = false) }
        } catch (error: CancellationException) {
            _state.update { it.copy(analyticsLoading = false) }
            throw error
        } catch (error: SupportSessionExpiredException) {
            _state.update { it.copy(analyticsLoading = false) }
            throw error
        } catch (error: Exception) {
            _state.update {
                it.copy(
                    analyticsLoading = false,
                    analyticsError = error.message ?: "Could not load analytics.",
                )
            }
        }
    }

    fun invalidateAnalytics() {
        _state.update { it.copy(analytics = null, analyticsError = null) }
    }

    fun clearDetail() {
        _state.update { it.copy(detail = null) }
    }

    fun reset() {
        _state.value = SupportTicketUiState()
    }
}
