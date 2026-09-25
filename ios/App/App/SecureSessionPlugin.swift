import Capacitor
import Security

@objc(SecureSessionPlugin)
public class SecureSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SecureSessionPlugin"
    public let jsName = "SecureSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]

    private let service = "tr.gov.meb.maarifos.native-session"
    private let allowedKeys = Set(["session", "pkce"])

    private func key(_ call: CAPPluginCall) -> String? {
        guard let key = call.getString("key"), allowedKeys.contains(key) else { return nil }
        return key
    }

    private func query(_ key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = key(call) else { call.reject("Güvenli oturum anahtarı geçersiz."); return }
        var request = query(key)
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(request as CFDictionary, &result)
        if status == errSecItemNotFound { call.resolve(); return }
        guard status == errSecSuccess, let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            call.reject("Güvenli oturum okunamadı."); return
        }
        call.resolve(["value": value])
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = key(call), let value = call.getString("value"), value.utf8.count <= 256 else {
            call.reject("Güvenli oturum girdisi geçersiz."); return
        }
        let base = query(key)
        SecItemDelete(base as CFDictionary)
        var request = base
        request[kSecValueData as String] = Data(value.utf8)
        request[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        guard SecItemAdd(request as CFDictionary, nil) == errSecSuccess else {
            call.reject("Güvenli oturum kaydedilemedi."); return
        }
        call.resolve()
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = key(call) else { call.reject("Güvenli oturum anahtarı geçersiz."); return }
        let status = SecItemDelete(query(key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            call.reject("Güvenli oturum kaldırılamadı."); return
        }
        call.resolve()
    }
}
