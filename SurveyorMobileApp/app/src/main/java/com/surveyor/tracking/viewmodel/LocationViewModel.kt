package com.surveyor.tracking.viewmodel

import android.app.Application
import android.content.Context
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.surveyor.tracking.api.ApiClient
import com.surveyor.tracking.model.LocationData
import kotlinx.coroutines.launch

class LocationViewModel(application: Application) : AndroidViewModel(application) {

    // Use a more descriptive name for the preference file
    private val sharedPrefs = application.getSharedPreferences("location_tracking_state", Context.MODE_PRIVATE)

    private val _locationHistory = MutableLiveData<List<LocationData>>()
    val locationHistory: LiveData<List<LocationData>> = _locationHistory

    private val _isTracking = MutableLiveData<Boolean>()
    val isTracking: LiveData<Boolean> = _isTracking

    private val _currentLocation = MutableLiveData<LocationData?>()
    val currentLocation: LiveData<LocationData?> = _currentLocation

    init {
        // Load the last known tracking state when the ViewModel is created
        _isTracking.value = sharedPrefs.getBoolean("is_tracking_active", false)
        Log.d("LocationViewModel", "Initial tracking state loaded: ${isTracking.value}")
    }

    /**
     * Call this when the user starts the tracking service.
     * It updates the UI state and saves it to preferences.
     */
    fun startTracking(surveyorId: String) {
        if (_isTracking.value == true) return // Avoid starting if already tracking

        Log.d("LocationViewModel", "Setting tracking state to ACTIVE for surveyor: $surveyorId")
        _isTracking.value = true
        sharedPrefs.edit()
            .putBoolean("is_tracking_active", true)
            .putString("last_tracked_surveyor_id", surveyorId)
            .apply()
        // Optional: you could load the initial history when tracking starts
        // loadLocationHistory(surveyorId)
    }

    /**
     * Call this when the user stops the tracking service.
     * It updates the UI state and clears it from preferences.
     */
    fun stopTracking() {
        if (_isTracking.value == false) return // Avoid stopping if already stopped

        Log.d("LocationViewModel", "Setting tracking state to INACTIVE")
        _isTracking.value = false
        sharedPrefs.edit()
            .putBoolean("is_tracking_active", false)
            .remove("last_tracked_surveyor_id")
            .apply()
    }

    /**
     * This function is intended to be called by the service to update the UI
     * with the latest known location. (Currently not used, but good to have).
     */
    fun updateCurrentLocation(location: LocationData) {
        _currentLocation.value = location
    }

    /**
     * Fetches the historical track data from the backend.
     */
    private fun loadLocationHistory(surveyorId: String) {
        viewModelScope.launch {
            try {
                Log.d("LocationViewModel", "Fetching location history for $surveyorId")
                val response = ApiClient.apiService.getLocationHistory(surveyorId)
                if (response.isSuccessful) {
                    _locationHistory.value = response.body() ?: emptyList()
                    Log.d("LocationViewModel", "History loaded with ${response.body()?.size ?: 0} points.")
                } else {
                    Log.e("LocationViewModel", "Failed to load history: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e("LocationViewModel", "Exception loading history", e)
            }
        }
    }

    /**
     * A simple check on startup to ensure our UI state matches what's in preferences.
     */
    fun checkServiceStatus() {
        val prefTracking = sharedPrefs.getBoolean("is_tracking_active", false)
        if (_isTracking.value != prefTracking) {
            Log.d("LocationViewModel", "Syncing UI tracking state to: $prefTracking")
            _isTracking.value = prefTracking
        }
    }
}