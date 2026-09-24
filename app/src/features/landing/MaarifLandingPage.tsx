import React, { useState } from "react";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckCircledIcon,
  Cross1Icon,
  FileTextIcon,
  HamburgerMenuIcon,
  LightningBoltIcon,
  LockClosedIcon,
  MobileIcon,
} from "@radix-ui/react-icons";
import { MaarifLogo } from "../../components/MaarifLogo";
import "./landing.css";

interface MaarifLandingPageProps {
  onLaunchHub: (tab?: string) => void;
  onLaunchPhone: () => void;
  onLaunchApp?: () => void;
  onOpenSettings?: () => void;
}

const proofItems = [
  { value: "Yerel kayıt", label: "Verilerin önce senin cihazında" },
  { value: "İncelemeye açık taslak", label: "Plan ve belgeler düzenlenebilir" },
  { value: "Mobil ve masaüstü", label: "Sınıfta, evde, her yerde" },
];

const workflow = [
  {
    icon: CalendarIcon,
    title: "Günü seç",
    text: "Sınıfını ve günün odağını belirle; daha önce girdiğin bilgiler yeniden sorulmaz.",
  },
  {
    icon: LightningBoltIcon,
    title: "MaarifOS hazırlasın",
    text: "Plan, etkinlik ve gözlem araçları aynı öğretmen akışında birlikte çalışır.",
  },
  {
    icon: FileTextIcon,
    title: "Kontrol et ve kullan",
    text: "Oluşan kaydı gözden geçir; sakla, yazdır veya uygun biçimde dışa aktar.",
  },
];

export function MaarifLandingPage({ onLaunchHub, onLaunchPhone, onLaunchApp }: MaarifLandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const launchApp = onLaunchApp ?? onLaunchPhone;

  return (
    <main className="mos-site">
      <a className="mos-skip-link" href="#main-content">Ana içeriğe geç</a>

      <header className="mos-header">
        <div className="mos-header-inner">
          <a className="mos-brand-link" href="#top" aria-label="MaarifOS ana sayfa">
            <MaarifLogo size={40} variant="horizontal" theme="light" />
          </a>

          <nav className="mos-nav" aria-label="Ana menü">
            <a href="#neden">Ürün</a>
            <button type="button" onClick={() => onLaunchHub("textbook")}>Kaynaklar</button>
            <a href="#nasil">Nasıl çalışır?</a>
            <a href="mailto:destek@maarifos.com">İletişim</a>
          </nav>

          <div className="mos-header-actions">
            <button type="button" className="mos-button mos-button-secondary" onClick={launchApp}>Uygulamayı aç</button>
            <button
              type="button"
              className="mos-menu-button"
              aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <Cross1Icon /> : <HamburgerMenuIcon />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="mos-mobile-nav" aria-label="Mobil menü">
            <a href="#neden" onClick={() => setMenuOpen(false)}>Ürün</a>
            <a href="#nasil" onClick={() => setMenuOpen(false)}>Nasıl çalışır?</a>
            <button type="button" onClick={() => { setMenuOpen(false); onLaunchHub("textbook"); }}>Kaynaklar</button>
            <a href="mailto:destek@maarifos.com" onClick={() => setMenuOpen(false)}>İletişim</a>
            <button type="button" className="mos-button mos-button-primary" onClick={launchApp}>Uygulamayı aç</button>
          </nav>
        )}
      </header>

      <section className="mos-hero" id="top">
        <div className="mos-hero-photo" aria-hidden="true" />
        <div className="mos-shell mos-hero-grid" id="main-content">
          <div className="mos-hero-copy">
            <span className="mos-kicker">Bugünün küçük adımları, yarın daha büyük yarınlar</span>
            <h1>Bugünkü sınıf akışını kolayca dijitale taşı.</h1>
            <p>Yoklamayı al, gözlemlerini kaydet, günlük plan taslağını oluştur. Tüm sınıf süreci tek bir yerde, her zaman yanında.</p>
            <div className="mos-hero-actions">
              <button type="button" className="mos-button mos-button-primary" onClick={launchApp}>Bugünü hazırla <ArrowRightIcon aria-hidden="true" /></button>
              <a className="mos-text-link" href="#nasil">Ürünü incele</a>
            </div>
            <p className="mos-privacy-note"><LockClosedIcon aria-hidden="true" /> Sınıf verileri varsayılan olarak bu cihazda tutulur. Bulut ve yapay zekâ özellikleri açık seçim gerektirir.</p>
          </div>

          <div className="mos-product-preview" aria-label="MaarifOS günlük sınıf panosu önizlemesi">
            <div className="mos-preview-toolbar">
              <span>24 Eylül Çarşamba</span>
              <span className="mos-preview-status"><CheckCircledIcon /> Hazır</span>
            </div>
            <div className="mos-preview-content">
              <div className="mos-preview-heading"><span>Günaydın öğretmenim</span><strong>Bugünün sınıf panosu</strong></div>
              <div className="mos-preview-cards">
                <article className="mos-preview-card is-yellow"><CalendarIcon /><span>Günün planı</span><strong>3 adım hazır</strong></article>
                <article className="mos-preview-card is-green"><FileTextIcon /><span>Hızlı gözlem</span><strong>Kayda başla</strong></article>
              </div>
              <div className="mos-preview-list">
                <div><CheckCircledIcon /><span>Karşılama ve güne başlama</span><small>08.30</small></div>
                <div><CheckCircledIcon /><span>Öğrenme merkezleri</span><small>09.10</small></div>
                <div><span className="mos-empty-check" /><span>Gün sonu değerlendirme</span><small>14.20</small></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mos-proof" id="neden" aria-label="MaarifOS ürün ilkeleri">
        <div className="mos-shell mos-proof-grid">
          {proofItems.map((item) => <div className="mos-proof-item" key={item.value}><strong>{item.value}</strong><span>{item.label}</span></div>)}
        </div>
      </section>

      <section className="mos-workflow" id="nasil">
        <div className="mos-shell">
          <div className="mos-section-heading">
            <span className="mos-kicker">Üç adımda günlük düzen</span>
            <h2>Öğretmen veri girmekle değil, sınıfıyla ilgilenir.</h2>
            <p>Her adım bir sonrakini besler; seçtiğin bilgi gerçek kayda ve kullanılabilir çıktıya dönüşür.</p>
          </div>
          <div className="mos-workflow-grid">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              return <article className="mos-workflow-item" key={item.title}><div className="mos-step-number">0{index + 1}</div><Icon className="mos-step-icon" aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p></article>;
            })}
          </div>
        </div>
      </section>

      <section className="mos-feature-band">
        <div className="mos-shell mos-feature-grid">
          <div className="mos-feature-image" role="img" aria-label="Ahşap sınıf masasında renkli eğitim materyalleri" />
          <div className="mos-feature-copy">
            <span className="mos-kicker">Sınıfın ritmine uyumlu</span>
            <h2>Plan, gözlem ve belgeler birbirinden kopuk kalmaz.</h2>
            <ul>
              <li><CheckCircledIcon /> Öğrenci ve sınıf bilgilerini tekrar yazmadan ilerle.</li>
              <li><CheckCircledIcon /> Uzun formları telefonda da rahatça tamamla.</li>
              <li><CheckCircledIcon /> Kayıtlarını dışa aktar; yedek ve geri yükleme durumunu gör.</li>
            </ul>
            <div className="mos-feature-actions">
              <button type="button" className="mos-button mos-button-primary" onClick={launchApp}>Sınıfıma geç <ArrowRightIcon /></button>
              <button type="button" className="mos-button mos-button-quiet" onClick={() => onLaunchHub("wizard")}>Planlama alanını aç</button>
            </div>
          </div>
        </div>
      </section>

      <section className="mos-final-cta">
        <div className="mos-shell mos-final-cta-inner">
          <MobileIcon aria-hidden="true" />
          <div><h2>Bugünün işini bugünün akışında tamamla.</h2><p>Kurulum gerektirmeden tarayıcıda aç; desteklenen cihazlarda uygulama olarak ekle.</p></div>
          <button type="button" className="mos-button mos-button-dark" onClick={launchApp}>MaarifOS’u aç <ArrowRightIcon /></button>
        </div>
      </section>

      <footer className="mos-footer">
        <div className="mos-shell mos-footer-inner">
          <MaarifLogo size={34} variant="horizontal" theme="light" />
          <p>Öğretmen için bağımsız çalışma aracı. Resmî kurum sitesi veya Bakanlık hizmeti değildir.</p>
          <div className="mos-footer-links"><a href="mailto:destek@maarifos.com">destek@maarifos.com</a><span>© 2026 MaarifOS</span></div>
        </div>
      </footer>
    </main>
  );
}
