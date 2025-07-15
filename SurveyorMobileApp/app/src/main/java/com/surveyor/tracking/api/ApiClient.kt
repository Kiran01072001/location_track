package com.surveyor.tracking.api

import android.util.Log
import okhttp3.Credentials
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

// --- We create a separate, dynamic interceptor class for authentication ---
// This class will hold the credentials and add them to every API call.
class AuthInterceptor : Interceptor {

    // This variable will store the authentication token for the logged-in user.
    // It is 'volatile' to ensure it's safe to use across different threads.
    @Volatile
    private var authToken: String? = null

    /**
     * This function will be called from your Login screen to set the
     * credentials for the current session.
     * It creates the "Basic" token (e.g., "Basic dXNlcjpwYXNzd29yZA==").
     */
    fun setToken(username: String, password: String) {
        this.authToken = Credentials.basic(username, password)
        Log.d("AuthInterceptor", "Auth token has been set for user: $username")
    }

    /**
     * This function will be called on logout to clear the credentials.
     */
    fun clearToken() {
        this.authToken = null
        Log.d("AuthInterceptor", "Auth token has been cleared.")
    }

    override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
        var request = chain.request()

        // Check if we have a token stored.
        authToken?.let { token ->
            // If a token exists, create a new request and add the
            // "Authorization" header to it. This happens for every API call.
            request = request.newBuilder()
                .header("Authorization", token)
                .build()
        }

        // Proceed with the request (either the original or the one with the auth header).
        return chain.proceed(request)
    }
}

// --- The ApiClient object is now simpler and uses the dynamic interceptor ---
object ApiClient {

    // This is the correct address for connecting from the Android Emulator.
    // When you are ready to test on a real phone, you will change this
    // to your public IP (183.82.114.29) or your local Wi-Fi IP (192.168.1.4).
    private const val BASE_URL = "http://10.0.2.2:6565/api/"

    // Create a single, public instance of our new interceptor.
    // We can access this from anywhere in the app (like LoginActivity).
    val authInterceptor = AuthInterceptor()

    // The logging interceptor is great for debugging.
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    // We build the HTTP client with both interceptors.
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor(authInterceptor) // This adds our dynamic auth to every call.
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: ApiService = retrofit.create(ApiService::class.java)
}