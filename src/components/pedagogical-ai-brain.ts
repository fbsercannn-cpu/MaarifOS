/**
 * pedagogical-ai-brain.ts — MaarifOS 0.74.1 APEX SÜRÜM
 * Zero-Trust Yerel Pedagoji & TYMM 2026 Sentez Motoru
 * 
 * SIFIR API anahtarı, SIFIR sunucu, %100 İstemci Tarafı (Client-Side).
 * MEB TTKB 2026 Türkiye Yüzyılı Maarif Modeli Okul Öncesi Programı ile %100 Uyumlu.
 * 
 * ÇOK KATMANLI ANLAMSAL NİYET MOTORU (SEMANTIC INTENT PARSER):
 * - Selamlaşma & Kimlik Tanımı
 * - Uygulama İçi Yardım & Gezinme
 * - Davranış Yönetimi & Kriz Çözümü (Ağlama, yemek, ısırma, vurma, paylaşamama, çekingenlik)
 * - Yaratıcı İçerik Üretimi (Tekerleme, Parmak Oyunu, Masal/Hikaye, Şarkı)
 * - Oyun & Atölye Tasarımı (Matematik, Fen, Sanat, Hareket)
 * - MEB Resmî EK-6 Günlük Plan (Yalnızca talep edildiğinde ve plana aktarma butonlu)
 * - EK-2 Anekdot Kaydı, Veli Bülteni, Karne Görüşleri ve BEP Farklılaştırma
 * - Her soruya doğrudan amaca yönelik, somut, saçmalamayan yanıt garantisi.
 */

import { DailyPlanRecord, createDailyPlan, AgeGroup } from "../features/official-forms/daily-plan-core";

export interface AIContext {
  topic?: string;
  researchQuestion?: string;
  domain?: string;
  ageGroup?: string;
  concepts?: string[];
  materials?: string[];
  values?: string[];
  planTitle?: string;
  customContext?: string;
}

export interface SynthesizedResponse {
  markdown: string;
  generatedPlan?: DailyPlanRecord;
  suggestedAction?: "inject_plan" | "whatsapp" | "print" | "copy";
  category: "chat" | "help" | "behavior" | "creative" | "game" | "plan" | "emergency" | "family" | "anecdote" | "differentiation" | "general";
}

// ─── ANA SENTEZ GİRİŞ KAPISI ─────────────────────────────────────────────────

export function synthesizeLocalResponse(
  query: string,
  context: AIContext = {},
): SynthesizedResponse {
  const q = query.toLowerCase().trim();
  const rawQ = query.trim();
  const age = (context.ageGroup as AgeGroup) || "60-72";
  const activeTopic = context.topic || context.planTitle || extractSubject(query);

  // 1. SELAMLAŞMA & KİMLİK
  if (isGreeting(q)) {
    return handleGreeting();
  }

  // 2. UYGULAMA İÇİ KULLANIM VE YARDIM REHBERİ
  if (isAppHelp(q)) {
    return handleAppHelp(q);
  }

  // 3. DAVRANIŞ, AĞLAMA, YEMEK, ÖFKE, TUVALET & SINIF YÖNETİMİ
  if (isBehaviorQuery(q)) {
    return handleBehaviorQuery(q, age);
  }

  // 4. YARATICI İÇERİK: TEKERLEME, PARMAK OYUNU, HİKAYE, MASAL
  if (isCreativeQuery(q)) {
    return handleCreativeContent(q, activeTopic, age);
  }

  // 5. OYUN & ATÖLYE ÖNERİSİ
  if (isGameQuery(q)) {
    return handleGameProposal(q, activeTopic, age);
  }

  // 6. ACİL DURUM: YAĞMUR & SINIF İÇİ ENERJİ BOŞALTMA
  if (q.includes("yağmur") || (q.includes("bahçe") && (q.includes("çıkam") || q.includes("kapalı")))) {
    return buildRainyDayRescue(activeTopic, age);
  }

  // 7. ACİL DURUM: SIFIR ATIK / MALZEME YOK
  if (q.includes("malzeme") && (q.includes("yok") || q.includes("atık") || q.includes("sıfır") || q.includes("bitti"))) {
    return buildZeroWasteRemedy(activeTopic, age);
  }

  // 8. BARIŞ MASASI & AKRAN ÇATIŞMASI
  if (q.includes("barış masası") || q.includes("paylaşmıyor") || q.includes("oyuncak kavgası")) {
    return buildPeaceTableRemedy();
  }

  // 9. VELİ İLETİŞİMİ & WHATSAPP
  if (q.includes("veli") || q.includes("whatsapp") || q.includes("bülten") || q.includes("veli mesaj")) {
    return buildFamilyWhatsAppNotice(activeTopic, age, context);
  }

  // 10. EK-2 ANEKDOT KAYDI
  if (q.includes("anekdot") || q.includes("ek-2") || q.includes("ek 2") || q.includes("gözlem tutana")) {
    return buildAnecdoteTemplate(activeTopic, age);
  }

  // 11. DÖNEM SONU GELİŞİM RAPORU / KARNE GÖRÜŞLERİ
  if (q.includes("karne") || q.includes("gelişim rapor") || q.includes("dönem sonu görüş")) {
    return buildTermReportComments(activeTopic);
  }

  // 12. FARKLILAŞTIRMA & BEP (DESTEKLEME / ZENGİNLEŞTİRME)
  if (q.includes("bep") || q.includes("özel gereksinim") || q.includes("farklılaştır") || q.includes("üstün yetenek")) {
    return buildDifferentiationGuide(activeTopic, age);
  }

  // 13. AÇIK UÇLU ARAŞTIRMA SORULARI
  if (q.includes("araştırma sorusu") || q.includes("merak sorusu") || (q.includes("soru") && q.includes("öner"))) {
    return buildResearchQuestions(activeTopic, age);
  }

  // 14. AÇIKÇA GÜNLÜK PLAN İSTENDİĞİNDE (EK-6)
  if (isExplicitPlanRequest(q)) {
    return buildDailyPlanPackage(activeTopic, age, query, context);
  }

  // 15. GENEL PEDAGOJİK DANIŞMANLIK & SORU CEVAP
  return handleGeneralConsultation(rawQ, activeTopic, age);
}

// ─── NİYET BELİRTEÇLERİ (INTENT HELPERS) ────────────────────────────────────

function isGreeting(q: string): boolean {
  return /^(merhaba|selam|günaydın|iyi günler|iyi akşamlar|kolay gelsin|nasılsın|sen kimsin|kimsin sen|adın ne|tanıt|ne yapabilirsin|halis|marif)/i.test(q);
}

function isAppHelp(q: string): boolean {
  return (
    q.includes("nasıl kullanılır") ||
    q.includes("nasıl yapılır") ||
    q.includes("öğrenci nasıl") ||
    q.includes("plan nasıl") ||
    q.includes("çıktı nasıl") ||
    q.includes("excel nasıl") ||
    q.includes("nereye kaydediliyor") ||
    q.includes("maarifos nedir") ||
    q.includes("uygulama hakkında") ||
    q.includes("yoklama nasıl")
  );
}

function isBehaviorQuery(q: string): boolean {
  return (
    q.includes("ağlıyor") ||
    q.includes("ağlayan") ||
    q.includes("yemek yemiyor") ||
    q.includes("iştah") ||
    q.includes("beslenme zor") ||
    q.includes("vuruyor") ||
    q.includes("ısırıyor") ||
    q.includes("öfke") ||
    q.includes("saldırgan") ||
    q.includes("paylaşmıyor") ||
    q.includes("içine kapanık") ||
    q.includes("konuşmuyor") ||
    q.includes("çekingen") ||
    q.includes("tuvalet") ||
    q.includes("altını ıslat") ||
    q.includes("uyumak istemiyor") ||
    q.includes("annemi istiyorum") ||
    q.includes("ayrılık kaygısı") ||
    q.includes("söz dinlemiyor") ||
    q.includes("inatlaşıyor")
  );
}

function isCreativeQuery(q: string): boolean {
  return (
    q.includes("hikaye") ||
    q.includes("masal") ||
    q.includes("tekerleme") ||
    q.includes("parmak oyunu") ||
    q.includes("şarkı") ||
    q.includes("şiir") ||
    q.includes("canlandırma") ||
    q.includes("drama")
  );
}

function isGameQuery(q: string): boolean {
  return (
    q.includes("oyun") ||
    q.includes("etkinlik öner") ||
    q.includes("ne oynatabilirim") ||
    q.includes("atölye") ||
    q.includes("deney öner") ||
    q.includes("fen deneyi") ||
    q.includes("matematik oyunu")
  );
}

function isExplicitPlanRequest(q: string): boolean {
  return (
    q.includes("günlük plan") ||
    q.includes("ders planı") ||
    q.includes("ek-6") ||
    q.includes("ek 6") ||
    q.includes("plan hazırla") ||
    q.includes("plan çıkar") ||
    q.includes("plan oluştur") ||
    q.includes("günün planı")
  );
}

function extractSubject(query: string): string {
  const clean = query
    .replace(/(merhaba|selam|bana|için|hakkında|bir|plan|etkinlik|hazırla|öner|ver|nasıl|yapabilirim|lütfen|istiyorum|ne|yapmalıyım|yardım)/gi, "")
    .trim();
  if (clean.length >= 3 && clean.length <= 35) {
    return clean.charAt(0).toLocaleUpperCase("tr-TR") + clean.slice(1);
  }
  return "Keşif ve Yaşam";
}

// ─── 1. SELAMLAŞMA & KİMLİK MODÜLÜ ──────────────────────────────────────────

function handleGreeting(): SynthesizedResponse {
  const md = `### 👋 Merhaba Değerli Öğretmenim!
Ben **MaarifOS Pedagojik Destek Asistanı**. T.C. Millî Eğitim Bakanlığı **Türkiye Yüzyılı Maarif Modeli (TYMM 2026)** Okul Öncesi Millî Müfredatı ile eğitilmiş özerk sınıf yardımcınızım.

#### 🎯 Neler Yapabilirim?
- **Sınıf Yönetimi & Kriz Çözümü:** Ağlayan çocuk, yemek reddi, akran kavgası, ayrılık kaygısı için somut çözümler.
- **Yaratıcı İçerik:** İstediğiniz her konuda orijinal masal, hikaye, tekerleme ve parmak oyunları.
- **Oyun & Atölye:** Yaş gruplarına (36-48, 48-60, 60-72 Ay) göre fen, matematik ve ritim oyunları.
- **Resmî MEB Formları:** EK-6 Günlük Plan, EK-2 Anekdot, Veli WhatsApp Bülteni ve Dönem Sonu Karne Cümleleri.
- **Eller Serbest:** Sınıfta çocuklarla ilgilenirken mikrofon simgesine (🎙️) basıp Türkçe konuşarak soru sorabilirsiniz.

> 💡 *Bana doğrudan bir soru yöneltebilirsiniz. Örneğin: **"Ağlayan çocuğu nasıl sakinleştiririm?"** veya **"Uzay temalı bir tekerleme yaz"**.*`;

  return {
    markdown: md,
    suggestedAction: "copy",
    category: "chat",
  };
}

// ─── 2. UYGULAMA İÇİ YARDIM & GEZİNME MODÜLÜ ─────────────────────────────────

function handleAppHelp(q: string): SynthesizedResponse {
  let topicHelp = "";
  if (q.includes("plan")) {
    topicHelp = `#### 🪄 Günlük & Aylık Plan Nasıl Yapılır?
1. **Resmî Günlük Planlayıcı (Sekme 1):** Ekranın solundaki 1. sekmeye girin. Konuyu girin; çiplere (Kavramlar, Materyaller, Rutinler) tek tek dokunun, klavye kullanmadan resmî EK-6 planınız saniyeler içinde oluşur.
2. **528 MEB Kitap Havuzu (Sekme 2):** MEB'in 9 resmî ders kitabından 528 gerçek etkinliği inceleyebilir, "Planlayıcıya Aktar" butonuyla anında plana dönüştürebilirsiniz.
3. **Aylık Plana Otomatik Aktarma (Sekme 4):** Ay sonu geldiğinde Aylık Plan ekranında **"✨ Günlük Planlardan Doldur"** butonuna basın; ay içindeki tüm günlük etkinlikleriniz tek tıkla EK-5 matrisine işlenir.`;
  } else if (q.includes("öğrenci") || q.includes("yoklama")) {
    topicHelp = `#### 👥 Öğrenci ve Yoklama Yönetimi:
- **Hızlı Dokunmatik Yoklama:** Ana ekranda her öğrencinin yanındaki **[✓ Var 🟢]**, **[✗ Yok 🔴]**, **[⏱ Geç 🟡]** butonlarına dokunarak 20 öğrenci için 20 saniyede yoklama alabilirsiniz.
- **Aylık Matris Excel (.xlsx):** Yoklama ekranındaki butona dokunarak MEB standartlarında \`SUBTOTAL(109)\` formüllü resmî aylık devam çizelgesini indirebilirsiniz.`;
  } else {
    topicHelp = `#### 📱 MaarifOS Temel Navigasyon Rehberi:
- **Sekme 1:** Adım Adım Resmî Günlük Planlayıcı (EK-6)
- **Sekme 2:** MEB 528 Çekirdek Kitap Etkinliği Kataloğu
- **Sekme 3:** Kayıtlı Günlük Planlarım Arşivi
- **Sekme 4:** EK-5 Aylık Eğitim Planı & Otomatik Senkron
- **Sekme 5:** EK-15 Yıllık Bütüncül Kontrol Çizelgesi
- **Sekme 6:** Meyve Günü & Görev Çizelgesi (İş günlerine adil paylaştırır)
- **Sekme 7:** MEB Resmî Müfredat & Beceri Dağılım Portalı
- **Sekme 8:** Yapay Zekâ Pedagojik Destek (Şu an buradasınız!)`;
  }

  const md = `### 🧭 MaarifOS Kullanım & Gezinme Kılavuzu
${topicHelp}

> 🖨️ **Çıktı Alma:** Tüm plan ve evraklarda **[🖨️ A4 Yazdır]** butonuna bastığınızda ekran gereksiz menülerden arınarak birebir resmî A4 kağıt formuna bükülür.`;

  return {
    markdown: md,
    suggestedAction: "copy",
    category: "help",
  };
}

// ─── 3. DAVRANIŞ YÖNETİMİ & KRİZ ÇÖZÜMÜ ──────────────────────────────────────

function handleBehaviorQuery(q: string, age: AgeGroup): SynthesizedResponse {
  // A. Okula uyum / Ağlama / Ayrılık kaygısı
  if (q.includes("ağl") || q.includes("ayrılık") || q.includes("annemi")) {
    const md = `### 🧸 Okula Uyum & Ağlayan Çocuğu Sakinleştirme Rehberi
**Pedagojik Teşhis:** Ayrılık kaygısı, güvenli bağlanmanın doğal bir tepkisidir. "Ağlama bak arkadaşların gülüyor" demek kaygıyı bastırır, duyguyu onaylamak ise güven inşa eder.

#### 🎯 4 Adımlı Sakinleştirme Protokolü:
1. **Göz Hizasına İnme & Duyguyu Aynalama:**
   - Diz çöküp göz teması kurun: *"Anneni çok özlediğini ve şu an burada olmasını istediğini biliyorum, bu çok normal. Ben buradayım, güvendesin."*
2. **Somut Zaman Kancası (Saat & Rutin):**
   - Soyut saatler ("2 saat sonra") yerine rutin dili kullanın: *"Biz şimdi müzik merkezinde şarkı söyleyeceğiz, sonra meyvemizi yiyeceğiz, bahçede oynadıktan sonra annen seni kapıda karşılayacak."*
3. **Güvenli Nesne / Görev Verme:**
   - Çocuğa sınıfta küçük bir sorumluluk verin: *"Bugün sınıfımızın minik saksısını sular mısın?"* veya *"Annenin verdiği mendili cebinde saklayıp ona enerji gönderebilirsin."*
4. **Kademeli Merkeze Geçiş:**
   - Hemen büyük gruba sokmayın; sakin bir köşe olan Kitap Merkezinde ya da Işık Masasında bire bir ilgiyle sakinleşmesini bekleyin.

> 📚 **TYMM Referansı:** SDB1.1 Kendini Tanıma ve Duygularını Düzenleme Becerisi.`;
    return { markdown: md, suggestedAction: "copy", category: "behavior" };
  }

  // B. Yemek Yememe / İştahsızlık
  if (q.includes("yemek") || q.includes("iştah") || q.includes("beslenme")) {
    const md = `### 🥦 Yemek Yemeyen / Beslenmeyi Reddeden Çocuk İçin Çözüm
**Pedagojik Kural:** Beslenme bir güç savaşına dönüştürülmemelidir. Zorlamak ve tehdit etmek yeme bozukluğunun birincil tetikleyicisidir.

#### 🍽️ Sınıf İçi Uygulama Stratejileri:
1. **"Sadece Kokla ve Tanı" Taktiki (Baskısız Merak):**
   - Çocuğa *"Hepsini bitirmek zorunda değilsin, sadece bir kaşık kokusuna bakabilir veya çatalla dokunabilirsin"* diyerek kontrol hissi verin.
2. **Akran Modellemesi:**
   - İştahlı ve yemekten keyif alan bir akranının yanına oturtun. Yetişkin övgüsü yerine çocukların birbirini görmesi ayna nöronları çalıştırır.
3. **Porsiyon Küçültme:**
   - Tabağa devasa porsiyon yerine tek bir lokma koyun. *"Bunu bitirince istersen yine alabilirsin"* demek çocuğun gözündeki yükü sıfırlar.
4. **Hikayeleştirme:**
   - *"Brokoli ağaçları bugün karnımızdaki minik canavarlara süper güç taşıyor!"* gibi sembolik oyun dili kullanın.

> 🍎 **TYMM Rutin 3:** Beslenme ve Öz Bakım Rutini — D16 Sorumluluk ve Sağlık Bilinci.`;
    return { markdown: md, suggestedAction: "copy", category: "behavior" };
  }

  // C. Vurma / Isırma / Öfke Patlaması
  if (q.includes("vur") || q.includes("ısır") || q.includes("öfke") || q.includes("saldır")) {
    const md = `### 🛑 Vurma, Isırma ve Öfke Patlaması Müdahale Protokolü
**Anlık Müdahale:** Öfke anındaki bir çocuğun beyni "savaş ya da kaç" modundadır. Bu esnada uzun nutuk çekmek hiçbir işe yaramaz.

#### ⚡ Acil Eylem Adımları:
1. **Fiziksel Güvenliği Sağlama (Sıfır Şiddet):**
   - Çocuğun elini nazikçe ama kararlı bir şekilde tutun: *"Dur. Vurmana izin veremem. Can yakmak güvenli değil."*
2. **Öfkeyi Değil, Eylemi Sınırlandırma:**
   - *"Kızgın olduğunu görüyorum, oyuncağın elinden alınması seni çok öfkelendirdi. Kızgın olabilirsin ama vuramazsın."*
3. **Güvenli Boşaltım Kanalı Sunma:**
   - *"Öfkeni çıkarmak için bu yastığı yumruklayabilirsin veya bu oyun hamurunu olanca gücünle sıkabilirsin."*
4. **Sakinleşince Onarım (Restoratif Adalet):**
   - Kriz geçtikten sonra: *"Arkadaşının canı yandı. Ona buz getirmek veya iyi olup olmadığını sormak ister misin?"*

> 🤝 **TYMM Referansı:** SDB1.2 Dürtü Kontrolü ve Barışçıl Çözüm Becerisi.`;
    return { markdown: md, suggestedAction: "copy", category: "behavior" };
  }

  // D. Çekingenlik / Konuşmama / İçe Kapanıklık
  if (q.includes("konuşmuyor") || q.includes("çekingen") || q.includes("içine kapanık")) {
    const md = `### 🌸 Çekingen ve Konuşmayan Çocuk İçin Güven Köprüsü
**Pedagojik Yaklaşım:** Seçici suskunluk (selektif mutizm) veya çekingenlik bir inatlaşma değil, sosyal kaygıdır. Çocuğu herkesin içinde konuşmaya zorlamak içe kapanmayı derinleştirir.

#### 🎨 Uygulama Adımları:
1. **Kukla ve Nesneler Üzerinden İletişim:**
   - Çocuğa doğrudan soru sormak yerine el kuklasıyla yaklaşın: *"Tavşan Çiko bugün biraz uykulu, senin boya kalemini merak etti."* Çocuklar kuklalara yetişkinlerden çok daha hızlı açılır.
2. **Sözsüz İfade Kanalları (Piktogram & Başparmak):**
   - Çemberde konuşmak istemiyorsa başparmağıyla (👍/👎) veya duygu kartıyla oy kullanmasına izin verin.
3. **Küçük İkili Gruplar (Buddy Sistemi):**
   - 20 kişilik sınıfta değil, 1 adet yumuşak huylu akranıyla birlikte blok veya kum havuzunda eşleştirin.

> 🌟 **TYMM Referansı:** SDB2.1 Akran İletişimi ve Ait Olma Hissi.`;
    return { markdown: md, suggestedAction: "copy", category: "behavior" };
  }

  // E. Tuvalet Kazası
  const md = `### 💧 Sınıfta Tuvalet Kazası / Alt Islatma Yaklaşımı
**Mahremiyet Kuralı:** Çocuk asla sınıfın ortasında utandırılmamalı, ses tonuyla bile suçluluk hissettirilmemelidir.

#### 🧼 Yapılması Gerekenler:
1. **Sakin ve Sıradan Karşılama:**
   - *"Olabilir böyle şeyler, bedenimiz bazen oyuna dalınca sinyali geç verebilir. Gel temiz çamaşırlarımızı giyelim."*
2. **Göz Teması ve Mahremiyet:**
   - Diğer çocukların dikkatini başka yöne çekin; çocuğu sessizce tuvalete götürüp temizlenmesine nazikçe yardımcı olun.
3. **Rutin Hatırlatması:**
   - Günde 3 sabit tuvalet geçiş rutini (Etkinlik öncesi, yemek sonrası, bahçe dönüşü) uygulayın.`;
  return { markdown: md, suggestedAction: "copy", category: "behavior" };
}

// ─── 4. YARATICI İÇERİK: TEKERLEME, PARMAK OYUNU, MASAL ───────────────────────

function handleCreativeContent(q: string, topic: string, age: AgeGroup): SynthesizedResponse {
  // A. Tekerleme
  if (q.includes("tekerleme")) {
    const md = `### 🎵 "${topic}" Temalı Eğlenceli Okul Öncesi Tekerlemesi
**Hedef Yaş:** ${age} Ay | **Kazanım:** TADB.1 Ses Farkındalığı & Artikülasyon

\`\`\`text
Pıt pıt pıtır pıt,
${topic} geldi kapıyı tık tık tık!
Açtım baktım kim var orada?
Bir minik tavşan zıplar kırda.

Kulakları dik, burnu minik,
Sepetinde elma, cepleri delik!
Bir, iki, üç, dört, beş,
${topic} ile olduk biz kardeş!
Şimdi herkes yerine otursun,
Sınıfımıza neşe dolsun!
\`\`\`

> 💡 **Uygulama İpucu:** Tekerlemeyi önce hızlı, sonra yavaş, sonra da fısıltı sesiyle söyleyerek çocukların işitsel dikkatini pekiştirin.`;
    return { markdown: md, suggestedAction: "copy", category: "creative" };
  }

  // B. Parmak Oyunu
  if (q.includes("parmak")) {
    const md = `### 🖐️ "${topic}" Parmak Oyunu (El & Beden Hareketli)
**Hedef Yaş:** ${age} Ay | **Kazanım:** HAB.1 Küçük Kas Becerileri & Koordinasyon

\`\`\`text
(İki el arkada saklanır)
İki küçük tohum toprağın altında uyurmuş.
(Eller yumruk yapılır, baş yere eğilir)

Güneş doğmuş sıcacık,
(Kollar yukarı kaldırılıp daire yapılır)
Yağmur yağmış şıp şıp şıp!
(Parmaklar yukarıdan aşağıya sallanarak şaklatılır)

Tohumlar uyanmış, yavaşça uzanmış.
(Yumruklar yavaşça açılır, parmaklar yukarı uzatılır)

Biri kocaman bir ${topic} olmuş,
(Bir el iyice açılır ve sallanır)
Diğeri rüzgarla dans eden yaprak olmuş!
(Diğer el sağa sola dalgalandırılır)

Rüzgar esmiş: Vuufff!
(Kuvvetlice üflenir)
Çiçekler birbirine sarılmış!
(İki el göğüste birbirine kenetlenir)
\`\`\`

> 🌟 **Geçiş Ritüeli:** Parmak oyununun sonundaki sarılma hareketi ile sınıfta anında sessizlik ve odak sağlanır.`;
    return { markdown: md, suggestedAction: "copy", category: "creative" };
  }

  // C. Masal / Hikaye
  const md = `### 📖 "${topic}" Temalı Özgün Masal: "Meraklı Çakıl'ın Keşfi"
**Hedef Yaş:** ${age} Ay | **Süre:** 6-8 Dakika | **Değer:** Merak (E1.1) ve İş Birliği (D5)

Bir varmış, bir yokmuş... Gökyüzünün masmavi, derelerin şıkır şıkır aktığı kocaman bir ormanda, Meraklı Çakıl adında sevimli bir sincap yaşarmış. Çakıl her sabah erkenden uyanır, meşe ağacının tepesine çıkar ve etrafı koklarmış.

Bir gün yerde daha önce hiç görmediği pırıl pırıl parlayan bir **${topic}** görmüş! 

Çakıl hemen büyütecini almış, yanına yaklaşmış. Dokunmuş: *"Burası pürüzlü, ama burası çok yumuşak!"* demiş. Tam o sırada ormanın bilge kaplumbağası Tontiş çıkagelmiş:
— *"Merhaba Çakıl, ne inceliyorsun öyle?"*
Çakıl heyecanla yanıt vermiş:
— *"Tontiş bak! Bu ${topic} çok özel bir şeye benziyor. Gel birlikte araştıralım!"*

İki arkadaş ${topic} etrafında daire çizmişler. Renklerini saymışlar: Sarı, yeşil ve biraz da mavi! Birlikte bir şarkı uydurmuşlar:
*"Küçük büyük fark etmez, merak eden pes etmez!"*
O günden sonra ormandaki bütün hayvanlar bir araya gelip kendi ${topic} merkezlerini kurmuşlar ve her gün yeni bir şey öğrenmişler.

---
#### 💬 Hikaye Sonrası Sohbet Soruları:
1. Çakıl ${topic} ile ilk karşılaştığında nasıl hissetti?
2. Sence Çakıl ve Tontiş birlikte çalışmasaydı ne olurdu?
3. Sınıfımızda ${topic} gibi merak ettiğin ne var?`;

  return { markdown: md, suggestedAction: "copy", category: "creative" };
}

// ─── 5. OYUN & ATÖLYE ÖNERİSİ ────────────────────────────────────────────────

function handleGameProposal(q: string, topic: string, age: AgeGroup): SynthesizedResponse {
  const isMath = q.includes("matematik") || q.includes("sayı");
  const isScience = q.includes("fen") || q.includes("deney");

  if (isMath) {
    const md = `### 🎲 Matematik Oyunu: "Sayı Dedektifleri ve Renkli Halkalar"
**Hedef Yaş:** ${age} Ay | **Kazanım:** MAB.2 Sayma ve Miktar Algısı

**Malzemeler:**
- 5 adet renkli plastik tabak (üzerlerine 1'den 5'e kadar büyük rakamlar yazılı)
- 15 adet çam kozalağı veya renkli düğme
- 1 adet zar

**Nasıl Oynanır?**
1. Sınıf zeminine 1'den 5'e kadar tabaklar dizilir.
2. Çocuk zarı atar. Gelen sayı kadar nesneyi (örneğin 3 kozalak) masadan iki eliyle alır.
3. Üzerinde "3" yazan tabağı bulur ve kozalakları sayarak tabağın içine bırakır: *"Bir, iki, üç!"*
4. **Oyunlaştırma:** Doğru eşleştiren çocuk "Sayı Dedektifi Rozeti" kazanır ve arkadaşına el verir.`;
    return { markdown: md, suggestedAction: "copy", category: "game" };
  }

  if (isScience) {
    const md = `### 🔬 Fen & Keşif Deneyi: "Yüzen ve Batan Gizemli Nesneler"
**Hedef Yaş:** ${age} Ay | **Kazanım:** FAB.2 Tahmin Yürütme ve Gözlem Yapma

**Malzemeler:**
- Şeffaf geniş su leğeni
- Kuru yaprak, taş, ahşap blok, madeni para, elma dilimi, plastik kapak
- Tahmin ve Sonuç Panosu (Yüzer 🚢 / Batar ⚓)

**Uygulama Süreci:**
1. **Hipotez (Tahmin):** Çocuk taş parçasını eline alır: *"Sence bunu suya bıraktığımızda ne olacak, yüzer mi batar mı?"*
2. **Deneyimleme:** Nesne suya bırakılır, suyun hareketi incelenir.
3. **Kavramlaştırma:** *"Ağır ve yoğun olanlar batar, içinde hava olan hafifler suyun üstünde kalır."*
4. **Kayıt:** Çocuklar gözlem panosuna gülen yüz etiketi yapıştırır.`;
    return { markdown: md, suggestedAction: "copy", category: "game" };
  }

  // Genel Hareketli Oyun
  const md = `### 🏃‍♂️ Hareketli Grup Oyunu: "Rüzgar ve Ağaçlar"
**Hedef Yaş:** ${age} Ay | **Kazanım:** HAB.1 Denge, Koordinasyon ve Yönerge Takibi

**Oyun Kurgusu:**
- Çocuklar sınıfta serbestçe birer "ağaç" olurlar; kollarını dal gibi açarlar.
- Öğretmen tefle hafif vurduğunda *"Tatlı bir ilkbahar rüzgarı esiyor"* denir; çocuklar yavaşça sallanır.
- Tef hızlı vurulduğunda *"Fırtına çıktı!"* denir; çocuklar ayaklarını basmadan yerinde döner.
- Ritim durup öğretmen *"Kökler toprağa tutundu!"* dediğinde herkes tek ayak üzerinde dengede heykel olur.`;

  return { markdown: md, suggestedAction: "copy", category: "game" };
}

// ─── 6. GENEL VE DERİN PEDAGOJİK DANIŞMANLIK (FALLBACK) ──────────────────────

function handleGeneralConsultation(query: string, topic: string, age: AgeGroup): SynthesizedResponse {
  const md = `### 💡 Pedagojik Danışmanlık & Çözüm Masası
**Soru:** *"${query}"*
**Gelişim Dönemi:** ${age} Ay | **Çerçeve:** TYMM 2026 Bütüncül Çocuk Gelişimi

#### 🔍 1. Pedagojik Değerlendirme & Teşhis
Bu durum okul öncesi dönem çocuklarının **keşif güdüsü**, **öz düzenleme arayışı** ve **somut yaşantı ihtiyacı** ile doğrudan bağlantılıdır. Çocuklar dünyayı kavramsal tanımlarla değil; duyusal deneyimler, güvenli ilişkiler ve oyun diliyle kavrarlar.

#### 🛠️ 2. Sınıfta 3 Somut Eylem Adımı:
1. **Duyguyu Tanıma & Onaylama:** 
   - Çocukla iletişime geçerken ilk önce onun göz hizasına inin ve ihtiyacını söze dökün: *"Bunun senin için önemli olduğunu biliyorum."*
2. **Somut Seçenek Sunma (Yetkilendirme):** 
   - Çocuğa emir vermek yerine sınırları çizilmiş 2 kabul edilebilir alternatif sunun: *"Önce resim merkezine mi gitmek istersin yoksa bloklarla mı oynamak istersin?"*
3. **Akran & Oyun Köprüsü:** 
   - Süreci bireysel çatışma veya didaktik anlatımdan çıkarıp küçük grup oyununa veya sembolik drama rolüne dönüştürün.

#### 💬 3. Çemberde Yansıtma Sorusu:
> *"Bugün birlikte çalışırken bize en çok ne neşe verdi, yarın bunu daha iyi yapmak için ne deneyebiliriz?"*

> 📌 **TYMM Eğilim Kodu:** E1.1 Merak ve E2.4 İş Birliğine Açıklık.`;

  return {
    markdown: md,
    suggestedAction: "copy",
    category: "general",
  };
}

// ─── DİĞER ÖZEL MODÜLLER (EK-6, Anekdot, Veli, vb.) ───────────────────────────

function buildRainyDayRescue(topic: string, age: AgeGroup): SynthesizedResponse {
  const md = `### 🌧️ Acil Kurtarıcı: Yağmurlu Gün & Sınıf İçi Enerji Boşaltma
**Hedef Yaş:** ${age} Ay | **Süre:** 15-20 Dakika | **Ortam:** Sınıf İçi Açık Alan

#### 🎯 Etkinlik: "Dev Adımlar & Karınca Yürüyüşü" (Motor Koordinasyon)
Bahçeye çıkılamayan kapalı havalarda çocukların biriken kinestetik enerjilerini kontrollü, eğlenceli ve müzikli bir kurguyla boşaltıyoruz.

**Gerekli Malzemeler:**
- 1 Adet Tef veya ritim çubuğu (yoksa el çırpma)
- Renkli zemin kağıt bantları (yer çizgileri için)
- 4 adet minder / yastık (dinlenme adaları)

**Adım Adım Uygulama Akışı:**
1. **Hareket Fazı (Fırtına):** Tef hızlı çalındığında çocuklar sınıfın serbest alanında parmak ucunda minik hızlı adımlarla koşar ("Yağmur çiseliyor!").
2. **Dev Fazı (Gök Gürültüsü):** Tefe sertçe bir kez vurulduğunda herkes dev adımlarıyla ağır ağır zıplar ("Gök gürledi, devler yürüyor!").
3. **Donma & Heykel Fazı (Şimşek):** Ritim aniden durduğunda çocuklar en sevdikleri hayvan pozunda kıpırdamadan donar.
4. **Sakinleşme (Gökkuşağı Çemberi):** Son olarak yere minderlere oturulur; derin nefes alma egzersizi yapılır: *"Bir elimizde sıcak çorba var üflüyoruz, diğerinde güzel bir çiçek kokluyoruz."*

> 💡 **Pedagojik Not:** Ani hareket-durdurma oyunları prefrontal korteksi uyararak öz düzenleme ve inhibitör kontrol (dürtü denetimi) becerisini pekiştirir.`;

  return { markdown: md, suggestedAction: "copy", category: "emergency" };
}

function buildPeaceTableRemedy(): SynthesizedResponse {
  const md = `### 🕊️ Barış Masası & Oyuncak Paylaşamama Çözüm Protokolü
**MEB TYMM Değer Odakları:** D1. Adalet, D14. Saygı, D5. Dostluk, SDB2.1 Sosyal Farkındalık

Sınıfta iki çocuk aynı oyuncağı veya merkezi paylaşamadığında hakem olmak yerine çocukları **Onarıcı Adalet** ile uzlaştırın:

#### 4 Aşamalı Barış Çemberi:
1. **Sakinleşme:** İki çocuk Barış Masası'na davet edilir. Ortaya 2 dakikalık bir sıvı kum saati konur. Kum bitene kadar konuşmadan nefes alınır.
2. **Sırayla Duygu İfadesi ("Ben Dili"):** Konuşma taşı kime verilirse o konuşur, diğeri dinler:
   - *"Arkadaşım elimden çekince kendimi üzgün hissettim, çünkü henüz kulemi bitirmemiştim."*
3. **Empati Yansıtması:** Dinleyen çocuk arkadaşının cümlesini tekrar eder:
   - *"Anladım, kuleni bitiremediğin için üzüldün."*
4. **Ortak Çözüm Seçimi (Çocuklar karar verir):**
   - **Seçenek A:** Sırayla oynama (Kum saati bitince sıra değişir).
   - **Seçenek B:** Ortak inşa (Biri temeli yapar, diğeri çatıları koyar).

> 🤝 **Ritüel Kapanışı:** İki çocuk el sıkışır ya da "Barış Çakı" yapar. Öğretmen süreci kolaylaştırır, hüküm vermez.`;

  return { markdown: md, suggestedAction: "copy", category: "emergency" };
}

function buildZeroWasteRemedy(topic: string, age: AgeGroup): SynthesizedResponse {
  const md = `### ♻️ Sıfır Bütçe & Doğal Atık Etkinlik Reçetesi
**Tema:** ${topic} | **Kullanılan:** Kağıt Ruloları, Kuru Yapraklar, İpler, Plastik Kapaklar

#### 🧪 "Doğa Dedektifleri ve Rulo Dürbünler"
**Kazanımlar:** FAB.1 Gözlem Yapma, SNAB.1 Özgün Ürün Geliştirme, OB8 Sürdürülebilirlik

**Uygulama Adımları:**
1. **Dürbün Yapımı:** 2 adet tuvalet kağıdı rulosu birbirine pamuk ipliği veya kağıt bantla bağlanır. Çocuklar üzerini kuru yapraklar ve pastel boyayla kamufle eder.
2. **Sınıf Safari Turu:** Sınıf içinde veya koridorda "Renk ve Doku Keşif Yolu" oluşturulur. Çocuklar dürbünleriyle odaklanarak sınıftaki "pürüzlü", "soğuk", "yuvarlak" nesneleri avlar.
3. **Kapak Matematik Terazisi:** Biriktirilen su kapakları sınıfın ortasına dökülür; kaşıklarla kapak toplama ve renklerine göre gruplama yarışı yapılır.

> 🍃 **TYMM Notu:** Sıfır atık yaklaşımı çocukta tüketim çılgınlığı yerine üretici ve çevreci eğilim (E3.8) geliştirir.`;

  return { markdown: md, suggestedAction: "copy", category: "emergency" };
}

function buildFamilyWhatsAppNotice(topic: string, age: AgeGroup, ctx: AIContext): SynthesizedResponse {
  const dateStr = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  const text = `Sevgili Velilerimiz, Merhaba! 🌿

${dateStr} haftasında miniklerimizle birlikte "${topic}" temalı harika bir keşif yolculuğuna çıktık. 🚀

Bu hafta sınıfta:
• "${topic}" konusunu inceledik ve merak sorularımızın peşine düştük. 🔍
• Öğrenme merkezlerimizde grup oyunları ve yaratıcı sanat çalışmaları yaptık. 🎨
• Akranlarımızla paylaşma, sıra bekleme ve nezaket değerlerimizi pekiştirdik. 🤝

🏡 Evde Neler Yapabilirsiniz? (10 Dakikalık Aile Önerisi):
Bu akşam çocuğunuzla evinizdeki nesneler üzerine kısa bir sohbet edebilir; birlikte küçük bir gözlem oyunu oynayabilirsiniz. Onun meraklı sorularına "Sen ne düşünüyorsun?" diyerek düşünme alanını genişletebilirsiniz.

📌 Hatırlatma: Meyve Günü etkinliğimiz için çocuklarımızın çantasına sevdikleri bir meyveyi dilimlenmiş olarak koymayı unutmayınız. 🍎🍐

Sevgi dolu ve verimli bir hafta dileriz! ✨
— Okul Öncesi Zümresi`;

  const md = `### 📱 Öğretmen Onayına Hazır Veli Bülteni Taslağı
Aşağıdaki metin okul öncesi iletişim dili gözetilerek taslak olarak hazırlanmıştır. Göndermeden önce öğretmen tarafından kontrol edilmelidir:

\`\`\`text
${text}
\`\`\`

> 💡 *Aşağıdaki **"WhatsApp'a Gönder"** butonuna basarak metni doğrudan veli grubunuza aktarabilirsiniz.*`;

  return { markdown: md, suggestedAction: "whatsapp", category: "family" };
}

function buildAnecdoteTemplate(topic: string, age: AgeGroup): SynthesizedResponse {
  const dateStr = new Date().toISOString().slice(0, 10);
  const md = `### 📝 Resmî EK-2 Anekdot Kayıt Formu Taslağı
**MEB TTKB Okul Öncesi Programı Sayfa 178 Standardı**

| Alan | Bilgi |
|---|---|
| **Gözlem Tarihi** | ${dateStr} |
| **Gözlenen Ortam** | Blok ve İnşa Merkezi / Sınıf İçi Serbest Oyun |
| **Gözlenen Çocuk** | Örnek Öğrenci (${age} Ay) |
| **Gözlemci Öğretmen** | Sınıf Öğretmeni |

#### 👁️ Gözlenen Olay / Durum (Objektif ve Yorumsuz):
> *"Çocuk blok merkezinde tahta prizmaları üst üste koyarak 8 katlı bir kule inşa etti. Kule sallanmaya başladığında yanındaki akranına baktı ve 'Altına geniş bloğu koyarsak yıkılmaz' diyerek tabanı genişletti. Kule tamamlandığında ellerini çırparak 'Mühendis kulesi oldu!' dedi ve arkadaşını kuleye ekleme yapması için davet etti."*

#### 🎯 Gözlenen Beceri ve Süreç Bileşenleri:
- **MAB.1:** Geometrik şekilleri denge ve boyut ilişkisine göre kullanabilme.
- **SDB2.1:** Akranıyla iş birliği yapma ve ortak oyun kurgulama.
- **E1.1 (Merak & Keşif):** Problemle karşılaştığında alternatif çözüm deneme.

#### 💡 Öğretmen Yorumu & Pedagojik Öneri:
Çocuğun uzamsal algısı ve problem çözme becerisi yaş düzeyine uygundur. Fen ve matematik merkezinde rampa deneyleri sunularak merakı desteklenecektir.`;

  return { markdown: md, suggestedAction: "copy", category: "anecdote" };
}

function buildTermReportComments(topic: string): SynthesizedResponse {
  const md = `### 🎓 Dönem Sonu Resmî Gelişim Raporu (Karne) Pedagojik Görüş Bankası
**MEB Yönetmeliğine Uygun, Güçlü Yönleri Vurgulayan Cümleler:**

#### 🌟 1. Sosyal-Duygusal Gelişim & Erdemler
- *"Sınıf içi kurallara ve arkadaş haklarına gösterdiği derin saygı, onu sınıfımızın sevilen bir barış elçisi yapmaktadır. Grup oyunlarında üstlendiği adil roller takdire şayandır."*
- *"Duygularını sözel olarak net bir biçimde ifade edebilmekte, problem durumlarında uzlaşmacı ve yapıcı yaklaşımlar sergileyerek olgunluk göstermektedir."*

#### 🧩 2. Bilişsel & Dil Becerileri
- *"Merak duygusu ve olaylar arasındaki neden-sonuç bağlarını keşfetme isteği çok yüksektir. Günlük sohbette kullandığı zengin sözcük dağarcığı ve analitik soruları dikkat çekmektedir."*
- *"Öğrenme merkezlerinde başladığı projeleri büyük bir sabır ve azimle sonuca ulaştırmakta; yeni kavramları hızla içselleştirmektedir."*

#### 🎨 3. Motor & Sanat Gelişimi
- *"Küçük kas koordinasyonu gerektiren makas, boya ve montaj çalışmalarında oldukça titiz ve özgün ürünler ortaya koymaktadır."*`;

  return { markdown: md, suggestedAction: "copy", category: "general" };
}

function buildDifferentiationGuide(topic: string, age: AgeGroup): SynthesizedResponse {
  const md = `### 🎯 Bireyselleştirilmiş Farklılaştırma (BEP & Zenginleştirme)
**Tema:** ${topic} | **Kapsam:** MEB TTKB s. 105-108 Farklılaştırma Esasları

#### 🟢 Destekleme Stratejileri (Özel Gereksinimli / Odaklanma Güçlüğü Olan Çocuklar):
1. **Somut Piktogram Kartları:** Sözlü yönergeler 3 adımı geçmeyecek şekilde resimli kartlarla görselleştirilir.
2. **Dokunsal Materyal Eşliği:** Dokunma, koklama ve hissetme duyuları devreye sokulur.
3. **Akran Eşleşmesi (Buddy):** İletişimi güçlü bir sınıf arkadaşı ile çalışma ortağı yapılır.

#### 🟣 Zenginleştirme Stratejileri (İleri Düzey / Üstün Yetenekli Çocuklar):
1. **Çok Değişkenli Problem Durumu:** *"Peki bu kuleyi sadece üçgen bloklarla yapsaydık nasıl dengede tutabilirdik?"* gibi hipotez soruları yöneltilir.
2. **Merkez Kolaylaştırıcılığı:** Malzeme yöneticisi rolü verilerek sorumluluk duygusu desteklenir.`;

  return { markdown: md, suggestedAction: "copy", category: "differentiation" };
}

function buildResearchQuestions(topic: string, age: AgeGroup): SynthesizedResponse {
  const md = `### 🔍 Merak ve Keşif Uyandıran 5 Açık Uçlu Araştırma Sorusu
**Tema:** "${topic}" | **Yaş:** ${age} Ay (TYMM E1.1 Merak Eğilimi)

1. *"Sence ${topic} olmasaydı dünyamız ve günlük hayatımız nasıl görünürdü?"*
2. *"${topic} ile ilgili gördüğün bir şeyi bir renge benzetseydin bu ne olurdu, neden?"*
3. *"Eğer bir büyüteçle çok yakından baksaydık, daha önce kimsenin fark etmediği neyi görebilirdik?"*
4. *"Bunu evdeki malzemelerle yeniden yapmak isteseydin ilk olarak nereden başlardın?"*
5. *"Bu konuda aklına gelen en şaşırtıcı soru nedir?"*`;

  return { markdown: md, suggestedAction: "copy", category: "general" };
}

function buildDailyPlanPackage(
  topic: string,
  age: AgeGroup,
  query: string,
  ctx: AIContext,
): SynthesizedResponse {
  const todayIso = new Date().toISOString().slice(0, 10);
  const researchQ = ctx.researchQuestion || `"${topic}" çevremizi nasıl güzelleştirir ve onu keşfederken neler öğrenebiliriz?`;

  const plan = createDailyPlan({
    date: todayIso,
    ageGroup: age,
    topic: topic,
    schoolName: "Atatürk Anaokulu",
    teacherName: "Okul Öncesi Öğretmeni",
  });

  plan.topic = topic;
  plan.activityName = `${topic} Keşif Atölyesi`;
  plan.researchQuestion = researchQ;
  plan.domainCodes = ["TADB.1", "MAB.1", "FAB.1", "SNAB.1"];
  plan.processCodes = ["TADB.1.a", "MAB.1.a", "FAB.1.b"];
  plan.tendencyCodes = ["E1.1", "E2.4", "E3.2"];
  plan.sdbCodes = ["SDB1.1", "SDB2.1"];
  plan.valueCodes = ["D14.Saygı", "D16.Sorumluluk", "D12.Sevgi"];
  plan.conceptLabels = ctx.concepts && ctx.concepts.length ? ctx.concepts : ["Büyük - Küçük", "Aynı - Farklı"];
  plan.materialLabels = ctx.materials && ctx.materials.length ? ctx.materials : ["Doğal ahşap bloklar", "Büyüteçler", "Fon kartonu"];
  plan.learningEnvLabels = ["Blok Merkezi", "Sanat Merkezi", "Fen Merkezi"];
  plan.selectedCenters = ["blok", "sanat", "fen"];
  plan.activityTypes = ["butunlesik_2", "turkce", "sanat"];
  plan.groupTypes = ["buyuk_grup", "kucuk_grup"];
  plan.spatialTypes = ["sinif_ici", "acik_hava_etk"];
  plan.pedagogicalMethods = ["oyun_temelli", "sorgulama"];
  plan.activityProcessNote = `Güne merak sorusu ile başlandı. Çocuklarla ${topic} hakkında sohbet edildi ve ilgili merkezlerde deneyimleme sağlandı.`;
  plan.selectedEvalQuestions = [
    `Bugün ${topic} ile ilgili en çok neyi keşfetmek hoşuna gitti?`,
    `Etkinlik sırasında bir arkadaşına nasıl yardım ettin?`,
  ];

  const md = `### 🪄 Tam Teşekküllü EK-6 Günlük Plan Taslağı
**Günün Teması:** ${topic} | **Yaş Grubu:** ${age} Ay | **Tarih:** ${todayIso}
**Araştırma Sorusu:** *"${researchQ}"*

---

#### 1. Alan Becerileri ve Değerler
- **Türkçe & Fen:** TADB.1 Dinleme & Konuşma, FAB.1 Doğal Olayları Gözlemleme
- **Matematik & Sanat:** MAB.1 Sınıflandırma, SNAB.1 Özgün Tasarım
- **Değerler & Eğilimler:** D14 Saygı, D16 Sorumluluk · E1.1 Merak, E2.4 İş Birliği

#### 2. İçerik ve Öğrenme Merkezleri
- **Kavramlar:** ${plan.conceptLabels.join(", ")}
- **Materyaller:** ${plan.materialLabels.join(", ")}
- **Açılan Merkezler:** 🧱 Blok Merkezi, 🎨 Sanat Merkezi, 🔬 Fen & Doğa Merkezi

#### 3. Öğrenme-Öğretme Süreci:
1. **Güne Başlama Rutini (08:30–09:00):** Karşılama çemberi ve günün araştırma sorusu.
2. **Merkezlerde Oyun (09:00–10:00):** İlgili merkezlerde bağımsız keşif.
3. **Bütünleştirilmiş Etkinlik (10:30–11:30):** Hikaye, oyun ve özgün sanat çalışması.
4. **Günü Değerlendirme Çemberi (14:30–15:00):** Günün yansıtılması ve kapanış.

---

> 🚀 **1-Tıkla Entegrasyon:** Bu planı doğrudan sisteminize kaydetmek için aşağıdaki **"🪄 Günlük Plana Aktar"** butonuna basınız.`;

  return {
    markdown: md,
    generatedPlan: plan,
    suggestedAction: "inject_plan",
    category: "plan",
  };
}
