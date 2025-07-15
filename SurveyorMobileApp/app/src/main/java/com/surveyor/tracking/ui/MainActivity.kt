package com.surveyor.tracking.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.surveyor.tracking.api.ApiClient // Import the ApiClient
import com.surveyor.tracking.databinding.ActivityMainBinding
import com.surveyor.tracking.service.LocationTrackingService
import com.surveyor.tracking.viewmodel.AuthViewModel
import com.surveyor.tracking.viewmodel.LocationViewModel

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val authViewModel: AuthViewModel by viewModels()
    private val locationViewModel: LocationViewModel by viewModels()

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        // Check for location permissions
        val fineLocationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseLocationGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false

        if (fineLocationGranted || coarseLocationGranted) {
            // Location permission granted, now we can start tracking
            startLocationTracking()
        } else {
            // Permission denied, inform the user
            Toast.makeText(this, "Location permission is required for tracking.", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupObservers()
        setupClickListeners()

        // Check login status when the activity is created. The observer will handle any redirects.
        authViewModel.refreshSurveyorData()

        // Check if the service is already running from a previous session
        locationViewModel.checkServiceStatus()
    }

    private fun setupObservers() {
        authViewModel.currentSurveyor.observe(this) { surveyor ->
            if (surveyor == null) {
                // If at any point the surveyor data is null, redirect to Login
                Log.d("MainActivity", "Observer detected null surveyor. Redirecting to login.")
                startActivity(Intent(this, LoginActivity::class.java))
                finish()
                return@observe
            }

            // Update the UI with surveyor details
            binding.welcomeText.text = "Welcome, ${surveyor.name}!"
            binding.emailText.text = "${surveyor.city} - ${surveyor.projectName}"
        }

        locationViewModel.isTracking.observe(this) { isTracking ->
            if (isTracking) {
                binding.startTrackingButton.text = "Stop Tracking"
                binding.statusText.text = "Status: Tracking is Active"
            } else {
                binding.startTrackingButton.text = "Start Tracking"
                binding.statusText.text = "Status: Tracking is Inactive"
            }
        }

        locationViewModel.currentLocation.observe(this) { location ->
            location?.let {
                binding.locationText.text = "Last Location: ${it.latitude}, ${it.longitude}"
            }
        }
    }

    private fun setupClickListeners() {
        binding.startTrackingButton.setOnClickListener {
            if (locationViewModel.isTracking.value == true) {
                stopLocationTracking()
            } else {
                requestPermissionsAndStartTracking()
            }
        }

        binding.logoutButton.setOnClickListener {
            stopLocationTracking()
            // --- THE FIX: Clear the auth token on logout ---
            ApiClient.authInterceptor.clearToken()
            authViewModel.logout() // This will trigger the observer to redirect to LoginActivity
        }
    }

    private fun requestPermissionsAndStartTracking() {
        // --- THE FIX: Request all necessary permissions at once ---
        val permissionsToRequest = mutableListOf<String>()
        permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION)
        permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION)

        // For Android 13 (API 33) and above, we need notification permission for foreground services
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // Check which permissions we already have
        val permissionsNotGranted = permissionsToRequest.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (permissionsNotGranted.isEmpty()) {
            // All permissions are already granted, start tracking
            Log.d("MainActivity", "All necessary permissions are granted.")
            startLocationTracking()
        } else {
            // Request the permissions that are missing
            Log.d("MainActivity", "Requesting permissions: $permissionsNotGranted")
            requestPermissionLauncher.launch(permissionsNotGranted.toTypedArray())
        }
    }

    private fun startLocationTracking() {
        val surveyor = authViewModel.currentSurveyor.value
        if (surveyor == null) {
            Toast.makeText(this, "Error: Surveyor data not available. Please log in again.", Toast.LENGTH_LONG).show()
            authViewModel.logout() // Force a logout and redirect
            return
        }

        Log.d("MainActivity", "Starting location service for surveyor: ${surveyor.id}")
        LocationTrackingService.startService(this, surveyor.id)
        locationViewModel.startTracking(surveyor.id)
        Toast.makeText(this, "Location tracking started for ${surveyor.name}", Toast.LENGTH_SHORT).show()
    }

    private fun stopLocationTracking() {
        Log.d("MainActivity", "Stopping location service.")
        LocationTrackingService.stopService(this)
        locationViewModel.stopTracking()
        Toast.makeText(this, "Location tracking stopped", Toast.LENGTH_SHORT).show()
    }
}