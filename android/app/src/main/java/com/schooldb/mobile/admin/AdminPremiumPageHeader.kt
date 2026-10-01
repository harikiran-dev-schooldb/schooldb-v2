package com.schooldb.mobile.admin

import android.app.Activity
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
    AdminDarkStatusBarEffect()
    val shape = RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp)
    Box(
        modifier.fillMaxWidth()
            .shadow(14.dp, shape, ambientColor = HeaderIndigo.copy(alpha = .20f),
                spotColor = HeaderIndigo.copy(alpha = .23f))
            .clip(shape)
            .background(Brush.linearGradient(listOf(
                Color(0xFF10172D), Color(0xFF302568), Color(0xFF125B68),
            )))
            .statusBarsPadding(),
    ) {
        Box(Modifier.size(150.dp).align(Alignment.TopEnd)
            .background(Color(0xFF9FCBFF).copy(alpha = .10f), CircleShape))
        Box(Modifier.size(94.dp).align(Alignment.BottomStart)
            .background(Color(0xFFD6A4FF).copy(alpha = .08f), CircleShape))
        Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 13.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically) {
                AdminPremiumHeaderButton(
                    onClick = onBack,
                    enabled = backEnabled,
                    contentDescription = "Back",
                ) {
                    Icon(Lucide.ArrowLeft, null, tint = Color.White, modifier = Modifier.size(20.dp))
                }
                if (actionIcon != null && onAction != null) {
                    AdminPremiumHeaderButton(
                        onClick = onAction,
                        enabled = actionEnabled,
                        contentDescription = actionDescription,
                    ) {
                        Icon(actionIcon, null, tint = Color.White, modifier = Modifier.size(20.dp))
                    }
                } else {
                    Spacer(Modifier.size(42.dp))
                }
            }
            Spacer(Modifier.size(15.dp))
            Text(eyebrow, color = Color(0xFFAFC1FF), fontSize = 9.sp,
                fontWeight = FontWeight.ExtraBold, letterSpacing = 1.25.sp)
            Text(title, color = Color.White, fontSize = 28.sp, lineHeight = 33.sp,
                fontWeight = FontWeight.ExtraBold, letterSpacing = (-.4).sp,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(subtitle, Modifier.padding(top = 4.dp), color = Color.White.copy(alpha = .67f),
                fontSize = 12.sp, lineHeight = 17.sp, maxLines = 2,
                overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.size(8.dp))
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
        color = Color.White.copy(alpha = if (enabled) .11f else .06f),
        border = BorderStroke(1.dp, Color.White.copy(alpha = if (enabled) .16f else .08f)),
    ) {
        Box(contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
internal fun AdminDarkStatusBarEffect() {
    val view = LocalView.current
    DisposableEffect(view) {
        val window = (view.context as? Activity)?.window
        val controller = window?.let { WindowCompat.getInsetsController(it, view) }
        val previous = controller?.isAppearanceLightStatusBars
        controller?.isAppearanceLightStatusBars = false
        onDispose {
            if (previous != null) controller.isAppearanceLightStatusBars = previous
        }
    }
}

private val HeaderIndigo = Color(0xFF302568)
