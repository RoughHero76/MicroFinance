package com.microfinance.sms

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback

class SMSModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val SENT = "SMS_SENT"
        private const val DELIVERED = "SMS_DELIVERED"
        private const val TAG = "SMSModule"
    }

    override fun getName(): String = "SMSModule"

    private var sentReceiver: BroadcastReceiver? = null
    private var deliveredReceiver: BroadcastReceiver? = null

    @ReactMethod
    fun sendSMS(phoneNumber: String, message: String, successCallback: Callback, errorCallback: Callback) {
        Log.d(TAG, "sendSMS method called with phone: $phoneNumber, message: $message")
        try {
            val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                reactContext.getSystemService(SmsManager::class.java)
            } else {
                SmsManager.getDefault()
            }
            
            val sentPI = PendingIntent.getBroadcast(reactContext, 0, Intent(SENT), PendingIntent.FLAG_IMMUTABLE)
            val deliveredPI = PendingIntent.getBroadcast(reactContext, 0, Intent(DELIVERED), PendingIntent.FLAG_IMMUTABLE)

            sentReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    Log.d(TAG, "sentReceiver onReceive called with resultCode: $resultCode")
                    when (resultCode) {
                        Activity.RESULT_OK -> {
                            Log.d(TAG, "SMS sent successfully")
                            successCallback.invoke("SMS sent successfully")
                        }
                        else -> {
                            Log.e(TAG, "SMS sending failed with result code: $resultCode")
                            errorCallback.invoke("SMS sending failed with result code: $resultCode")
                        }
                    }
                    unregisterReceiver(this)
                }
            }

            deliveredReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    Log.d(TAG, "deliveredReceiver onReceive called with resultCode: $resultCode")
                    when (resultCode) {
                        Activity.RESULT_OK -> {
                            Log.d(TAG, "SMS delivered successfully")
                            successCallback.invoke("SMS delivered successfully")
                        }
                        else -> {
                            Log.e(TAG, "SMS delivery failed with result code: $resultCode")
                            errorCallback.invoke("SMS delivery failed with result code: $resultCode")
                        }
                    }
                    unregisterReceiver(this)
                }
            }

            Log.d(TAG, "Registering receivers")
            registerReceiver(sentReceiver!!, IntentFilter(SENT))
            registerReceiver(deliveredReceiver!!, IntentFilter(DELIVERED))

            Log.d(TAG, "Sending SMS to $phoneNumber with message: $message")
            smsManager.sendTextMessage(phoneNumber, null, message, sentPI, deliveredPI)
            Log.d(TAG, "sendTextMessage called")
        } catch (e: Exception) {
            Log.e(TAG, "Exception in sendSMS: ${e.message}", e)
            errorCallback.invoke("Failed to send SMS: ${e.message}")
        }
    }

    private fun registerReceiver(receiver: BroadcastReceiver, filter: IntentFilter) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(receiver, filter)
        }
    }

    private fun unregisterReceiver(receiver: BroadcastReceiver?) {
        try {
            if (receiver != null) {
                reactContext.unregisterReceiver(receiver)
                Log.d(TAG, "Receiver unregistered")
            }
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "Error unregistering receiver: ${e.message}")
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        unregisterReceiver(sentReceiver)
        unregisterReceiver(deliveredReceiver)
        Log.d(TAG, "Receivers unregistered in onCatalystInstanceDestroy")
    }
}