package com.surveyor.tracking.utils

import android.content.Context
import android.content.SharedPreferences

/**
 * A helper class to manage storing and retrieving simple user data
 * from SharedPreferences. This provides a clean and reusable way
 * to handle user session data.
 *
 * @param context The application context, used to get access to SharedPreferences.
 */
class PreferencesManager(context: Context) {

    // The companion object holds constants that are shared across all instances
    // of this class. It's the standard place for keys and the preference file name.
    companion object {
        private const val PREFS_NAME = "surveyor_app_prefs" // A more descriptive name
        private const val KEY_USER_ID = "key_user_id"
        private const val KEY_USERNAME = "key_username"
        private const val KEY_IS_LOGGED_IN = "key_is_logged_in"
    }

    // Initialize the SharedPreferences instance.
    // It's private so that only this class can directly access it.
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * Saves the essential user data after a successful login.
     *
     * @param userId The unique ID of the surveyor.
     * @param username The login username of the surveyor.
     */
    fun saveUserData(userId: String, username: String) {
        // Use 'edit(commit = true)' for immediate saving if needed,
        // or 'apply()' for asynchronous saving in the background. 'apply()' is usually preferred.
        prefs.edit().apply {
            putString(KEY_USER_ID, userId)
            putString(KEY_USERNAME, username)
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply() // Saves the changes
        }
    }

    /**
     * Retrieves the saved user ID.
     * @return The surveyor's ID, or null if not found.
     */
    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    /**
     * Retrieves the saved username.
     * @return The surveyor's username, or null if not found.
     */
    fun getUsername(): String? = prefs.getString(KEY_USERNAME, null)

    /**
     * Checks if a user is currently marked as logged in.
     * @return True if logged in, false otherwise.
     */
    fun isLoggedIn(): Boolean = prefs.getBoolean(KEY_IS_LOGGED_IN, false)

    /**
     * Clears all user data from SharedPreferences. This is typically
     * called on logout.
     */
    fun clearUserData() {
        // 'clear()' removes all preferences in this file.
        prefs.edit().clear().apply()
    }
}