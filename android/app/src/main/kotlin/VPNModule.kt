package com.vpnguard

import android.content.Context
import android.net.VpnService
import android.content.Intent
import com.facebook.react.bridge.*

class VPNModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  
  override fun getName(): String = "VPNModule"
  
  @ReactMethod
  fun startVPN(serverAddress: String, promise: Promise) {
    try {
      val context = reactApplicationContext
      val vpnServiceIntent = Intent(context, VPNService::class.java)
      vpnServiceIntent.putExtra("server_address", serverAddress)
      
      context.startService(vpnServiceIntent)
      promise.resolve(mapOf("status" to "connected"))
    } catch (e: Exception) {
      promise.reject("VPN_ERROR", e.message)
    }
  }
  
  @ReactMethod
  fun stopVPN(promise: Promise) {
    try {
      val context = reactApplicationContext
      val vpnServiceIntent = Intent(context, VPNService::class.java)
      context.stopService(vpnServiceIntent)
      promise.resolve(mapOf("status" to "disconnected"))
    } catch (e: Exception) {
      promise.reject("VPN_ERROR", e.message)
    }
  }
  
  @ReactMethod
  fun getVPNStatus(promise: Promise) {
    promise.resolve(mapOf("status" to "disconnected"))
  }
}