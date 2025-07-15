package com.surveyor.tracking

import android.app.Application
import android.util.Log

class SurveyorApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // --- START: ADD THIS BLOCK ---
        // This sets up a global crash handler.
        // If your app crashes for any unexpected reason, this code will run
        // and log the error, making it much easier to find bugs.
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e(
                "AppCrash",
                "An uncaught exception occurred in thread: ${thread.name}",
                throwable
            )
            // Here, you could also add logic to send a crash report to a service
            // like Firebase Crashlytics in a real production app.
        }
        // --- END: ADD THIS BLOCK ---

        Log.d("SurveyorApplication", "Application has been created.")
    }
}