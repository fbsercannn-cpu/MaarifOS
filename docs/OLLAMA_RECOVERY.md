# Ollama Çalışması Kurtarma Kaydı

## Kaynak

- Sohbet kimliği: `019f5f11-3a83-7112-8bd6-94c6a2a56950`
- Yerel kaynak: Ollama `db.sqlite`
- Kapsanan tarihler: 14 Temmuz 2026 ve 22 Temmuz 2026
- Kullanılan model: `qwen3.6`

## Kurtarılan gerçek durum

Ollama sohbetinde MaarifOS için plan, bağımlılık önerileri, klasör ağacı ve bazı kopyala-yapıştır kod parçaları üretildi. Ollama yerel dosya sistemine erişemediğini açıkça belirttiği için bu önerilerin hiçbiri proje klasöründe uygulanmadı veya test edilmedi.

Bu nedenle aşağıdakiler yapılmış iş sayılmaz:

- React/Vite uygulama iskeleti
- `package.json` ve TypeScript/Vite yapılandırmaları
- Domain modelleri ve Zod şemaları
- Dexie/IndexedDB katmanı
- Günüm, yoklama ve hızlı gözlem ekranları
- PWA çevrim dışı çalışma ve Playwright testleri
- JSON dışa aktarma ve geri yükleme

Çalışma alanında kurtarma anında yalnız başlangıç paketi belgeleri vardı; uygulama kaynak kodu yoktu.

## Korunan kararlar

- Ürün Emine Öğretmen için geliştirilecek mobil öncelikli MaarifOS ekosistemidir.
- Uygulama yerel öncelikli ve çevrim dışı çalışabilen bir PWA olacaktır.
- Başlangıç teknoloji yönü React + TypeScript + Vite + IndexedDB'dir.
- Uygulama çalışma zamanına üretken yapay zekâ veya yüz tanıma eklenmeyecektir.
- Geliştirme, tekrar tekrar onay beklemeden; gerçek dosya, diff ve test kanıtlarıyla yürütülecektir.

## MARİF için hüküm

Ollama sohbetindeki kod parçaları kanonik kaynak veya uygulanmış değişiklik değildir. MARİF gereksinimleri `PROJECT.md`, `AGENTS.md`, `docs/` ve `prompts/FIRST_CODEX_PROMPT.md` üzerinden yeniden uygular; eski parçaları yalnız fikir kaydı olarak değerlendirir ve doğrulamadan projeye taşımaz.
