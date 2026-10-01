package com.schooldb.mobile.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.schooldb.mobile.admin.AdminLightStatusBarEffect

/** Shared light web surface for role dashboards and their detail pages. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun WebTopAppBar(
    title: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    navigationIcon: @Composable () -> Unit = {},
    actions: @Composable RowScope.() -> Unit = {},
    colors: TopAppBarColors = TopAppBarDefaults.topAppBarColors(),
) {
    AdminLightStatusBarEffect()
    val shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp)
    Box(modifier.fillMaxWidth().clip(shape)
        .background(Brush.linearGradient(listOf(Color.White, Color(0xFFF1F3FF), Color(0xFFF5F3FF))))
        .border(1.dp, Color(0xFFE0E7FF), shape)) {
        TopAppBar(
            title = title, navigationIcon = navigationIcon, actions = actions,
            colors = colors.copy(containerColor = Color.Transparent,
                scrolledContainerColor = Color.Transparent,
                titleContentColor = Color(0xFF0F172A),
                navigationIconContentColor = Color(0xFF4F46E5),
                actionIconContentColor = Color(0xFF4F46E5)),
        )
    }
}
