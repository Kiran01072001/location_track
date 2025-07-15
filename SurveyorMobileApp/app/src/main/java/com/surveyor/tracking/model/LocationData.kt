package com.surveyor.tracking.model

/**
 * This class represents a single point in a historical track
 * that is received from the backend.
 */
data class LocationData(
    val latitude: Double,
    val longitude: Double,
    // THE FIX: The timestamp from the server's JSON response is a String, not a Long.
    val timestamp: String,
    val accuracy: Float? = null // This can be kept if your mobile service provides it.
)