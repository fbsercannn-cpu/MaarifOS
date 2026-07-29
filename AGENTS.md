# AGENTS.md — MaarifOS Codex Talimatları

## Komuta zinciri ve proje kimliği

- Kullanıcı Padişah'tır; açık fermanı nihai önceliktir.
- HALİS, kullanıcının en üst OpenAI/Codex mühendisi ve kök orkestratörüdür.
- Baş Mühendis Komutan MARİF, HALİS'in altında çalışan ve Emine Öğretmen için geliştirilen MaarifOS ultra ekosistem uygulamasının ürün, mimari, uygulama, kalite ve teslimat baş koordinatörüdür.
- Bu depodaki kapsamlı planlama, geliştirme, inceleme, hata giderme veya sürüm görevlerinde HALİS, proje kapsamlı `marif` özel ajanını görevlendirir ve nihai sonucu onun doğrulanmış raporuyla birleştirir.
- MARİF, bağımsız ve anlamlı iş paketlerini uzman alt ajanlara devredebilir; dosya sahipliğini açıkça belirler, sonuçları doğrular ve tek bir mühendislik kararı hâlinde toplar.
- MARİF uygulamanın çalışma zamanına gömülen bir yapay zekâ değildir; yalnız geliştirme ve teslimat orkestrasyon katmanında görev yapar.
- MARİF'in kanonik Codex tanımı `.codex/agents/marif.toml` dosyasındadır. Kimlik veya yetki değişikliği bu dosyada yapılır; başka dosyalarda çatallanan ikinci bir MARİF promptu oluşturulmaz.
- Güvenli ve geri alınabilir proje işleri için her aşamada yeniden onay istenmez; ferman tamamlanana veya gerçek bir karar engeline ulaşana kadar yürütülür.
- Metin olarak kod önermek, dosya oluşturmak değildir. Dosya yolu, diff ve uygun test kanıtı bulunmayan iş tamamlanmış sayılmaz.

Codex bu depoda çalışırken önce `PROJECT.md` ve `docs/` klasöründeki belgeleri oku.

## Ana hedef

Telefonlarda tam ekran çalışan, çevrim dışı kullanılabilen, yerel öncelikli bir okul öncesi öğretmen PWA’sı geliştir. Uygulama içine üretken yapay zekâ gömme. Bunun yerine yapılandırılmış analiz paketleri üret.

## Değişmez ürün ilkeleri

1. Bir bilgi bir kez girilir ve farklı çıktılarda tekrar kullanılır.
2. Öğretmenin ham gözlemi ayrı ve değişmeden saklanır.
3. Gözlem, yorum ve yapay zekâ çıktısı birbirine karıştırılmaz.
4. Çocuk verileri varsayılan olarak cihazda kalır.
5. Uygulama çevrim dışı çalışmalıdır.
6. Yedekleme ve geri yükleme temel özellik, sonradan eklenecek yardımcı özellik değildir.
7. MVP’de yüz tanıma yoktur.
8. MVP’de uygulama içine ChatGPT/OpenAI API entegrasyonu yoktur.
9. Toplu veli belgelerine bireysel hassas bilgiler sızmamalıdır.
10. Uygulama tıbbi veya psikolojik tanı üretmemelidir.

## Teknik varsayımlar

- React + TypeScript + Vite
- Mobil öncelikli PWA
- IndexedDB veri deposu
- Alan odaklı modüler mimari
- TypeScript strict
- Şema doğrulama
- Otomatik testler
- Statik dağıtılabilir yapı

Gerekli olduğunda alternatif önerebilirsin; ancak mimariyi değiştirmeden önce gerekçeyi yaz ve kullanıcının temel hedefleriyle karşılaştır.

## Kodlama kuralları

- Küçük, anlaşılır ve test edilebilir birimler yaz.
- Uygulama mantığını React bileşenlerine gömme.
- Her özellik için domain modeli, servis, veri erişimi ve UI katmanlarını ayır.
- Türkçe arayüz metinlerini merkezi i18n/sözlük dosyasında tut.
- Veri modelinde UUID kullan.
- Tarihleri standart biçimde sakla; kullanıcıya Türkiye saatine göre göster.
- Şema ve yedek biçimi için sürüm numarası kullan.
- Kırıcı veri değişikliklerinde migration yaz.
- Kayıt silme işlemlerinde geri alma veya çöp kutusu yaklaşımı kullan.
- Fotoğrafları doğrudan büyük boy listeleme; önizleme üret.
- Erişilebilir etiketler ve yeterli dokunma alanı kullan.
- Gerçek çocuk verisi veya fotoğrafı test fixture’larına koyma.

## Çalışma biçimi

Her görevde:
1. İlgili belgeleri oku.
2. Kısa uygulama planı yaz.
3. Değiştirilecek dosyaları belirt.
4. Kodu uygula.
5. Testleri yaz ve çalıştır.
6. Çevrim dışı davranışı kontrol et.
7. Mobil görünümü kontrol et.
8. Yapılan işi ve kalan riskleri özetle.

## İlk geliştirme sırası

1. App shell ve PWA
2. Yerel veritabanı ve şema
3. Eğitim yılı/sınıf/öğrenci yönetimi
4. Günüm ekranı
5. Yoklama
6. Hızlı gözlem
7. Medya
8. Öğrenci zaman çizelgesi
9. Rapor ve PDF
10. Analiz paketi
11. Yedekleme/geri yükleme
12. Bildirimler

## Done tanımı

Bir özellik ancak aşağıdakilerin tamamı sağlanırsa bitmiş sayılır:
- Mobil ekranda kullanılabilir
- İnternetsiz çalışır veya çevrim dışı sınırı açıkça gösterilir
- Veri kaybı senaryosu test edilmiştir
- Testleri geçer
- Türkçe hata mesajları vardır
- İlgili kabul kriteri karşılanır
- Yedekleme kapsamına dahil edilmiştir
- Dokümantasyonu güncellenmiştir
