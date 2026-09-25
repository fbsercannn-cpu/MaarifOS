package tr.gov.meb.maarifos;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Set;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureSession")
public class SecureSessionPlugin extends Plugin {
    private static final String KEY_ALIAS = "maarifos_native_session_v1";
    private static final String STORE = "maarifos_secure_session";
    private static final Set<String> ALLOWED_KEYS = Set.of("session", "pkce");

    private String key(PluginCall call) {
        String value = call.getString("key");
        return value != null && ALLOWED_KEYS.contains(value) ? value : null;
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(STORE, Context.MODE_PRIVATE);
    }

    private SecretKey secretKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(KEY_ALIAS)) return ((KeyStore.SecretKeyEntry) store.getEntry(KEY_ALIAS, null)).getSecretKey();
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build());
        return generator.generateKey();
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = key(call), value = call.getString("value");
        if (key == null || value == null || value.length() > 256) { call.reject("Güvenli oturum girdisi geçersiz."); return; }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey());
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            String stored = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + "." + Base64.encodeToString(encrypted, Base64.NO_WRAP);
            if (!preferences().edit().putString(key, stored).commit()) { call.reject("Güvenli oturum kaydedilemedi."); return; }
            call.resolve();
        } catch (Exception ignored) { call.reject("Güvenli oturum kaydedilemedi."); }
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = key(call); if (key == null) { call.reject("Güvenli oturum anahtarı geçersiz."); return; }
        JSObject result = new JSObject(); String stored = preferences().getString(key, null);
        if (stored == null) { call.resolve(result); return; }
        try {
            String[] parts = stored.split("\\.", -1); if (parts.length != 2) throw new Exception();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
            result.put("value", new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8));
            call.resolve(result);
        } catch (Exception ignored) { preferences().edit().remove(key).commit(); call.resolve(result); }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = key(call); if (key == null) { call.reject("Güvenli oturum anahtarı geçersiz."); return; }
        if (!preferences().edit().remove(key).commit()) { call.reject("Güvenli oturum kaldırılamadı."); return; }
        call.resolve();
    }
}
