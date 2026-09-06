import Foundation
import NetworkExtension

@objc(VPNModule)
class VPNModule: NSObject {
  private var vpnManager = NEVPNManager.shared()
  
  @objc
  func startVPN(_ serverAddress: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      do {
        // Загружаем сохраненные VPN конфигурации
        try self.vpnManager.loadFromPreferences()
        
        // Создаем VPN конфигурацию
        let settings = NEVPNSettings()
        settings.isEnabled = true
        
        // Используем IKEv2 для безопасности
        let ikev2Settings = NEIKEv2Settings()
        ikev2Settings.serverAddress = serverAddress
        ikev2Settings.remoteIdentifier = serverAddress
        ikev2Settings.localIdentifier = "vpn-client"
        ikev2Settings.authenticationMethod = .securePassword
        
        let ipsecSettings = NEIPSecSettings()
        ipsecSettings.encryptionAlgorithm = .AES256
        ipsecSettings.integrityAlgorithm = .SHA256
        
        self.vpnManager.protocolConfiguration = ikev2Settings
        self.vpnManager.isEnabled = true
        
        // Сохраняем конфигурацию
        try self.vpnManager.saveToPreferences()
        try self.vpnManager.loadFromPreferences()
        try self.vpnManager.connection.startVPNTunnel()
        
        resolver(["status": "connected"])
      } catch {
        rejecter("VPN_ERROR", error.localizedDescription, error)
      }
    }
  }
  
  @objc
  func stopVPN(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.vpnManager.connection.stopVPNTunnel()
      resolver(["status": "disconnected"])
    }
  }
  
  @objc
  func getVPNStatus(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let status = self.vpnManager.connection.status.rawValue
    let statusString: String
    
    switch self.vpnManager.connection.status {
    case .invalid:
      statusString = "invalid"
    case .disconnected:
      statusString = "disconnected"
    case .connecting:
      statusString = "connecting"
    case .connected:
      statusString = "connected"
    case .reasserting:
      statusString = "reasserting"
    case .disconnecting:
      statusString = "disconnecting"
    @unknown default:
      statusString = "unknown"
    }
    
    resolver(["status": statusString])
  }
}