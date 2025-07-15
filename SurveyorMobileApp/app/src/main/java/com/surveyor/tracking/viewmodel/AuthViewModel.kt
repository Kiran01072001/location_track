package com.surveyor.tracking.viewmodel

import android.app.Application
import android.content.Context
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.surveyor.tracking.api.ApiClient
import com.surveyor.tracking.model.LoginRequest
import com.surveyor.tracking.model.Surveyor
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val sharedPrefs = application.getSharedPreferences("surveyor_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val _loginState = MutableLiveData<LoginState>()
    val loginState: LiveData<LoginState> = _loginState

    private val _currentSurveyor = MutableLiveData<Surveyor?>()
    val currentSurveyor: LiveData<Surveyor?> = _currentSurveyor

    init {
        Log.d("AuthViewModel", "AuthViewModel initialized, loading surveyor data")
        loadSurveyorFromPrefs()
    }

    private fun loadSurveyorFromPrefs() {
        val surveyorJson = sharedPrefs.getString("current_surveyor", null)
        Log.d("AuthViewModel", "Loading surveyor from prefs: $surveyorJson")
        if (surveyorJson != null) {
            try {
                val surveyor = gson.fromJson(surveyorJson, Surveyor::class.java)
                Log.d("AuthViewModel", "Loaded surveyor: ${surveyor.name} (${surveyor.id})")

                // If we load a user from prefs, we must also set the auth token for ApiClient
                // THE FIX IS HERE:
                ApiClient.authInterceptor.setToken(surveyor.username, surveyor.password ?: "")

                _currentSurveyor.value = surveyor
                _loginState.value = LoginState.Success
            } catch (e: Exception) {
                Log.e("AuthViewModel", "Error loading surveyor from prefs", e)
                logout() // Clear all data if loading fails
            }
        } else {
            Log.d("AuthViewModel", "No saved surveyor data found")
            _currentSurveyor.value = null
            _loginState.value = LoginState.LoggedOut
        }
    }

    private fun saveSurveyorToPrefs(surveyor: Surveyor, passwordUsed: String) {
        // We add the password to the surveyor object before saving so we can re-use it
        val surveyorToSave = surveyor.copy(password = passwordUsed)
        val surveyorJson = gson.toJson(surveyorToSave)
        Log.d("AuthViewModel", "Saving surveyor to prefs: $surveyorJson")
        sharedPrefs.edit().putString("current_surveyor", surveyorJson).apply()
    }

    private fun clearSurveyorFromPrefs() {
        sharedPrefs.edit().remove("current_surveyor").apply()
    }

    fun login(username: String, password: String) {
        if (username.isBlank() || password.isBlank()) {
            _loginState.value = LoginState.Error("Please enter username and password")
            return
        }

        _loginState.value = LoginState.Loading

        // Note: The token is already set in LoginActivity before this is called.
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.login(LoginRequest(username, password))
                if (response.isSuccessful && response.body()?.success == true) {
                    val surveyor = response.body()?.surveyor
                    if (surveyor != null) {
                        _currentSurveyor.value = surveyor
                        // We pass the password here so it can be saved for the next session
                        saveSurveyorToPrefs(surveyor, password)
                        // The token is already set, so we don't need to set it again here.
                        _loginState.value = LoginState.Success
                    } else {
                        _loginState.value = LoginState.Error("Invalid response data")
                    }
                } else {
                    val message = response.body()?.message ?: "Login failed. Check credentials."
                    _loginState.value = LoginState.Error(message)
                }
            } catch (e: Exception) {
                Log.e("AuthViewModel", "Login network error", e)
                _loginState.value = LoginState.Error("Network error: Could not connect to server.")
            }
        }
    }

    fun logout() {
        // --- THE FIX IS HERE: Clear the token from our ApiClient ---
        ApiClient.authInterceptor.clearToken()
        clearSurveyorFromPrefs()
        _currentSurveyor.value = null
        _loginState.value = LoginState.LoggedOut
    }

    fun refreshSurveyorData() {
        Log.d("AuthViewModel", "Manually refreshing surveyor data")
        loadSurveyorFromPrefs()
    }

    sealed class LoginState {
        object Loading : LoginState()
        object Success : LoginState()
        object LoggedOut : LoginState()
        data class Error(val message: String) : LoginState()
    }
}