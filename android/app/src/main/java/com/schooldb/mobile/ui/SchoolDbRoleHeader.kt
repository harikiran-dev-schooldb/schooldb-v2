package com.schooldb.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@Composable
fun SchoolDbRoleHeader(
    schoolName: String,
    schoolLogoUrl: String?,
    title: String,
    modifier: Modifier = Modifier,
    actions: @Composable BoxScope.() -> Unit = {},
) {
    val shape = RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp)
    Box(
        modifier.fillMaxWidth()
            .shadow(12.dp, shape, ambientColor = Color(0xFF0F172A).copy(alpha = 0.06f),
                spotColor = Color(0xFF0F172A).copy(alpha = 0.08f))
            .clip(shape)
            .background(Brush.linearGradient(listOf(Color.White, Color(0xFFF1F3FF), Color(0xFFF5F3FF))))
            .border(1.dp, Color(0xFFE0E7FF), shape),
    ) {
        Box(Modifier.size(150.dp).align(Alignment.TopEnd)
            .background(Color(0xFF4F46E5).copy(alpha = 0.05f), CircleShape))
        Row(
            Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 20.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SchoolLogo(schoolName = schoolName, imageUrl = schoolLogoUrl, size = 42.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    schoolName.uppercase(),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF64748B),
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    title,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color(0xFF0F172A),
                    fontWeight = FontWeight.Bold,
                )
            }
            Box(contentAlignment = Alignment.Center, content = actions)
        }
    }
}

@Composable
fun SchoolDbHeaderAction(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.size(42.dp),
        shape = CircleShape,
        color = Color(0xFFF1F3FF),
        border = BorderStroke(1.dp, Color(0xFFE0E7FF)),
    ) {
        Box(contentAlignment = Alignment.Center, content = content)
    }
}
