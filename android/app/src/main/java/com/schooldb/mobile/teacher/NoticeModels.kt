package com.schooldb.mobile.teacher

data class NoticeItem(
    val id: String,
    val title: String,
    val body: String,
    val category: String,
    val priority: String,
    val targetLabel: String,
    val publishedAt: String,
    val read: Boolean,
)

data class NoticeUiState(
    val items: List<NoticeItem> = emptyList(),
    val unreadCount: Int = 0,
    val selected: NoticeItem? = null,
    val loading: Boolean = true,
    val error: String? = null,
)
