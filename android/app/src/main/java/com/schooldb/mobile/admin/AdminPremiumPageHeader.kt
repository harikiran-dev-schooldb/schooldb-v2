package com.schooldb.mobile.admin

import android.app.Activity
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import com.composables.icons.lucide.ArrowLeft
import com.composables.icons.lucide.Lucide

@Composable
internal fun AdminPremiumPageHeader(
    title: String,
    subtitle: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    eyebrow: String = "SCHOOL COMMAND",
    backEnabled: Boolean = true,
    actionIcon: ImageVector? = null,
    actionDescription: String = "Page action",
    actionEnabled: Boolean = true,
    onAction: (() -> Unit)? = null,
) {
    AdminLightStatusBarEffect()
    val shape = RoundedCornerShape(bottomStart = 30.dp, bottomEnd = 30.dp)
    Box(
        modifier.fillMaxWidth()
            .shadow(14.dp, shape, ambientColor = HeaderNavy.copy(alpha = .07f),
                spotColor = HeaderNavy.copy(alpha = .10f))
            .clip(shape)
            .background(Brush.linearGradient(listOf(
                Color.White, Color(0xFFF7F8FF), Color(0xFFEEF2FF), Color(0xFFF7F3FF),
            )))
            .border(1.dp, HeaderBorder, shape)
            .statusBarsPadding(),
    ) {
        Box(Modifier.size(172.dp).align(Alignment.TopEnd)
            .background(Color(0xFF818CF8).copy(alpha = .075f), CircleShape))
        Box(Modifier.size(104.dp).align(Alignment.BottomStart)
            .background(Color(0xFFA78BFA).copy(alpha = .07f), CircleShape))
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically) {
                AdminPremiumHeaderButton(
                    onClick = onBack,
                    enabled = backEnabled,
                    contentDescription = "Back",
                ) {
                    Icon(Lucide.ArrowLeft, null, tint = HeaderIndigo, modifier = Modifier.size(20.dp))
                }
                if (actionIcon != null && onAction != null) {
                    AdminPremiumHeaderButton(
                        onClick = onAction,
                        enabled = actionEnabled,
                        contentDescription = actionDescription,
                    ) {
                        Icon(actionIcon, null, tint = HeaderIndigo, modifier = Modifier.size(20.dp))
                    }
                } else {
                    Spacer(Modifier.size(42.dp))
                }
            }
            Spacer(Modifier.size(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(6.dp).background(HeaderIndigo, CircleShape))
                Text(eyebrow, Modifier.padding(start = 8.dp), color = HeaderIndigo, fontSize = 9.sp,
                    fontWeight = FontWeight.ExtraBold, letterSpacing = 1.25.sp)
            }
            Text(title, Modifier.padding(top = 4.dp), color = HeaderNavy, fontSize = 29.sp, lineHeight = 34.sp,
                fontWeight = FontWeight.ExtraBold, letterSpacing = (-.4).sp,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(subtitle, Modifier.padding(top = 4.dp), color = HeaderSlate,
                fontSize = 12.sp, lineHeight = 17.sp, maxLines = 2,
                overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.size(10.dp))
        }
    }
}

@Composable
internal fun AdminPremiumHeaderButton(
    onClick: () -> Unit,
    contentDescription: String,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.size(42.dp).semantics { this.contentDescription = contentDescription },
        shape = CircleShape,
        color = if (enabled) Color.White.copy(alpha = .88f) else Color(0xFFF8FAFC),
        contentColor = HeaderIndigo,
        border = BorderStroke(1.dp, if (enabled) HeaderBorder else Color(0xFFE2E8F0)),
        shadowElevation = if (enabled) 2.dp else 0.dp,
    ) {
        Box(contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
internal fun AdminLightStatusBarEffect() {
    val view = LocalView.current
    DisposableEffect(view) {
        val window = (view.context as? Activity)?.window
        val controller = window?.let { WindowCompat.getInsetsController(it, view) }
        val previous = controller?.isAppearanceLightStatusBars
        controller?.isAppearanceLightStatusBars = true
        onDispose {
            if (previous != null) controller.isAppearanceLightStatusBars = previous
        }
    }
}

internal val AdminWebIndigo = Color(0xFF4F46E5)
internal val AdminWebNavy = Color(0xFF0F172A)
internal val AdminWebSlate = Color(0xFF64748B)
internal val AdminWebBorder = Color(0xFFE0E7FF)
internal val AdminWebTint = Color(0xFFF1F3FF)

private val HeaderIndigo = AdminWebIndigo
private val HeaderNavy = AdminWebNavy
private val HeaderSlate = AdminWebSlate
private val HeaderBorder = AdminWebBorder
