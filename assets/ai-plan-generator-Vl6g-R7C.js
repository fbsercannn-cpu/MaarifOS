var e={"09":`Eylül`,10:`Ekim`,11:`Kasım`,12:`Aralık`,"01":`Ocak`,"02":`Şubat`,"03":`Mart`,"04":`Nisan`,"05":`Mayıs`,"06":`Haziran`},t=[`Gün sonunda çocuklarla değerlendirme çemberi oluşturuldu. Çocukların gün içerisindeki deneyimlerine, duygularına ve düşüncelerine açık uçlu sorularla yer verildi; cevaplar doğru/yanlış denilmeden saygıyla dinlendi.`,`Portfolyo gelişim dosyası için çocuklarla birlikte o günün ürün ve kanıt seçimi yapıldı. Seçim gerekçeleri çocukların kendi ifadeleriyle kayıt altına alındı.`,`Anekdot kayıt formu (EK-2) kullanılarak çocukların bağımsız keşif anları, akran iş birliği ve problem çözme davranışları doğal ortamında gözlemlendi.`,`Duygu durum panosu ve resimli gün akış kartları üzerinden geriye dönük yansıtma yapıldı; çocukların en çok keyif aldığı ve merak duyduğu etkinlikler tespit edildi.`],n=[`Kavramı hızlı kavrayan çocuklara neden-sonuç bağlantısı kurduran çok değişkenli açık uçlu problem durumları sunuldu.`,`Akran rehberliği ve küçük grup kolaylaştırıcılığı rolü verilerek liderlik ve iletişim becerileri pekiştirildi.`,`3 boyutlu modelleme, karma teknikle sanat tasarımı ve bağımsız araştırma istasyonunda derinleşme imkânı sağlandı.`,`Kendi oyun kuralını tasarlama ve probleme alternatif çözüm yolları geliştirme fırsatı tanındı.`],r=[`Karmaşık yönergeler tek adımlı ve somut nesnelerle gösterilerek sunuldu; piktogram kartlarıyla destek sağlandı.`,`Bire bir yetişkin rehberliği eşliğinde model olundu; çocuğa kendi hızında denemesi için ek bekleme süresi tanındı.`,`Sözlü ifade yerine kartla gösterme, jest-mimik ve nesne seçimi gibi çoklu ifade kanalları devreye sokuldu.`,`Dikkat dağıtıcı uyaranlar azaltılarak sakin bir çalışma alanı ve ergonomik tutuş aparatları sunuldu.`],i=`maarifos_daily_plans_v065`;function a(){if(typeof window>`u`)return[];try{let e=localStorage.getItem(i)||localStorage.getItem(`maarifos_daily_plans_v064`);if(!e)return[];let t=JSON.parse(e);return Array.isArray(t)?t:[]}catch{return[]}}function o(e){if(!(typeof window>`u`))try{localStorage.setItem(i,JSON.stringify(e)),window.dispatchEvent(new CustomEvent(`maarifos_plans_updated`,{detail:{plans:e}})),window.dispatchEvent(new CustomEvent(`maarif_plan_saved`,{detail:{plans:e}}))}catch(e){console.error(`[MaarifOS daily-plan-core] Kaydetme hatası:`,e)}}function s(e){let t=new Date().toISOString();return{id:typeof crypto<`u`&&crypto.randomUUID?crypto.randomUUID():`dp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,date:e?.date??t.slice(0,10),ageGroup:e?.ageGroup??`60-72`,schoolName:(e?.schoolName??`Atatürk Anaokulu`).trim(),teacherName:(e?.teacherName??`Okul Öncesi Öğretmeni`).trim(),topic:(e?.topic??``).trim(),researchQuestion:(e?.researchQuestion??``).trim(),domainCodes:e?.domainCodes??[],processCodes:e?.processCodes??[],tendencyCodes:e?.tendencyCodes??[],sdbCodes:e?.sdbCodes??[],valueCodes:e?.valueCodes??[],literacyCodes:e?.literacyCodes??[],specialDayCodes:e?.specialDayCodes??[],conceptLabels:e?.conceptLabels??[],words:(e?.words??``).trim(),materialLabels:e?.materialLabels??[],learningEnvLabels:e?.learningEnvLabels??[],learningEnvNote:(e?.learningEnvNote??``).trim(),routineStartingDayId:e?.routineStartingDayId??`gb_selamlama_cemberi`,startingDayPreset:e?.startingDayPreset??0,selectedCenters:e?.selectedCenters??[`blok`,`sanat`,`kitap`],centersPlayNote:(e?.centersPlayNote??``).trim(),routineSnackCleanId:e?.routineSnackCleanId??`bt_sofra_duzeni`,routineTransitionId:e?.routineTransitionId??`gc_ritim_sinyali`,activityName:(e?.activityName??``).trim(),activityTypes:e?.activityTypes??[`matematik`,`sanat`,`butunlesik_2`],groupTypes:e?.groupTypes??[`buyuk_grup`,`kucuk_grup`],spatialTypes:e?.spatialTypes??[`sinif_ici`],pedagogicalMethods:e?.pedagogicalMethods??[`oyun_temelli`,`sorgulama`],activityProcessNote:(e?.activityProcessNote??``).trim(),enrichmentStrategies:e?.enrichmentStrategies??[],enrichmentPreset:e?.enrichmentPreset??0,enrichmentCustomNote:(e?.enrichmentCustomNote??``).trim(),supportStrategies:e?.supportStrategies??[],supportPreset:e?.supportPreset??0,supportCustomNote:(e?.supportCustomNote??``).trim(),selectedEvalQuestions:e?.selectedEvalQuestions??[],childEvalPreset:e?.childEvalPreset??0,programEvalPreset:e?.programEvalPreset??0,teacherEvalPreset:e?.teacherEvalPreset??0,familyParticipationId:e?.familyParticipationId??`aile_renk_avi`,communityParticipationId:e?.communityParticipationId??`toplum_cevre_projesi`,familyNote:(e?.familyNote??``).trim(),createdAt:e?.createdAt??t,updatedAt:t}}function c(e,t){let i=s({ageGroup:e.ageGroup,date:t||new Date().toISOString().slice(0,10)});return i.topic=e.title,i.activityName=e.title,i.researchQuestion=e.researchQuestion||`${e.title} ile çevremizde neleri keşfedebiliriz?`,i.materialLabels=e.materials&&e.materials.length>0?[...e.materials]:[`Büyük boy el büyüteçleri`,`Renkli fon kartonları`],i.conceptLabels=e.concepts&&e.concepts.length>0?[...e.concepts]:[`Aynı - Farklı`],i.valueCodes=e.values&&e.values.length>0?[...e.values]:[`D14 Saygı`,`D16 Sorumluluk`],i.tendencyCodes=e.tendencies&&e.tendencies.length>0?[...e.tendencies]:[`E1.1 Merak`,`E2.4 İş Birliğine Açıklık`],i.activityProcessNote=e.text||``,i.enrichmentStrategies=[n[0]],i.supportStrategies=[r[0]],i.childEvalPreset=0,i.programEvalPreset=0,i.teacherEvalPreset=0,i.selectedEvalQuestions=[`Bugün ${e.title} etkinliğinde seni en çok ne şaşırttı?`,`Etkinlikteki kavramları evimizde veya bahçede nerede bulabiliriz?`,`Birlikte çalışırken hangi davranışımız arkadaşlarımıza yardımcı oldu?`,`Yarın bu konuyu devam ettirmek için ne yapabiliriz?`],i}function l(e){let t=a(),n=t.findIndex(t=>t.id===e.id),r={...e,updatedAt:new Date().toISOString()},i=n>=0?[...t.slice(0,n),r,...t.slice(n+1)]:[r,...t];return o(i),i}function u(e){let t=a().filter(t=>t.id!==e);return o(t),typeof window<`u`&&(window.dispatchEvent(new CustomEvent(`maarif_plan_deleted`,{detail:{id:e}})),window.dispatchEvent(new CustomEvent(`maarif_plan_mutated`,{detail:{id:e,type:`delete`}}))),t}function d(e,t){let n=a(),r=n.find(t=>t.id===e);if(!r)return null;let i=r.date;return r.date=t,r.updatedAt=new Date().toISOString(),o(n),typeof window<`u`&&(window.dispatchEvent(new CustomEvent(`maarif_plan_date_changed`,{detail:{id:e,oldDate:i,newDate:t,plan:r}})),window.dispatchEvent(new CustomEvent(`maarif_plan_mutated`,{detail:{id:e,oldDate:i,newDate:t,plan:r,type:`date_change`}}))),r}function f(t,n){return a().filter(r=>r.ageGroup===n&&e[r.date.slice(5,7)]===t)}function p(t){return e[t.slice(5,7)]}function m(e,t={}){let n=e.toLowerCase().trim(),r=e.trim(),i=t.ageGroup||`60-72`,a=t.topic||t.planTitle||x(e);return h(n)?S():g(n)?C(n):_(n)?w(n,i):v(n)?T(n,a,i):y(n)?E(n,a,i):n.includes(`yağmur`)||n.includes(`bahçe`)&&(n.includes(`çıkam`)||n.includes(`kapalı`))?O(a,i):n.includes(`malzeme`)&&(n.includes(`yok`)||n.includes(`atık`)||n.includes(`sıfır`)||n.includes(`bitti`))?A(a,i):n.includes(`barış masası`)||n.includes(`paylaşmıyor`)||n.includes(`oyuncak kavgası`)?k():n.includes(`veli`)||n.includes(`whatsapp`)||n.includes(`bülten`)||n.includes(`veli mesaj`)?j(a,i,t):n.includes(`anekdot`)||n.includes(`ek-2`)||n.includes(`ek 2`)||n.includes(`gözlem tutana`)?M(a,i):n.includes(`karne`)||n.includes(`gelişim rapor`)||n.includes(`dönem sonu görüş`)?N(a):n.includes(`bep`)||n.includes(`özel gereksinim`)||n.includes(`farklılaştır`)||n.includes(`üstün yetenek`)?P(a,i):n.includes(`araştırma sorusu`)||n.includes(`merak sorusu`)||n.includes(`soru`)&&n.includes(`öner`)?F(a,i):b(n)?I(a,i,e,t):D(r,a,i)}function h(e){return/^(merhaba|selam|günaydın|iyi günler|iyi akşamlar|kolay gelsin|nasılsın|sen kimsin|kimsin sen|adın ne|tanıt|ne yapabilirsin|halis|marif)/i.test(e)}function g(e){return e.includes(`nasıl kullanılır`)||e.includes(`nasıl yapılır`)||e.includes(`öğrenci nasıl`)||e.includes(`plan nasıl`)||e.includes(`çıktı nasıl`)||e.includes(`excel nasıl`)||e.includes(`nereye kaydediliyor`)||e.includes(`maarifos nedir`)||e.includes(`uygulama hakkında`)||e.includes(`yoklama nasıl`)}function _(e){return e.includes(`ağlıyor`)||e.includes(`ağlayan`)||e.includes(`yemek yemiyor`)||e.includes(`iştah`)||e.includes(`beslenme zor`)||e.includes(`vuruyor`)||e.includes(`ısırıyor`)||e.includes(`öfke`)||e.includes(`saldırgan`)||e.includes(`paylaşmıyor`)||e.includes(`içine kapanık`)||e.includes(`konuşmuyor`)||e.includes(`çekingen`)||e.includes(`tuvalet`)||e.includes(`altını ıslat`)||e.includes(`uyumak istemiyor`)||e.includes(`annemi istiyorum`)||e.includes(`ayrılık kaygısı`)||e.includes(`söz dinlemiyor`)||e.includes(`inatlaşıyor`)}function v(e){return e.includes(`hikaye`)||e.includes(`masal`)||e.includes(`tekerleme`)||e.includes(`parmak oyunu`)||e.includes(`şarkı`)||e.includes(`şiir`)||e.includes(`canlandırma`)||e.includes(`drama`)}function y(e){return e.includes(`oyun`)||e.includes(`etkinlik öner`)||e.includes(`ne oynatabilirim`)||e.includes(`atölye`)||e.includes(`deney öner`)||e.includes(`fen deneyi`)||e.includes(`matematik oyunu`)}function b(e){return e.includes(`günlük plan`)||e.includes(`ders planı`)||e.includes(`ek-6`)||e.includes(`ek 6`)||e.includes(`plan hazırla`)||e.includes(`plan çıkar`)||e.includes(`plan oluştur`)||e.includes(`günün planı`)}function x(e){let t=e.replace(/(merhaba|selam|bana|için|hakkında|bir|plan|etkinlik|hazırla|öner|ver|nasıl|yapabilirim|lütfen|istiyorum|ne|yapmalıyım|yardım)/gi,``).trim();return t.length>=3&&t.length<=35?t.charAt(0).toUpperCase()+t.slice(1):`Keşif ve Yaşam`}function S(){return{markdown:`### 👋 Merhaba Değerli Öğretmenim!
Ben **MaarifOS Pedagojik Destek Asistanı**. T.C. Millî Eğitim Bakanlığı **Türkiye Yüzyılı Maarif Modeli (TYMM 2026)** Okul Öncesi Millî Müfredatı ile eğitilmiş özerk sınıf yardımcınızım.

#### 🎯 Neler Yapabilirim?
- **Sınıf Yönetimi & Kriz Çözümü:** Ağlayan çocuk, yemek reddi, akran kavgası, ayrılık kaygısı için somut çözümler.
- **Yaratıcı İçerik:** İstediğiniz her konuda orijinal masal, hikaye, tekerleme ve parmak oyunları.
- **Oyun & Atölye:** Yaş gruplarına (36-48, 48-60, 60-72 Ay) göre fen, matematik ve ritim oyunları.
- **Resmî MEB Formları:** EK-6 Günlük Plan, EK-2 Anekdot, Veli WhatsApp Bülteni ve Dönem Sonu Karne Cümleleri.
- **Eller Serbest:** Sınıfta çocuklarla ilgilenirken mikrofon simgesine (🎙️) basıp Türkçe konuşarak soru sorabilirsiniz.

> 💡 *Bana doğrudan bir soru yöneltebilirsiniz. Örneğin: **"Ağlayan çocuğu nasıl sakinleştiririm?"** veya **"Uzay temalı bir tekerleme yaz"**.*`,suggestedAction:`copy`,category:`chat`}}function C(e){let t=``;return t=e.includes(`plan`)?`#### 🪄 Günlük & Aylık Plan Nasıl Yapılır?
1. **Resmî Günlük Planlayıcı (Sekme 1):** Ekranın solundaki 1. sekmeye girin. Konuyu girin; çiplere (Kavramlar, Materyaller, Rutinler) tek tek dokunun, klavye kullanmadan resmî EK-6 planınız saniyeler içinde oluşur.
2. **528 MEB Kitap Havuzu (Sekme 2):** MEB'in 9 resmî ders kitabından 528 gerçek etkinliği inceleyebilir, "Planlayıcıya Aktar" butonuyla anında plana dönüştürebilirsiniz.
3. **Aylık Plana Otomatik Aktarma (Sekme 4):** Ay sonu geldiğinde Aylık Plan ekranında **"✨ Günlük Planlardan Doldur"** butonuna basın; ay içindeki tüm günlük etkinlikleriniz tek tıkla EK-5 matrisine işlenir.`:e.includes(`öğrenci`)||e.includes(`yoklama`)?`#### 👥 Öğrenci ve Yoklama Yönetimi:
- **Hızlı Dokunmatik Yoklama:** Ana ekranda her öğrencinin yanındaki **[✓ Var 🟢]**, **[✗ Yok 🔴]**, **[⏱ Geç 🟡]** butonlarına dokunarak 20 öğrenci için 20 saniyede yoklama alabilirsiniz.
- **Aylık Matris Excel (.xlsx):** Yoklama ekranındaki butona dokunarak MEB standartlarında \`SUBTOTAL(109)\` formüllü resmî aylık devam çizelgesini indirebilirsiniz.`:`#### 📱 MaarifOS Temel Navigasyon Rehberi:
- **Sekme 1:** Adım Adım Resmî Günlük Planlayıcı (EK-6)
- **Sekme 2:** MEB 528 Çekirdek Kitap Etkinliği Kataloğu
- **Sekme 3:** Kayıtlı Günlük Planlarım Arşivi
- **Sekme 4:** EK-5 Aylık Eğitim Planı & Otomatik Senkron
- **Sekme 5:** EK-15 Yıllık Bütüncül Kontrol Çizelgesi
- **Sekme 6:** Meyve Günü & Görev Çizelgesi (İş günlerine adil paylaştırır)
- **Sekme 7:** MEB Resmî Müfredat & Beceri Dağılım Portalı
- **Sekme 8:** Yapay Zekâ Pedagojik Destek (Şu an buradasınız!)`,{markdown:`### 🧭 MaarifOS Kullanım & Gezinme Kılavuzu
${t}

> 🖨️ **Çıktı Alma:** Tüm plan ve evraklarda **[🖨️ A4 Yazdır]** butonuna bastığınızda ekran gereksiz menülerden arınarak birebir resmî A4 kağıt formuna bükülür.`,suggestedAction:`copy`,category:`help`}}function w(e,t){return e.includes(`ağl`)||e.includes(`ayrılık`)||e.includes(`annemi`)?{markdown:`### 🧸 Okula Uyum & Ağlayan Çocuğu Sakinleştirme Rehberi
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

> 📚 **TYMM Referansı:** SDB1.1 Kendini Tanıma ve Duygularını Düzenleme Becerisi.`,suggestedAction:`copy`,category:`behavior`}:e.includes(`yemek`)||e.includes(`iştah`)||e.includes(`beslenme`)?{markdown:`### 🥦 Yemek Yemeyen / Beslenmeyi Reddeden Çocuk İçin Çözüm
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

> 🍎 **TYMM Rutin 3:** Beslenme ve Öz Bakım Rutini — D16 Sorumluluk ve Sağlık Bilinci.`,suggestedAction:`copy`,category:`behavior`}:e.includes(`vur`)||e.includes(`ısır`)||e.includes(`öfke`)||e.includes(`saldır`)?{markdown:`### 🛑 Vurma, Isırma ve Öfke Patlaması Müdahale Protokolü
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

> 🤝 **TYMM Referansı:** SDB1.2 Dürtü Kontrolü ve Barışçıl Çözüm Becerisi.`,suggestedAction:`copy`,category:`behavior`}:e.includes(`konuşmuyor`)||e.includes(`çekingen`)||e.includes(`içine kapanık`)?{markdown:`### 🌸 Çekingen ve Konuşmayan Çocuk İçin Güven Köprüsü
**Pedagojik Yaklaşım:** Seçici suskunluk (selektif mutizm) veya çekingenlik bir inatlaşma değil, sosyal kaygıdır. Çocuğu herkesin içinde konuşmaya zorlamak içe kapanmayı derinleştirir.

#### 🎨 Uygulama Adımları:
1. **Kukla ve Nesneler Üzerinden İletişim:**
   - Çocuğa doğrudan soru sormak yerine el kuklasıyla yaklaşın: *"Tavşan Çiko bugün biraz uykulu, senin boya kalemini merak etti."* Çocuklar kuklalara yetişkinlerden çok daha hızlı açılır.
2. **Sözsüz İfade Kanalları (Piktogram & Başparmak):**
   - Çemberde konuşmak istemiyorsa başparmağıyla (👍/👎) veya duygu kartıyla oy kullanmasına izin verin.
3. **Küçük İkili Gruplar (Buddy Sistemi):**
   - 20 kişilik sınıfta değil, 1 adet yumuşak huylu akranıyla birlikte blok veya kum havuzunda eşleştirin.

> 🌟 **TYMM Referansı:** SDB2.1 Akran İletişimi ve Ait Olma Hissi.`,suggestedAction:`copy`,category:`behavior`}:{markdown:`### 💧 Sınıfta Tuvalet Kazası / Alt Islatma Yaklaşımı
**Mahremiyet Kuralı:** Çocuk asla sınıfın ortasında utandırılmamalı, ses tonuyla bile suçluluk hissettirilmemelidir.

#### 🧼 Yapılması Gerekenler:
1. **Sakin ve Sıradan Karşılama:**
   - *"Olabilir böyle şeyler, bedenimiz bazen oyuna dalınca sinyali geç verebilir. Gel temiz çamaşırlarımızı giyelim."*
2. **Göz Teması ve Mahremiyet:**
   - Diğer çocukların dikkatini başka yöne çekin; çocuğu sessizce tuvalete götürüp temizlenmesine nazikçe yardımcı olun.
3. **Rutin Hatırlatması:**
   - Günde 3 sabit tuvalet geçiş rutini (Etkinlik öncesi, yemek sonrası, bahçe dönüşü) uygulayın.`,suggestedAction:`copy`,category:`behavior`}}function T(e,t,n){return e.includes(`tekerleme`)?{markdown:`### 🎵 "${t}" Temalı Eğlenceli Okul Öncesi Tekerlemesi
**Hedef Yaş:** ${n} Ay | **Kazanım:** TADB.1 Ses Farkındalığı & Artikülasyon

\`\`\`text
Pıt pıt pıtır pıt,
${t} geldi kapıyı tık tık tık!
Açtım baktım kim var orada?
Bir minik tavşan zıplar kırda.

Kulakları dik, burnu minik,
Sepetinde elma, cepleri delik!
Bir, iki, üç, dört, beş,
${t} ile olduk biz kardeş!
Şimdi herkes yerine otursun,
Sınıfımıza neşe dolsun!
\`\`\`

> 💡 **Uygulama İpucu:** Tekerlemeyi önce hızlı, sonra yavaş, sonra da fısıltı sesiyle söyleyerek çocukların işitsel dikkatini pekiştirin.`,suggestedAction:`copy`,category:`creative`}:e.includes(`parmak`)?{markdown:`### 🖐️ "${t}" Parmak Oyunu (El & Beden Hareketli)
**Hedef Yaş:** ${n} Ay | **Kazanım:** HAB.1 Küçük Kas Becerileri & Koordinasyon

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

Biri kocaman bir ${t} olmuş,
(Bir el iyice açılır ve sallanır)
Diğeri rüzgarla dans eden yaprak olmuş!
(Diğer el sağa sola dalgalandırılır)

Rüzgar esmiş: Vuufff!
(Kuvvetlice üflenir)
Çiçekler birbirine sarılmış!
(İki el göğüste birbirine kenetlenir)
\`\`\`

> 🌟 **Geçiş Ritüeli:** Parmak oyununun sonundaki sarılma hareketi ile sınıfta anında sessizlik ve odak sağlanır.`,suggestedAction:`copy`,category:`creative`}:{markdown:`### 📖 "${t}" Temalı Özgün Masal: "Meraklı Çakıl'ın Keşfi"
**Hedef Yaş:** ${n} Ay | **Süre:** 6-8 Dakika | **Değer:** Merak (E1.1) ve İş Birliği (D5)

Bir varmış, bir yokmuş... Gökyüzünün masmavi, derelerin şıkır şıkır aktığı kocaman bir ormanda, Meraklı Çakıl adında sevimli bir sincap yaşarmış. Çakıl her sabah erkenden uyanır, meşe ağacının tepesine çıkar ve etrafı koklarmış.

Bir gün yerde daha önce hiç görmediği pırıl pırıl parlayan bir **${t}** görmüş! 

Çakıl hemen büyütecini almış, yanına yaklaşmış. Dokunmuş: *"Burası pürüzlü, ama burası çok yumuşak!"* demiş. Tam o sırada ormanın bilge kaplumbağası Tontiş çıkagelmiş:
— *"Merhaba Çakıl, ne inceliyorsun öyle?"*
Çakıl heyecanla yanıt vermiş:
— *"Tontiş bak! Bu ${t} çok özel bir şeye benziyor. Gel birlikte araştıralım!"*

İki arkadaş ${t} etrafında daire çizmişler. Renklerini saymışlar: Sarı, yeşil ve biraz da mavi! Birlikte bir şarkı uydurmuşlar:
*"Küçük büyük fark etmez, merak eden pes etmez!"*
O günden sonra ormandaki bütün hayvanlar bir araya gelip kendi ${t} merkezlerini kurmuşlar ve her gün yeni bir şey öğrenmişler.

---
#### 💬 Hikaye Sonrası Sohbet Soruları:
1. Çakıl ${t} ile ilk karşılaştığında nasıl hissetti?
2. Sence Çakıl ve Tontiş birlikte çalışmasaydı ne olurdu?
3. Sınıfımızda ${t} gibi merak ettiğin ne var?`,suggestedAction:`copy`,category:`creative`}}function E(e,t,n){let r=e.includes(`matematik`)||e.includes(`sayı`),i=e.includes(`fen`)||e.includes(`deney`);return r?{markdown:`### 🎲 Matematik Oyunu: "Sayı Dedektifleri ve Renkli Halkalar"
**Hedef Yaş:** ${n} Ay | **Kazanım:** MAB.2 Sayma ve Miktar Algısı

**Malzemeler:**
- 5 adet renkli plastik tabak (üzerlerine 1'den 5'e kadar büyük rakamlar yazılı)
- 15 adet çam kozalağı veya renkli düğme
- 1 adet zar

**Nasıl Oynanır?**
1. Sınıf zeminine 1'den 5'e kadar tabaklar dizilir.
2. Çocuk zarı atar. Gelen sayı kadar nesneyi (örneğin 3 kozalak) masadan iki eliyle alır.
3. Üzerinde "3" yazan tabağı bulur ve kozalakları sayarak tabağın içine bırakır: *"Bir, iki, üç!"*
4. **Oyunlaştırma:** Doğru eşleştiren çocuk "Sayı Dedektifi Rozeti" kazanır ve arkadaşına el verir.`,suggestedAction:`copy`,category:`game`}:i?{markdown:`### 🔬 Fen & Keşif Deneyi: "Yüzen ve Batan Gizemli Nesneler"
**Hedef Yaş:** ${n} Ay | **Kazanım:** FAB.2 Tahmin Yürütme ve Gözlem Yapma

**Malzemeler:**
- Şeffaf geniş su leğeni
- Kuru yaprak, taş, ahşap blok, madeni para, elma dilimi, plastik kapak
- Tahmin ve Sonuç Panosu (Yüzer 🚢 / Batar ⚓)

**Uygulama Süreci:**
1. **Hipotez (Tahmin):** Çocuk taş parçasını eline alır: *"Sence bunu suya bıraktığımızda ne olacak, yüzer mi batar mı?"*
2. **Deneyimleme:** Nesne suya bırakılır, suyun hareketi incelenir.
3. **Kavramlaştırma:** *"Ağır ve yoğun olanlar batar, içinde hava olan hafifler suyun üstünde kalır."*
4. **Kayıt:** Çocuklar gözlem panosuna gülen yüz etiketi yapıştırır.`,suggestedAction:`copy`,category:`game`}:{markdown:`### 🏃‍♂️ Hareketli Grup Oyunu: "Rüzgar ve Ağaçlar"
**Hedef Yaş:** ${n} Ay | **Kazanım:** HAB.1 Denge, Koordinasyon ve Yönerge Takibi

**Oyun Kurgusu:**
- Çocuklar sınıfta serbestçe birer "ağaç" olurlar; kollarını dal gibi açarlar.
- Öğretmen tefle hafif vurduğunda *"Tatlı bir ilkbahar rüzgarı esiyor"* denir; çocuklar yavaşça sallanır.
- Tef hızlı vurulduğunda *"Fırtına çıktı!"* denir; çocuklar ayaklarını basmadan yerinde döner.
- Ritim durup öğretmen *"Kökler toprağa tutundu!"* dediğinde herkes tek ayak üzerinde dengede heykel olur.`,suggestedAction:`copy`,category:`game`}}function D(e,t,n){return{markdown:`### 💡 Pedagojik Danışmanlık & Çözüm Masası
**Soru:** *"${e}"*
**Gelişim Dönemi:** ${n} Ay | **Çerçeve:** TYMM 2026 Bütüncül Çocuk Gelişimi

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

> 📌 **TYMM Eğilim Kodu:** E1.1 Merak ve E2.4 İş Birliğine Açıklık.`,suggestedAction:`copy`,category:`general`}}function O(e,t){return{markdown:`### 🌧️ Acil Kurtarıcı: Yağmurlu Gün & Sınıf İçi Enerji Boşaltma
**Hedef Yaş:** ${t} Ay | **Süre:** 15-20 Dakika | **Ortam:** Sınıf İçi Açık Alan

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

> 💡 **Pedagojik Not:** Ani hareket-durdurma oyunları prefrontal korteksi uyararak öz düzenleme ve inhibitör kontrol (dürtü denetimi) becerisini pekiştirir.`,suggestedAction:`copy`,category:`emergency`}}function k(){return{markdown:`### 🕊️ Barış Masası & Oyuncak Paylaşamama Çözüm Protokolü
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

> 🤝 **Ritüel Kapanışı:** İki çocuk el sıkışır ya da "Barış Çakı" yapar. Öğretmen süreci kolaylaştırır, hüküm vermez.`,suggestedAction:`copy`,category:`emergency`}}function A(e,t){return{markdown:`### ♻️ Sıfır Bütçe & Doğal Atık Etkinlik Reçetesi
**Tema:** ${e} | **Kullanılan:** Kağıt Ruloları, Kuru Yapraklar, İpler, Plastik Kapaklar

#### 🧪 "Doğa Dedektifleri ve Rulo Dürbünler"
**Kazanımlar:** FAB.1 Gözlem Yapma, SNAB.1 Özgün Ürün Geliştirme, OB8 Sürdürülebilirlik

**Uygulama Adımları:**
1. **Dürbün Yapımı:** 2 adet tuvalet kağıdı rulosu birbirine pamuk ipliği veya kağıt bantla bağlanır. Çocuklar üzerini kuru yapraklar ve pastel boyayla kamufle eder.
2. **Sınıf Safari Turu:** Sınıf içinde veya koridorda "Renk ve Doku Keşif Yolu" oluşturulur. Çocuklar dürbünleriyle odaklanarak sınıftaki "pürüzlü", "soğuk", "yuvarlak" nesneleri avlar.
3. **Kapak Matematik Terazisi:** Biriktirilen su kapakları sınıfın ortasına dökülür; kaşıklarla kapak toplama ve renklerine göre gruplama yarışı yapılır.

> 🍃 **TYMM Notu:** Sıfır atık yaklaşımı çocukta tüketim çılgınlığı yerine üretici ve çevreci eğilim (E3.8) geliştirir.`,suggestedAction:`copy`,category:`emergency`}}function j(e,t,n){return{markdown:`### 📱 Tek Tıkla Hazır Veli WhatsApp Bülteni
Aşağıdaki metin MEB okul öncesi veli iletişim standartlarına uygun samimi pedagojik dille derlenmiştir:

\`\`\`text
${`Sevgili Velilerimiz, Merhaba! 🌿

${new Date().toLocaleDateString(`tr-TR`,{day:`numeric`,month:`long`})} haftasında miniklerimizle birlikte "${e}" temalı harika bir keşif yolculuğuna çıktık. 🚀

Bu hafta sınıfta:
• "${e}" konusunu inceledik ve merak sorularımızın peşine düştük. 🔍
• Öğrenme merkezlerimizde grup oyunları ve yaratıcı sanat çalışmaları yaptık. 🎨
• Akranlarımızla paylaşma, sıra bekleme ve nezaket değerlerimizi pekiştirdik. 🤝

🏡 Evde Neler Yapabilirsiniz? (10 Dakikalık Aile Önerisi):
Bu akşam çocuğunuzla evinizdeki nesneler üzerine kısa bir sohbet edebilir; birlikte küçük bir gözlem oyunu oynayabilirsiniz. Onun meraklı sorularına "Sen ne düşünüyorsun?" diyerek düşünme alanını genişletebilirsiniz.

📌 Hatırlatma: Meyve Günü etkinliğimiz için çocuklarımızın çantasına sevdikleri bir meyveyi dilimlenmiş olarak koymayı unutmayınız. 🍎🍐

Sevgi dolu ve verimli bir hafta dileriz! ✨
— Okul Öncesi Zümresi`}
\`\`\`

> 💡 *Aşağıdaki **"WhatsApp'a Gönder"** butonuna basarak metni doğrudan veli grubunuza aktarabilirsiniz.*`,suggestedAction:`whatsapp`,category:`family`}}function M(e,t){return{markdown:`### 📝 Resmî EK-2 Anekdot Kayıt Formu Taslağı
**MEB TTKB Okul Öncesi Programı Sayfa 178 Standardı**

| Alan | Bilgi |
|---|---|
| **Gözlem Tarihi** | ${new Date().toISOString().slice(0,10)} |
| **Gözlenen Ortam** | Blok ve İnşa Merkezi / Sınıf İçi Serbest Oyun |
| **Gözlenen Çocuk** | Örnek Öğrenci (${t} Ay) |
| **Gözlemci Öğretmen** | Sınıf Öğretmeni |

#### 👁️ Gözlenen Olay / Durum (Objektif ve Yorumsuz):
> *"Çocuk blok merkezinde tahta prizmaları üst üste koyarak 8 katlı bir kule inşa etti. Kule sallanmaya başladığında yanındaki akranına baktı ve 'Altına geniş bloğu koyarsak yıkılmaz' diyerek tabanı genişletti. Kule tamamlandığında ellerini çırparak 'Mühendis kulesi oldu!' dedi ve arkadaşını kuleye ekleme yapması için davet etti."*

#### 🎯 Gözlenen Beceri ve Süreç Bileşenleri:
- **MAB.1:** Geometrik şekilleri denge ve boyut ilişkisine göre kullanabilme.
- **SDB2.1:** Akranıyla iş birliği yapma ve ortak oyun kurgulama.
- **E1.1 (Merak & Keşif):** Problemle karşılaştığında alternatif çözüm deneme.

#### 💡 Öğretmen Yorumu & Pedagojik Öneri:
Çocuğun uzamsal algısı ve problem çözme becerisi yaş düzeyine uygundur. Fen ve matematik merkezinde rampa deneyleri sunularak merakı desteklenecektir.`,suggestedAction:`copy`,category:`anecdote`}}function N(e){return{markdown:`### 🎓 Dönem Sonu Resmî Gelişim Raporu (Karne) Pedagojik Görüş Bankası
**MEB Yönetmeliğine Uygun, Güçlü Yönleri Vurgulayan Cümleler:**

#### 🌟 1. Sosyal-Duygusal Gelişim & Erdemler
- *"Sınıf içi kurallara ve arkadaş haklarına gösterdiği derin saygı, onu sınıfımızın sevilen bir barış elçisi yapmaktadır. Grup oyunlarında üstlendiği adil roller takdire şayandır."*
- *"Duygularını sözel olarak net bir biçimde ifade edebilmekte, problem durumlarında uzlaşmacı ve yapıcı yaklaşımlar sergileyerek olgunluk göstermektedir."*

#### 🧩 2. Bilişsel & Dil Becerileri
- *"Merak duygusu ve olaylar arasındaki neden-sonuç bağlarını keşfetme isteği çok yüksektir. Günlük sohbette kullandığı zengin sözcük dağarcığı ve analitik soruları dikkat çekmektedir."*
- *"Öğrenme merkezlerinde başladığı projeleri büyük bir sabır ve azimle sonuca ulaştırmakta; yeni kavramları hızla içselleştirmektedir."*

#### 🎨 3. Motor & Sanat Gelişimi
- *"Küçük kas koordinasyonu gerektiren makas, boya ve montaj çalışmalarında oldukça titiz ve özgün ürünler ortaya koymaktadır."*`,suggestedAction:`copy`,category:`general`}}function P(e,t){return{markdown:`### 🎯 Bireyselleştirilmiş Farklılaştırma (BEP & Zenginleştirme)
**Tema:** ${e} | **Kapsam:** MEB TTKB s. 105-108 Farklılaştırma Esasları

#### 🟢 Destekleme Stratejileri (Özel Gereksinimli / Odaklanma Güçlüğü Olan Çocuklar):
1. **Somut Piktogram Kartları:** Sözlü yönergeler 3 adımı geçmeyecek şekilde resimli kartlarla görselleştirilir.
2. **Dokunsal Materyal Eşliği:** Dokunma, koklama ve hissetme duyuları devreye sokulur.
3. **Akran Eşleşmesi (Buddy):** İletişimi güçlü bir sınıf arkadaşı ile çalışma ortağı yapılır.

#### 🟣 Zenginleştirme Stratejileri (İleri Düzey / Üstün Yetenekli Çocuklar):
1. **Çok Değişkenli Problem Durumu:** *"Peki bu kuleyi sadece üçgen bloklarla yapsaydık nasıl dengede tutabilirdik?"* gibi hipotez soruları yöneltilir.
2. **Merkez Kolaylaştırıcılığı:** Malzeme yöneticisi rolü verilerek sorumluluk duygusu desteklenir.`,suggestedAction:`copy`,category:`differentiation`}}function F(e,t){return{markdown:`### 🔍 Merak ve Keşif Uyandıran 5 Açık Uçlu Araştırma Sorusu
**Tema:** "${e}" | **Yaş:** ${t} Ay (TYMM E1.1 Merak Eğilimi)

1. *"Sence ${e} olmasaydı dünyamız ve günlük hayatımız nasıl görünürdü?"*
2. *"${e} ile ilgili gördüğün bir şeyi bir renge benzetseydin bu ne olurdu, neden?"*
3. *"Eğer bir büyüteçle çok yakından baksaydık, daha önce kimsenin fark etmediği neyi görebilirdik?"*
4. *"Bunu evdeki malzemelerle yeniden yapmak isteseydin ilk olarak nereden başlardın?"*
5. *"Bu konuda aklına gelen en şaşırtıcı soru nedir?"*`,suggestedAction:`copy`,category:`general`}}function I(e,t,n,r){let i=new Date().toISOString().slice(0,10),a=r.researchQuestion||`"${e}" çevremizi nasıl güzelleştirir ve onu keşfederken neler öğrenebiliriz?`,o=s({date:i,ageGroup:t,topic:e,schoolName:`Atatürk Anaokulu`,teacherName:`Okul Öncesi Öğretmeni`});return o.topic=e,o.activityName=`${e} Keşif Atölyesi`,o.researchQuestion=a,o.domainCodes=[`TADB.1`,`MAB.1`,`FAB.1`,`SNAB.1`],o.processCodes=[`TADB.1.a`,`MAB.1.a`,`FAB.1.b`],o.tendencyCodes=[`E1.1`,`E2.4`,`E3.2`],o.sdbCodes=[`SDB1.1`,`SDB2.1`],o.valueCodes=[`D14.Saygı`,`D16.Sorumluluk`,`D12.Sevgi`],o.conceptLabels=r.concepts&&r.concepts.length?r.concepts:[`Büyük - Küçük`,`Aynı - Farklı`],o.materialLabels=r.materials&&r.materials.length?r.materials:[`Doğal ahşap bloklar`,`Büyüteçler`,`Fon kartonu`],o.learningEnvLabels=[`Blok Merkezi`,`Sanat Merkezi`,`Fen Merkezi`],o.selectedCenters=[`blok`,`sanat`,`fen`],o.activityTypes=[`butunlesik_2`,`turkce`,`sanat`],o.groupTypes=[`buyuk_grup`,`kucuk_grup`],o.spatialTypes=[`sinif_ici`,`acik_hava_etk`],o.pedagogicalMethods=[`oyun_temelli`,`sorgulama`],o.activityProcessNote=`Güne merak sorusu ile başlandı. Çocuklarla ${e} hakkında sohbet edildi ve ilgili merkezlerde deneyimleme sağlandı.`,o.selectedEvalQuestions=[`Bugün ${e} ile ilgili en çok neyi keşfetmek hoşuna gitti?`,`Etkinlik sırasında bir arkadaşına nasıl yardım ettin?`],{markdown:`### 🪄 Tam Teşekküllü EK-6 Günlük Plan Taslağı
**Günün Teması:** ${e} | **Yaş Grubu:** ${t} Ay | **Tarih:** ${i}
**Araştırma Sorusu:** *"${a}"*

---

#### 1. Alan Becerileri ve Değerler
- **Türkçe & Fen:** TADB.1 Dinleme & Konuşma, FAB.1 Doğal Olayları Gözlemleme
- **Matematik & Sanat:** MAB.1 Sınıflandırma, SNAB.1 Özgün Tasarım
- **Değerler & Eğilimler:** D14 Saygı, D16 Sorumluluk · E1.1 Merak, E2.4 İş Birliği

#### 2. İçerik ve Öğrenme Merkezleri
- **Kavramlar:** ${o.conceptLabels.join(`, `)}
- **Materyaller:** ${o.materialLabels.join(`, `)}
- **Açılan Merkezler:** 🧱 Blok Merkezi, 🎨 Sanat Merkezi, 🔬 Fen & Doğa Merkezi

#### 3. Öğrenme-Öğretme Süreci:
1. **Güne Başlama Rutini (08:30–09:00):** Karşılama çemberi ve günün araştırma sorusu.
2. **Merkezlerde Oyun (09:00–10:00):** İlgili merkezlerde bağımsız keşif.
3. **Bütünleştirilmiş Etkinlik (10:30–11:30):** Hikaye, oyun ve özgün sanat çalışması.
4. **Günü Değerlendirme Çemberi (14:30–15:00):** Günün yansıtılması ve kapanış.

---

> 🚀 **1-Tıkla Entegrasyon:** Bu planı doğrudan sisteminize kaydetmek için aşağıdaki **"🪄 Günlük Plana Aktar"** butonuna basınız.`,generatedPlan:o,suggestedAction:`inject_plan`,category:`plan`}}var L={DEEPSEEK:`maarif_deepseek_key`,GEMINI:`maarif_gemini_key`,ACTIVE_PROVIDER:`maarif_active_provider`},R=`sk-f6277f4fda164ed99b246ddbab1ac15c`,z=`Sen T.C. Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli (TYMM) Okul Öncesi Müfredatı konusunda uzmanlaşmış en kıdemli baş danışman ve pedagoji yapay zekasısın.

TEMEL GÖREVİN:
Okul öncesi öğretmenlerine sınıf yönetimi, davranış krizleri (ağlama, ısırma, yemek reddi), EK-6 Günlük Plan, etkinlik kurgusu, masal, tekerleme, veli bültenleri ve BEP farklılaştırma konularında anında uygulanabilir, sıcak, şefkatli ama mevzuata tam uyumlu profesyonel çözümler sunmaktır.

YANIT KURALLARI:
1. Türkçe dil bilgisi ve pedagojik terimler kusursuz olmalıdır.
2. Gereksiz dolgu ve laf kalabalığı yapma; doğrudan öğretmenin sınıfta o an uygulayabileceği somut adımları ver.
3. Çocuğu suçlayıcı, etiketleyici dilden kesinlikle kaçın; gelişimsel ve olumlu disiplin yaklaşımını benimse.
4. Günlük plan istenirse MEB 2026 EK-6 formatına (Künye, Alan Becerileri, Kavramlar, Materyaller, Akış, Farklılaştırma, Değerlendirme) tam uyumlu üret.`,B=class{static getStoredKeys(){if(typeof window>`u`)return{deepseekKey:R};let e=localStorage.getItem(L.DEEPSEEK);return{deepseekKey:e!==null&&e.trim()!==``?e.trim():R,geminiKey:localStorage.getItem(L.GEMINI)||``}}static saveKey(e,t){if(typeof window>`u`)return;let n=t.trim();e===`deepseek`?localStorage.setItem(L.DEEPSEEK,n):e===`gemini`&&localStorage.setItem(L.GEMINI,n)}static getActiveProvider(){if(typeof window>`u`)return`deepseek`;let e=this.getStoredKeys(),t=localStorage.getItem(L.ACTIVE_PROVIDER);return t===`gemini`&&e.geminiKey?`gemini`:t===`local`?`local`:t===`deepseek`&&e.deepseekKey||e.deepseekKey?`deepseek`:e.geminiKey?`gemini`:`deepseek`}static setActiveProvider(e){typeof window>`u`||localStorage.setItem(L.ACTIVE_PROVIDER,e)}static sanitizePrompt(e){return e.replace(/(\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\b)\s+(adlı|isimli|öğrencim|çocuğum)/g,`Öğrenci $2`).replace(/\b\d{11}\b/g,`***********`).replace(/\b(05\d{2}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2})\b/g,`05** *** ** **`)}static async streamResponse(e){let t=this.getStoredKeys(),n=e.provider;if(n===`deepseek`&&t.deepseekKey)try{await this.executeDeepSeekStream(t.deepseekKey,e);return}catch(e){console.warn(`[SecureAIClient] DeepSeek akış hatası, yerel motora düşülüyor:`,e)}if(n===`gemini`&&t.geminiKey)try{await this.executeGeminiStream(t.geminiKey,e);return}catch(e){console.warn(`[SecureAIClient] Gemini akış hatası, yerel motora düşülüyor:`,e)}try{let t=m(e.prompt,e.context?{topic:e.context}:{}).markdown;e.onChunk(t),e.onDone(t)}catch(t){e.onError(t)}}static async executeDeepSeekStream(e,t){let n=this.sanitizePrompt(t.prompt),r=[{role:`system`,content:t.systemPrompt||z}];t.context&&r.push({role:`system`,content:`[Aktif Sınıf/Plan Bağlamı]:\n${t.context}`}),r.push({role:`user`,content:n});let i=await fetch(`https://api.deepseek.com/v1/chat/completions`,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${e.trim()}`},body:JSON.stringify({model:`deepseek-chat`,messages:r,temperature:.65,max_tokens:3e3,stream:!0})});if(!i.ok){let e=await i.text();throw Error(`DeepSeek API Hatası (${i.status}): ${e}`)}if(!i.body)throw Error(`DeepSeek yanıt akışı (body) boş döndü.`);let a=i.body.getReader(),o=new TextDecoder(`utf-8`),s=``;for(;;){let{done:e,value:n}=await a.read();if(e)break;let r=o.decode(n,{stream:!0}).split(`
`);for(let e of r){let n=e.trim();if(!n||!n.startsWith(`data: `))continue;let r=n.replace(/^data:\s*/,``);if(r===`[DONE]`){t.onDone(s);return}try{let e=JSON.parse(r).choices?.[0]?.delta?.content||``;e&&(s+=e,t.onChunk(e))}catch{}}}t.onDone(s)}static async executeGeminiStream(e,t){let n=this.sanitizePrompt(t.prompt),r=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${encodeURIComponent(e.trim())}&alt=sse`,i=[{role:`user`,parts:[{text:`${t.systemPrompt||z}\n\n${t.context?`[Bağlam]: ${t.context}\n\n`:``}[Soru]: ${n}`}]}],a=await fetch(r,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:i,generationConfig:{temperature:.65,maxOutputTokens:3e3}})});if(!a.ok){let e=await a.text();throw Error(`Gemini API Hatası (${a.status}): ${e}`)}if(!a.body)throw Error(`Gemini akış gövdesi boş döndü.`);let o=a.body.getReader(),s=new TextDecoder(`utf-8`),c=``;for(;;){let{done:e,value:n}=await o.read();if(e)break;let r=s.decode(n,{stream:!0}).split(`
`);for(let e of r){let n=e.trim();if(!n||!n.startsWith(`data: `))continue;let r=n.replace(/^data:\s*/,``);try{let e=JSON.parse(r).candidates?.[0]?.content?.parts?.[0]?.text||``;e&&(c+=e,t.onChunk(e))}catch{}}}t.onDone(c)}static async validateKey(e,t){let n=t.trim();if(!n)return{success:!1,message:`Anahtar boş olamaz.`};try{if(e===`deepseek`){let e=await fetch(`https://api.deepseek.com/v1/models`,{headers:{Authorization:`Bearer ${n}`}});return e.ok?{success:!0,message:`DeepSeek-V3 bağlantısı başarılı! (~3 TL ile 1.000 soru hazır)`}:{success:!1,message:`DeepSeek bağlantı hatası: ${e.status} (Yetkisiz veya geçersiz anahtar)`}}if(e===`gemini`){let e=await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${n}`);return e.ok?{success:!0,message:`Google Gemini 2.0 Flash bağlantısı başarılı! (Ücretsiz kota devrede)`}:{success:!1,message:`Gemini bağlantı hatası: ${e.status}`}}return{success:!1,message:`Bilinmeyen sağlayıcı.`}}catch(e){return{success:!1,message:`Bağlantı kurulamadı: ${e.message}`}}}},V=`Aşağıdaki konu ve yaş grubuna göre T.C. Millî Eğitim Bakanlığı Türkiye Yüzyılı Maarif Modeli (TYMM 2026) Okul Öncesi EK-6 Günlük Eğitim Planı formatında JSON üret.

SADECE VE SADECE GEÇERLİ BİR JSON NESNESİ DÖNDÜR. Markdown blokları (\`\`\`json ...) veya ekstra açıklama yazma.

JSON Şeması:
{
  "topic": "Günün Konusu (örn. Sonbahar ve Ritmik Sayma)",
  "researchQuestion": "Çocukların merakını uyandıran araştırma sorusu",
  "domainCodes": ["TADB.1", "MAB.2", "SNAB.1"],
  "processCodes": ["TADB.1.a", "MAB.2.b"],
  "tendencyCodes": ["E1.1 Merak", "E2.4 İş Birliğine Açıklık"],
  "sdbCodes": ["SDB1.2 Kendini Düzenleme", "SDB2.1 İletişim"],
  "valueCodes": ["D14 Saygı", "D16 Sorumluluk", "D7 Estetik"],
  "literacyCodes": ["OB1 Erken Okuryazarlık", "OB4 Görsel Okuryazarlık"],
  "conceptLabels": ["Büyük - Küçük", "Sarı - Kırmızı", "Aynı - Farklı"],
  "words": "Ritim, Yaprak, Sayma, Doğa",
  "materialLabels": ["Doğal sonbahar yaprakları", "Ritim çubukları", "Büyüteçler", "Fon kartonu"],
  "learningEnvLabels": ["Fen ve Doğa Merkezi", "Sanat Merkezi", "Blok Merkezi"],
  "selectedCenters": ["fen", "sanat", "blok"],
  "routineStartingDayId": "Güne başlama halkası kurulur, duygu panosu ve günün hava durumu incelenir.",
  "routineSnackCleanId": "Eller sabunla yıkanır, sağlıklı atıştırmalık paylaşılır ve masalar toplanır.",
  "routineTransitionId": "Yaprak hışırtısı tekerlemesi ile etkinlik merkezlerine geçilir.",
  "activityName": "Ana Etkinlik Adı",
  "activityTypes": ["matematik", "turkce", "sanat"],
  "groupTypes": ["buyuk_grup", "kucuk_grup"],
  "spatialTypes": ["sinif_ici", "acik_hava_etk"],
  "pedagogicalMethods": ["oyun_temelli", "sorgulama_kesif", "istasyon"],
  "activityProcessNote": "Etkinliğin aşama aşama sınıf içi uygulama özeti...",
  "enrichmentStrategies": ["İleri düzey örüntü kartları sunulur ve doğa günlüğü çizimi istenir."],
  "supportStrategies": ["Akran eşleştirmesi ve dokunsal yaprak rehberliği sağlanır."],
  "selectedEvalQuestions": [
    "Bugün etkinlikte seni en çok ne şaşırttı?",
    "Topladığımız yapraklar arasındaki farklar nelerdi?",
    "Arkadaşınla çalışırken hangi davranışın ona yardımcı oldu?",
    "Yarın doğada başka neleri keşfedebiliriz?"
  ],
  "familyParticipationId": "Evde sonbahar yaprağı toplama ve sayma oyunu önerisi veli bülteni olarak iletilir."
}`;async function H(e){let t=e.prompt.trim(),i=e.ageGroup||`60-72`,a=e.date||new Date().toISOString().slice(0,10),o=e.schoolName||`Atatürk Anaokulu`,c=e.teacherName||`Okul Öncesi Öğretmeni`;if(!t)throw Error(`Lütfen yapay zekanın plan oluşturması için bir konu veya tema giriniz.`);try{let e=B.getStoredKeys(),l=B.getActiveProvider();if(l!==`local`&&(e.deepseekKey||e.geminiKey||e.openaiKey)){let u=W(await U(l,`Sen MEB Türkiye Yüzyılı Maarif Modeli Okul Öncesi baş uzmanısın. Yalnızca istenen JSON nesnesini döndür.`,`${V}\n\n[ÖĞRETMENİN İSTEMİ]: ${t}\n[YAŞ GRUBU]: ${i} Ay\n[TARİH]: ${a}`,e));if(u&&u.topic){let e=s({ageGroup:i,date:a,schoolName:o,teacherName:c});return e.topic=u.topic||t,e.researchQuestion=u.researchQuestion||`${t} konusuyla ilgili neleri merak ediyoruz?`,e.activityName=u.activityName||u.topic||t,e.domainCodes=Array.isArray(u.domainCodes)?u.domainCodes:[`TADB.1`,`MAB.2`],e.processCodes=Array.isArray(u.processCodes)?u.processCodes:[`TADB.1.a`,`MAB.2.a`],e.tendencyCodes=Array.isArray(u.tendencyCodes)?u.tendencyCodes:[`E1.1 Merak`],e.sdbCodes=Array.isArray(u.sdbCodes)?u.sdbCodes:[`SDB1.2 Kendini Düzenleme`],e.valueCodes=Array.isArray(u.valueCodes)?u.valueCodes:[`D14 Saygı`,`D16 Sorumluluk`],e.literacyCodes=Array.isArray(u.literacyCodes)?u.literacyCodes:[`OB1 Erken Okuryazarlık`],e.conceptLabels=Array.isArray(u.conceptLabels)?u.conceptLabels:[`Aynı - Farklı`],e.words=u.words||t,e.materialLabels=Array.isArray(u.materialLabels)&&u.materialLabels.length>0?u.materialLabels:[`Renkli fon kartonları`,`Doğal materyaller`],e.selectedCenters=Array.isArray(u.selectedCenters)&&u.selectedCenters.length>0?u.selectedCenters:[`fen`,`sanat`,`blok`],e.learningEnvLabels=Array.isArray(u.learningEnvLabels)?u.learningEnvLabels:[`Sınıf Ortamı`],e.routineStartingDayId=u.routineStartingDayId||`Güne başlama halkası kurulur.`,e.routineSnackCleanId=u.routineSnackCleanId||`Beslenme ve temizlik rutini uygulanır.`,e.routineTransitionId=u.routineTransitionId||`Müzikli geçiş yapılır.`,e.activityTypes=Array.isArray(u.activityTypes)?u.activityTypes:[`butunlesik_2`,`turkce`],e.groupTypes=Array.isArray(u.groupTypes)?u.groupTypes:[`buyuk_grup`],e.spatialTypes=Array.isArray(u.spatialTypes)?u.spatialTypes:[`sinif_ici`],e.pedagogicalMethods=Array.isArray(u.pedagogicalMethods)?u.pedagogicalMethods:[`oyun_temelli`,`sorgulama`],e.activityProcessNote=u.activityProcessNote||`${t} temalı etkinlik çocuklarla birlikte yürütülür.`,e.enrichmentStrategies=Array.isArray(u.enrichmentStrategies)?u.enrichmentStrategies:[n[0]],e.supportStrategies=Array.isArray(u.supportStrategies)?u.supportStrategies:[r[0]],e.selectedEvalQuestions=Array.isArray(u.selectedEvalQuestions)?u.selectedEvalQuestions:[`Bugün ${t} etkinliğinde en çok ne ilgini çekti?`,`Birlikte çalışırken arkadaşına nasıl yardımcı oldun?`],e.familyParticipationId=u.familyParticipationId||`Evde konuyla ilgili sohbet edilmesi önerilir.`,e}}}catch(e){console.warn(`[ai-plan-generator] Harici API hatası, yerel akıllı sentezleyiciye geçiliyor:`,e)}return G(t,i,a,o,c)}async function U(e,t,n,r){if(e===`deepseek`&&r.deepseekKey){let e=await fetch(`https://api.deepseek.com/v1/chat/completions`,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${r.deepseekKey.trim()}`},body:JSON.stringify({model:`deepseek-chat`,messages:[{role:`system`,content:t},{role:`user`,content:n}],temperature:.3,response_format:{type:`json_object`}})});if(!e.ok)throw Error(`DeepSeek API Hatası: ${e.status}`);return(await e.json()).choices?.[0]?.message?.content||``}if(e===`gemini`&&r.geminiKey){let e=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(r.geminiKey.trim())}`,i=await fetch(e,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{role:`user`,parts:[{text:`${t}\n\n${n}`}]}],generationConfig:{responseMimeType:`application/json`,temperature:.3}})});if(!i.ok)throw Error(`Gemini API Hatası: ${i.status}`);return(await i.json()).candidates?.[0]?.content?.parts?.[0]?.text||``}throw Error(`Aktif API sağlayıcısı bulunamadı.`)}function W(e){try{let t=e.trim().replace(/^```json\s*/i,``).replace(/```$/g,``).trim();return JSON.parse(t)}catch{let t=e.match(/\{[\s\S]*\}/);if(t)try{return JSON.parse(t[0])}catch{}return null}}function G(e,t,i,a,o){let c=s({ageGroup:t,date:i,schoolName:a,teacherName:o}),l=e.charAt(0).toLocaleUpperCase(`tr-TR`)+e.slice(1);return c.topic=`${l} ve Keşif Yolculuğu`,c.activityName=`${l} Atölyesi`,c.researchQuestion=`${l} ile çevremizde neleri keşfedebiliriz?`,c.domainCodes=[`TADB.1`,`MAB.1`,`SNAB.4`],c.processCodes=[`TADB.1.a`,`MAB.1.a`,`SNAB.4.a`],c.tendencyCodes=[`E1.1 Merak`,`E2.4 İş Birliğine Açıklık`,`E3.2 Odaklanma`],c.sdbCodes=[`SDB1.2 Kendini Düzenleme`,`SDB2.1 İletişim`],c.valueCodes=[`D14 Saygı`,`D16 Sorumluluk`,`D7 Estetik`],c.literacyCodes=[`OB1 Erken Okuryazarlık`,`OB4 Görsel Okuryazarlık`],c.conceptLabels=[`Büyük - Küçük`,`Aynı - Farklı`,`Önünde - Arkasında`],c.words=`${l}, Paylaşım, Ritim, Doğa`,c.materialLabels=[`Büyük boy büyüteçler`,`Renkli fon kartonları`,`Doğal materyaller`,`Kil veya oyun hamuru`],c.selectedCenters=[`fen`,`sanat`,`blok`],c.learningEnvLabels=[`Fen ve Doğa Merkezi`,`Sanat Merkezi`,`Sınıf İçi`],c.routineStartingDayId=`Güne başlama çemberi kurulur. Duygu panosunda çocuklar o anki hislerini işaretler ve günün takvimi güncellenir.`,c.routineSnackCleanId=`Öz bakım becerileri kapsamında el yıkama ve sağlıklı beslenme rutini tamamlanır; artık materyaller toplanır.`,c.routineTransitionId=`Ritimli parmak oyunu ve nefes egzersizi eşliğinde etkinlik merkezlerine geçiş yapılır.`,c.activityTypes=[`butunlesik_2`,`turkce`,`matematik`],c.groupTypes=[`buyuk_grup`,`kucuk_grup`],c.spatialTypes=[`sinif_ici`],c.pedagogicalMethods=[`oyun_temelli`,`sorgulama_kesif`,`istasyon`],c.activityProcessNote=`Öğretmen sınıfa merak uyandırıcı bir sandık getirir. Çocuklarla '${l}' teması üzerine beyin fırtınası yapılır. Merkezlerde küçük gruplar halinde deneyimsel keşifler yürütülür ve gün sonunda ortak bir ürün sergilenir.`,c.enrichmentStrategies=[n[0]],c.supportStrategies=[r[0]],c.selectedEvalQuestions=[`Bugün ${l} etkinliğinde seni en çok ne heyecanlandırdı?`,`Merkezlerde çalışırken hangi materyal en çok işine yaradı?`,`Arkadaşınla ortak bir karar alırken ne hissettin?`,`Yarın bu konuyu devam ettirseydik ne eklemek isterdin?`],c.familyParticipationId=`Evde '${l}' temasıyla ilgili sohbet edilmesi ve aileyle birlikte basit bir gözlem kartı hazırlanması veli bülteniyle önerilir.`,c}export{d as a,u as c,p as d,o as f,t as i,f as l,B as n,s as o,l as p,m as r,c as s,H as t,a as u};