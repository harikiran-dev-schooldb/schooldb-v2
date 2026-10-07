package com.schooldb.mobile.ui

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

private val OfflineIndigo = Color(0xFF4F46E5)
private val OfflineViolet = Color(0xFF7C3AED)
private val OfflineInk = Color(0xFF0F172A)
private val OfflineMuted = Color(0xFF64748B)
private val OfflineMist = Color(0xFFF5F7FC)
private val OfflineIce = Color(0xFFEEF2FF)

@Composable
fun ConnectionStateScreen(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val offline = message.contains("reach", ignoreCase = true) ||
        message.contains("connection", ignoreCase = true) ||
        message.contains("network", ignoreCase = true)
    val transition = rememberInfiniteTransition(label = "offline-animation")
    val pulse by transition.animateFloat(
        initialValue = 0.82f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(2200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "offline-pulse",
    )
    val orbit by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(animation = tween(12_000)),
        label = "offline-orbit",
    )
    val floatOffset by transition.animateFloat(
        initialValue = 3f,
        targetValue = -5f,
        animationSpec = infiniteRepeatable(
            animation = tween(1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "offline-float",
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(OfflineIce.copy(alpha = 0.75f), OfflineMist, Color.White),
                ),
            )
            .padding(horizontal = 20.dp, vertical = 24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(32.dp),
            color = Color.White.copy(alpha = 0.96f),
            border = BorderStroke(1.dp, OfflineIndigo.copy(alpha = 0.12f)),
            shadowElevation = 12.dp,
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 26.dp, vertical = 30.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Surface(
                        modifier = Modifier.size(40.dp),
                        shape = RoundedCornerShape(13.dp),
                        color = OfflineIndigo,
                        shadowElevation = 5.dp,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("S", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                    Column {
                        Text("SchoolDB", color = OfflineInk, fontWeight = FontWeight.Bold)
                        Text(
                            if (offline) "Offline workspace" else "Connection problem",
                            style = MaterialTheme.typography.bodySmall,
                            color = OfflineMuted,
                        )
                    }
                }

                Spacer(Modifier.height(20.dp))

                Box(modifier = Modifier.size(210.dp), contentAlignment = Alignment.Center) {
                    Canvas(modifier = Modifier.fillMaxSize().alpha(0.9f)) {
                        val center = this.center
                        drawCircle(
                            color = OfflineIndigo.copy(alpha = 0.08f),
                            radius = size.minDimension * 0.47f * pulse,
                        )
                        drawCircle(
                            color = OfflineIndigo.copy(alpha = 0.2f),
                            radius = size.minDimension * 0.38f,
                            style = Stroke(width = 1.dp.toPx()),
                        )
                        drawCircle(
                            color = OfflineViolet.copy(alpha = 0.18f),
                            radius = size.minDimension * 0.29f,
                            style = Stroke(width = 1.dp.toPx()),
                        )
                        rotate(orbit, pivot = center) {
                            drawCircle(
                                color = OfflineIndigo,
                                radius = 4.dp.toPx(),
                                center = androidx.compose.ui.geometry.Offset(
                                    center.x - size.minDimension * 0.38f,
                                    center.y,
                                ),
                            )
                            drawCircle(
                                color = Color(0xFF06B6D4),
                                radius = 3.dp.toPx(),
                                center = androidx.compose.ui.geometry.Offset(
                                    center.x + size.minDimension * 0.38f,
                                    center.y,
                                ),
                            )
                        }
                    }

                    Surface(
                        modifier = Modifier.size(108.dp).graphicsLayer {
                            translationY = floatOffset.dp.toPx()
                        },
                        shape = RoundedCornerShape(30.dp),
                        color = Color.White,
                        border = BorderStroke(1.dp, OfflineIndigo.copy(alpha = 0.1f)),
                        shadowElevation = 10.dp,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.CloudOff,
                                contentDescription = null,
                                tint = OfflineIndigo,
                                modifier = Modifier.size(50.dp),
                            )
                            Surface(
                                modifier = Modifier.align(Alignment.BottomEnd).padding(5.dp).size(36.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = OfflineViolet,
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.WifiOff,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(19.dp),
                                    )
                                }
                            }
                        }
                    }
                }

                Surface(
                    shape = CircleShape,
                    color = Color(0xFFFFF7ED),
                    border = BorderStroke(1.dp, Color(0xFFFED7AA)),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(7.dp),
                    ) {
                        Box(Modifier.size(7.dp).background(Color(0xFFF59E0B), CircleShape))
                        Text(
                            if (offline) "No internet connection" else "SchoolDB is unavailable",
                            style = MaterialTheme.typography.labelMedium,
                            color = Color(0xFF92400E),
                        )
                    }
                }

                Spacer(Modifier.height(15.dp))
                Text(
                    if (offline) "You are offline." else "Couldn’t load SchoolDB.",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = OfflineInk,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = OfflineMuted,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(22.dp))
                Button(
                    onClick = onRetry,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(15.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = OfflineIndigo),
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.size(8.dp))
                    Text("Try again", fontWeight = FontWeight.SemiBold)
                }
                if (offline) {
                    Spacer(Modifier.height(14.dp))
                    Text(
                        "Saved school information remains on this device.",
                        style = MaterialTheme.typography.bodySmall,
                        color = OfflineMuted,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}
