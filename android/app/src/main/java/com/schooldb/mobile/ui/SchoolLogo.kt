package com.schooldb.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage

@Composable
fun SchoolLogo(
    schoolName: String,
    imageUrl: String?,
    modifier: Modifier = Modifier,
    size: Dp = 44.dp,
) {
    var failed by remember(imageUrl) { mutableStateOf(false) }
    val shape = RoundedCornerShape(size * .28f)

    Box(
        modifier = modifier
            .size(size)
            .clip(shape)
            .background(
                Brush.linearGradient(
                    listOf(Color.White, Color(0xFFEEF2FF), Color(0xFFEDE9FE)),
                ),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Default.School,
            contentDescription = null,
            tint = Color(0xFF4F46E5),
            modifier = Modifier.size(size * .48f),
        )

        if (!imageUrl.isNullOrBlank() && !failed) {
            AsyncImage(
                model = imageUrl,
                contentDescription = "$schoolName logo",
                contentScale = ContentScale.Fit,
                onError = { failed = true },
                modifier = Modifier.fillMaxSize().padding(size * .08f),
            )
        }
    }
}
