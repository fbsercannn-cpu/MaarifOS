# Google Hesabı Bağlantısına Hazırlık

## Karar özeti

MaarifOS’un ana çalışma biçimi **hesapsız, yerel ve çevrimdışı** kullanımdır. “İnternetsiz devam et” seçeneği her zaman kullanılabilir kalır. Google hesabı bağlantısı isteğe bağlıdır; bugün gerçek OAuth istemci kimliği, oturum veya token üretilmez.

Karşılama ekranında ayrım açık olmalıdır:

- Birincil yol: **İnternetsiz devam et**
- İkincil yol: **Google ile giriş · Yakında**
- Durum: **Henüz bağlı değil**
- Gizlilik açıklaması: **Çocuk verileri bu cihazda kalır. Google bağlantısı isteğe bağlıdır.**

Bu hazırlık yalnız frontend durum modeli ve ilerideki sunucu adaptörü için sözleşmedir. Google Identity Services betiği yüklenmez, ağ çağrısı yapılmaz ve sahte oturum oluşturulmaz.

## Uygulanan frontend sınırı

`app/src/auth/authMachine.ts` saf ve deterministik bir durum makinesidir:

- `welcome`: hesap zorunluluğu olmayan karşılama
- `local_guest`: çevrimdışı/yerel kullanım
- `google_connecting`: yalnız çevrimiçi ve özellik hazır olduğunda geçici durum
- `google_connected`: yalnız güvenilir adaptörün BFF oturumunu doğrulamasından sonra
- `google_error`: çevrimdışı, hazır değil, iptal, geçersiz cevap ve sağlayıcı hataları

Durum makinesi ağ çağrısı yapmaz. Auth durumu `memory-only` olarak tanımlanmıştır. Uygulamanın IndexedDB verisi auth oturumundan bağımsızdır; Google bağlantısının kesilmesi yerel çocuk verilerini silmez.

`app/src/auth/googleAuthContract.ts` gelecekteki BFF adaptörünün sınırıdır. Sözleşme:

- OAuth access token, refresh token veya ID token döndürmez.
- Çocuk, gözlem, yoklama veya medya verisi kabul etmez.
- Yalnız bağlantı başlatma, minimal oturum özeti okuma ve bağlantı kesme işlemlerini tanımlar.
- Dış yetkilendirme adresini tam `origin` + tam `path` allowlist ile doğrular.
- Uygulama içi dönüş yolunu same-origin ve izinli yol önekleriyle sınırlar.

## Üretim mimarisi: BFF tercih edilir

Google bağlantısı etkinleştirilmeden önce bir Backend-for-Frontend (BFF) kurulmalıdır:

1. Tarayıcı, BFF’nin `/auth/google/start` uç noktasına yalnız izinli yerel dönüş yolunu gönderir.
2. BFF her işlem için kriptografik olarak rastgele `state`, OpenID Connect `nonce` ve PKCE `code_verifier` üretir.
3. PKCE yalnız `S256` kullanır. `code_verifier`, `state` ve `nonce` tarayıcı JavaScript’ine verilmez; kısa ömürlü sunucu oturumuna veya bütünlüğü/gizliliği korunan `HttpOnly` çereze bağlanır.
4. BFF yalnız önceden kaydedilmiş Google yetkilendirme ve callback adreslerini kullanır. Kullanıcı girdisinden keyfî redirect oluşturmaz.
5. Google dönüşünde BFF `state`, PKCE, `nonce`, issuer, audience, imza, süre ve tek kullanımlık kod şartlarını doğrular.
6. Yetkilendirme kodunu tokenlarla yalnız BFF değiştirir. Tokenlar tarayıcıya dönmez.
7. Uygulama oturumu `HttpOnly; Secure; SameSite=Lax` (gereken akışta gerekçelendirilmiş daha sıkı ayar) çerezle temsil edilir. Durum değiştiren BFF çağrılarında Origin/CSRF koruması uygulanır.
8. Tarayıcı yalnız `{ status, subject, displayName }` gibi minimal oturum özetini okuyabilir.

Google, web uygulamalarında authorization code modelinde kodu backend’in doğrulayıp tokenlarla değiştirmesini tarif eder ve redirect adreslerinin kayıtlı değerle tam eşleşmesini ister. OWASP da Authorization Code + PKCE, işlem bazlı `state`/`nonce` bağlama ve açık yönlendiricilerden kaçınmayı önerir.

## Google Identity Services sınırları

Gelecekte Google Identity Services (GIS) kullanılırsa:

- Yalnız **Authorization Code** modeli değerlendirilir; implicit/token front-channel akışı kullanılmaz.
- Popup veya redirect seçimi ayrıca mobil PWA kullanılabilirlik testiyle belirlenir. Popup iptali ve engellenmesi yerel kullanım yolunu bozmaz.
- Google istemci kimliği frontend’de görülebilen, gizli olmayan yapılandırmadır; client secret frontend’e hiçbir koşulda konmaz.
- Yetkili JavaScript originleri ve redirect URI’ları Google Cloud Console’da üretim alan adlarıyla tam kayıtlıdır. Üretimde HTTPS zorunludur; HTTP yalnız loopback geliştirme ortamıyla sınırlıdır.
- İstenen scope ilk aşamada yalnız `openid profile` ile asgari tutulur; e-posta gerçekten ürün gereksinimi olursa ayrıca gerekçelendirilir. Drive/Photos erişimi, yedekleme veya çocuk verisi aktarımı bu giriş akışına kendiliğinden eklenmez.
- GIS üçüncü taraf betiği eklenirse CSP yalnız gerekli Google originleri için daraltılarak güncellenir; betik yüklenemediğinde yerel uygulama çalışmaya devam eder.

## Veri ve depolama yasağı

Aşağıdakiler `localStorage`, `sessionStorage`, IndexedDB, Cache Storage, service worker cache’i, URL, hata mesajı veya loglara yazılmaz:

- OAuth access/refresh/ID tokenları
- Authorization code
- PKCE verifier
- `state` ve `nonce`
- Oturum çereği içeriği
- Google sağlayıcı hata ayrıntılarındaki hassas parametreler

Google girişi çocuk verisi senkronizasyonu anlamına gelmez. Öğrenciler, gözlemler, yoklamalar, raporlar ve medya varsayılan olarak cihazda kalır. Bulut yedekleme/senkronizasyon ayrı ürün fazı, ayrı açık rıza, ayrı güvenlik-hukuk incelemesi ve uçtan uca veri aktarım tasarımı gerektirir.

## Yedekleme ve geri yükleme ilişkisi

- Auth oturumu ve Google tokenları hiçbir yedeğe dahil edilmez.
- Yerel veri yedeği hesap bağlantısından bağımsız alınabilir ve geri yüklenebilir.
- Geri yükleme sonrasında kullanıcı yerel misafir olarak devam eder; gerekiyorsa Google hesabını yeniden bağlar.
- Yedek manifesti yalnız “haricî hesap bağlantısı vardı/yoktu” gibi bir bilgi de taşımamalıdır; cihazlar arası kimlik korelasyonu yapılmaz.
- Google Drive’a yedek, bu giriş hazırlığının parçası değildir. İleride eklenirse kullanıcı tarafından başlatılan, açık kapsamlı ve şifreli ayrı bir dışa aktarma akışı olmalıdır.

## Etkinleştirme kapısı

Gerçek Google bağlantısı ancak aşağıdakiler tamamlandığında `coming_soon` durumundan `available` durumuna alınır:

1. Üretim alan adı ve HTTPS hazır.
2. BFF ve güvenli çerez oturumu hazır.
3. OAuth consent screen, istemci kimliği ve tam redirect allowlist yapılandırılmış.
4. PKCE S256 + `state` + `nonce` doğrulamaları entegrasyon testleriyle kanıtlanmış.
5. İptal, popup engeli, ağ kaybı, callback tekrar oynatma, hatalı issuer/audience ve oturum sonlandırma testleri geçiyor.
6. CSP ve edge güvenlik başlıkları doğrulanmış.
7. KVKK/çocuk verisi hukuk incelemesi ve gizlilik metni tamamlanmış.
8. Yedekle/geri yükle testi, auth oturumu olmadan eksiksiz çalışıyor.

## Test kapsamı

Node testleri gerçek ağ kullanmadan şunları doğrular:

- Çevrimdışı misafir yolunun her zaman açık kalması
- “Yakında” durumunda Google bağlantısının başlamaması
- Çevrimdışı başlangıç ve bağlantı sırasında ağ kesilmesi
- Kullanıcı iptali ve sağlayıcı hatası
- Bağlantı akışı dışında gelen oturum onayının yok sayılması
- Geçersiz minimal profil cevabının reddedilmesi
- Token benzeri alanların auth durumunda/sözleşme yüzeyinde bulunmaması
- Tam origin/path redirect allowlist ve same-origin dönüş yolu
- Google bağlantısı kesildiğinde yerel misafir modunun korunması

Çalıştırma:

```powershell
node --test tests/auth/*.test.mjs
npm run build
```

## Kaynaklar

- [Google Identity Services — Authorization Code Model](https://developers.google.com/identity/oauth2/web/guides/use-code-model)
- [Google OAuth 2.0 — Web Server Applications ve redirect doğrulama](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [OWASP OAuth2 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [IETF OAuth 2.0 for Browser-Based Applications](https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
