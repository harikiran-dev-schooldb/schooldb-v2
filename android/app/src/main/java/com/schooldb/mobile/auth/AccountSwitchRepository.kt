package com.schooldb.mobile.auth

import com.schooldb.mobile.network.AuthenticatedApiClient
import org.json.JSONArray
import org.json.JSONObject

class AccountSwitchRepository(
    private val api: AuthenticatedApiClient = AuthenticatedApiClient(),
) {
    suspend fun accounts(): List<AccountSwitchChoice> {
        val data = api.get("api/v1/account-switch")
        val items = data.optJSONArray("accounts") ?: JSONArray()
        return buildList {
            repeat(items.length()) { index ->
                val item = items.getJSONObject(index)
                add(
                    AccountSwitchChoice(
                        id = item.getString("id"),
                        name = item.optString("name", "SchoolDB user"),
                        role = item.optString("role", "Member"),
                        detail = item.optString("detail"),
                        current = item.optBoolean("current"),
                    ),
                )
            }
        }
    }

    suspend fun switch(accountId: String): String? {
        val data = api.post(
            "api/v1/account-switch",
            JSONObject().put("accountId", accountId),
        )
        return data.optString("token").takeIf(String::isNotBlank)
    }
}
