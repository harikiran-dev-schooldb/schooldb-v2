package com.schooldb.mobile.teacher

data class HomeworkAllocation(
    val id: String,
    val className: String,
    val sectionName: String,
    val subjectName: String,
) {
    val label: String get() = "$className · $sectionName · $subjectName"
}

data class HomeworkItem(
    val id: String,
    val allocationId: String?,
    val title: String,
    val description: String,
    val assignedDate: String,
    val dueDate: String?,
    val active: Boolean,
    val className: String,
    val sectionName: String,
    val subjectName: String,
)

data class HomeworkUiState(
    val allocations: List<HomeworkAllocation> = emptyList(),
    val items: List<HomeworkItem> = emptyList(),
    val loading: Boolean = true,
    val saving: Boolean = false,
    val showForm: Boolean = false,
    val editingItem: HomeworkItem? = null,
    val message: String? = null,
    val error: String? = null,
)
