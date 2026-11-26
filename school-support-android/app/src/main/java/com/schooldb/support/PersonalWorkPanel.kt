package com.schooldb.support

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.schooldb.support.tickets.PersonalWorkspace

@Composable
internal fun PersonalWorkPanel(work: PersonalWorkspace?, loading: Boolean, error: String?, busy: Boolean,
    onRefresh: () -> Unit, onQueue: (String) -> Unit, onTicket: (String) -> Unit) {
    SurfaceCard(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            SectionTitle("My work", "Your unresolved assignments and requests", Modifier.weight(1f))
            IconButton(onClick = onRefresh, enabled = !loading && !busy) {
                Icon(Icons.Outlined.Refresh, contentDescription = "Refresh my work", tint = Indigo)
            }
        }
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        if (error != null) {
            Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            TextButton(onClick = onRefresh, enabled = !loading && !busy) { Text("Retry") }
        }
        Spacer(Modifier.height(8.dp))
        WorkQueueRow("Assigned to me", work?.assigned, Indigo, !busy) { onQueue("MY_ACTIVE") }
        HorizontalDivider(color = Line)
        WorkQueueRow("Overdue resolution", work?.overdue, SchoolRed, !busy) { onQueue("MY_OVERDUE") }
        HorizontalDivider(color = Line)
        WorkQueueRow("Requests I raised", work?.raised, SchoolGreen, !busy) { onQueue("MY_RAISED") }
        if (work != null && work.tickets.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            Text("Priority assignments", fontWeight = FontWeight.Bold, color = Ink)
            run {
                Spacer(Modifier.height(8.dp))
                work.tickets.forEach { ticket ->
                    Surface(onClick = { onTicket(ticket.id) }, enabled = !busy, modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp), color = Canvas, border = BorderStroke(1.dp, Line)) {
                        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(ticket.ticketNo, color = Indigo, style = MaterialTheme.typography.labelSmall, modifier = Modifier.weight(1f))
                                Pill(ticket.priority, priorityTint(ticket.priority))
                            }
                            Text(ticket.subject, color = Ink, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Text(ticket.status.replace('_', ' '), color = Muted, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                }
            }
        }
    }
}

@Composable
private fun WorkQueueRow(label: String, count: Int?, color: Color, enabled: Boolean, onClick: () -> Unit) {
    Surface(onClick = onClick, enabled = enabled, color = MaterialTheme.colorScheme.surface) {
        Row(Modifier.fillMaxWidth().heightIn(min = 50.dp).padding(horizontal = 4.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(label, Modifier.weight(1f), color = Ink, style = MaterialTheme.typography.bodyMedium)
            Text(count?.toString() ?: "—", color = color, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.width(8.dp))
            Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
        }
    }
}
