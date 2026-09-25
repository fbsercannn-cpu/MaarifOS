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
  { value: "Yerel öncelikli", label: "Ürün yaklaşımını önceden inceleyin" },
  { value: "Öğretmen onaylı", label: "Yapay zekâ önce düzenlenebilir taslak üretir" },
  { value: "Mobil uygulama", label: "Google Play ve App Store hazırlığı sürüyor" },
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
  void onLaunchHub;
  void onLaunchPhone;
  void onLaunchApp;

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
            <a href="#urun-onizlemesi">Ürün ön izlemesi</a>
            <a href="#nasil">Nasıl çalışır?</a>
            <a href="mailto:destek@maarifos.com">İletişim</a>
          </nav>

          <div className="mos-header-actions">
            <a className="mos-button mos-button-secondary" href="#urun-onizlemesi">Ürünü incele</a>
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
            <a href="#urun-onizlemesi" onClick={() => setMenuOpen(false)}>Ürün ön izlemesi</a>
            <a href="mailto:destek@maarifos.com" onClick={() => setMenuOpen(false)}>İletişim</a>
            <a className="mos-button mos-button-primary" href="#magaza-yayini" onClick={() => setMenuOpen(false)}>Mağaza yayınını takip et</a>
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
              <a className="mos-button mos-button-primary" href="#urun-onizlemesi">Ürünü incele <ArrowRightIcon aria-hidden="true" /></a>
              <a className="mos-text-link" href="#nasil">Ürünü incele</a>
            </div>
            <p className="mos-privacy-note"><LockClosedIcon aria-hidden="true" /> Bu site tanıtım amaçlıdır; sınıf verisi istemez ve tam uygulama erişimi sunmaz.</p>
          </div>

          <div className="mos-product-preview" id="urun-onizlemesi" aria-label="MaarifOS günlük sınıf panosu önizlemesi">
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
              <a className="mos-button mos-button-primary" href="#urun-onizlemesi">Örnek ekranı incele <ArrowRightIcon /></a>
              <a className="mos-button mos-button-quiet" href="#magaza-yayini">Yayın planını gör</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mos-final-cta" id="magaza-yayini">
        <div className="mos-shell mos-final-cta-inner">
          <MobileIcon aria-hidden="true" />
          <div><h2>MaarifOS mobil mağazalara hazırlanıyor.</h2><p>Bu web sitesi ürünü tanıtır. Kullanım, doğrulanmış Google Play ve App Store yayınıyla başlayacak.</p></div>
          <a className="mos-button mos-button-dark" href="mailto:destek@maarifos.com?subject=MaarifOS%20ma%C4%9Faza%20yay%C4%B1n%C4%B1">Yayın haberini al <ArrowRightIcon /></a>
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
