package com.schooldb.mobile.auth

import com.clerk.api.Clerk
import com.clerk.api.network.serialization.errorMessage
import com.clerk.api.network.serialization.onFailure
import com.clerk.api.network.serialization.onSuccess
import com.clerk.api.signin.SignIn
import com.schooldb.mobile.BuildConfig
import kotlinx.coroutines.flow.first

class AuthSessionManager {
    suspend fun activate(ticket: String) {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
            throw AuthException("Add CLERK_PUBLISHABLE_KEY to your Gradle properties before signing in.")
        }

        Clerk.isInitialized.first { it }

        val cleanTicket = ticket.trim()
        if (cleanTicket.isBlank()) {
            throw AuthException("Clerk did not return a valid sign-in ticket.")
        }

        // A ticket creates a new Clerk session. Clear an existing active session
        // first so this also works when the Clerk instance uses single-session mode.
        if (Clerk.activeSession != null) {
            var signedOut = false
            var signOutError: String? = null
            Clerk.auth
                .signOut()
                .onSuccess { signedOut = true }
                .onFailure { signOutError = it.errorMessage }
            if (!signedOut) {
                throw AuthException(signOutError ?: "Clerk could not switch sessions.")
            }
        }

        var activated = false
        var errorMessage: String? = null
        Clerk.auth
            .signInWithTicket(cleanTicket)
            .onSuccess { signIn ->
                val sessionId = signIn.createdSessionId
                if (signIn.status != SignIn.Status.COMPLETE || sessionId == null) {
                    errorMessage = "Clerk could not complete this sign-in."
                } else {
                    Clerk.auth
                        .setActive(sessionId = sessionId)
                        .onSuccess { activated = true }
                        .onFailure { errorMessage = it.errorMessage }
                }
            }
            .onFailure { errorMessage = it.errorMessage }

        if (!activated) {
            throw AuthException(errorMessage ?: "Clerk could not create a session.")
        }
    }
}
