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
import com.facebook.react.bridge.Promise

class SMSModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val SENT = "SMS_SENT"
        private const val DELIVERED = "SMS_DELIVERED"
        private const val TAG = "SMSModule"
    }

    override fun getName(): String = "SMSModule"

    @ReactMethod
    fun sendSMS(phoneNumber: String, message: String, promise: Promise) {
        Log.d(TAG, "sendSMS method called with phone: $phoneNumber, message: $message")
        try {
            val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                reactContext.getSystemService(SmsManager::class.java)
            } else {
                SmsManager.getDefault()
            }
            
            val sentIntent = PendingIntent.getBroadcast(reactContext, 0, Intent(SENT), PendingIntent.FLAG_IMMUTABLE)
            val deliveredIntent = PendingIntent.getBroadcast(reactContext, 0, Intent(DELIVERED), PendingIntent.FLAG_IMMUTABLE)

            val sentReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    when (resultCode) {
                        Activity.RESULT_OK -> {
                            Log.d(TAG, "SMS sent successfully")
                            promise.resolve("SMS sent successfully")
                        }
                        SmsManager.RESULT_ERROR_GENERIC_FAILURE -> promise.reject("GENERIC_FAILURE", "Generic failure")
                        SmsManager.RESULT_ERROR_NO_SERVICE -> promise.reject("NO_SERVICE", "No service")
                        SmsManager.RESULT_ERROR_NULL_PDU -> promise.reject("NULL_PDU", "Null PDU")
                        SmsManager.RESULT_ERROR_RADIO_OFF -> promise.reject("RADIO_OFF", "Radio off")
                        else -> promise.reject("UNKNOWN_ERROR", "Unknown error")
                    }
                    unregisterReceiver(this)
                }
            }

            val deliveredReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    when (resultCode) {
                        Activity.RESULT_OK -> Log.d(TAG, "SMS delivered successfully")
                        Activity.RESULT_CANCELED -> Log.d(TAG, "SMS not delivered")
                    }
                    unregisterReceiver(this)
                }
            }

            registerReceiver(sentReceiver, IntentFilter(SENT))
            registerReceiver(deliveredReceiver, IntentFilter(DELIVERED))

            smsManager.sendTextMessage(phoneNumber, null, message, sentIntent, deliveredIntent)
            Log.d(TAG, "sendTextMessage called")
        } catch (e: Exception) {
            Log.e(TAG, "Exception in sendSMS: ${e.message}", e)
            promise.reject("SMS_SEND_FAILED", e.message, e)
        }
    }

    private fun registerReceiver(receiver: BroadcastReceiver, filter: IntentFilter) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(receiver, filter)
        }
    }

    private fun unregisterReceiver(receiver: BroadcastReceiver) {
        try {
            reactContext.unregisterReceiver(receiver)
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "Error unregistering receiver: ${e.message}")
        }
    }
}