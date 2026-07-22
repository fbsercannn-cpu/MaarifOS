# MaarifOS Codex Başlangıç Paketi

Bu paket, MaarifOS projesini Codex ile başlatmak için hazırlanmıştır.

## Başlangıç

1. Bu klasörü yeni bir Git deposu olarak aç.
2. Codex’e önce `prompts/FIRST_CODEX_PROMPT.md` dosyasındaki komutu ver.
3. Codex’in `PROJECT.md` ve `AGENTS.md` dosyalarını okuduğunu doğrula.
4. İlk aşamada gerçek öğrenci verisi kullanma.
5. Her faz sonunda çalışan bir sürüm ve test raporu iste.

## Dosyalar

- `PROJECT.md`: Mega master plan ve ürün gereksinimleri
- `AGENTS.md`: Codex’in her görevde uyması gereken kurallar
- `docs/ARCHITECTURE.md`: Teknik mimari
- `docs/DATA_MODEL.md`: Veri modeli
- `docs/UX_MOBILE_PWA.md`: Mobil kullanıcı deneyimi
- `docs/AI_EXPORT_SPEC.md`: Haricî ChatGPT analiz paketi standardı
- `docs/BACKUP_RESTORE.md`: Yedekleme ve geri yükleme standardı
- `docs/SECURITY_PRIVACY.md`: Güvenlik ve gizlilik ilkeleri
- `docs/ROADMAP.md`: Uygulama yol haritası
- `docs/ACCEPTANCE_CRITERIA.md`: Ölçülebilir kabul kriterleri
- `docs/REFERENCES.md`: Resmî kaynaklar
- `prompts/FIRST_CODEX_PROMPT.md`: Codex’e verilecek ilk komut

## Önerilen ilk hedef

İlk çalışan sürümde yalnızca şunlar bulunsun:
- PWA kurulumu
- Eğitim yılı/sınıf/öğrenci yönetimi
- Günüm
- Yoklama
- Hızlı gözlem
- Öğrenci zaman çizelgesi
- JSON yedeği

Fotoğraf, PDF ve gelişmiş yedek sonraki iterasyonda eklenebilir; ancak veri modeli baştan bunları desteklemelidir.
