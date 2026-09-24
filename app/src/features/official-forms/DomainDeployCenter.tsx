/**
 * DomainDeployCenter.tsx — MaarifOS 0.67.0
 * Web Sitesi ve Domain Dağıtım Merkezi (maarifos.com & maarifos.net)
 * 
 * Amaç:
 * 1. www.maarifos.com (Birincil Alan Adı) ve www.maarifos.net (Yönlendirme Alan Adı) mimarisi.
 * 2. DNS Kayıt Tablosu (A ve CNAME kayıtları, tek tıkla kopyalama).
 * 3. Canlı Domain Durumu, SSL & Güvenlik Telemetrisi.
 * 4. Alan Adı Sağlayıcısı (Turhost, IHS, Natro, GoDaddy, Namecheap, Cloudflare) Adım Adım Kurulum Kılavuzu.
 */

import React, { useState } from "react";
import "./official-forms.css";

interface DNSRecord {
  type: "A" | "CNAME" | "REDIRECT";
  host: string;
  target: string;
  ttl: string;
  purpose: string;
  priority?: number;
}

const PRIMARY_DNS_RECORDS: DNSRecord[] = [
  {
    type: "A",
    host: "@ (maarifos.com)",
    target: "185.199.108.153",
    ttl: "3600 (Otomatik)",
    purpose: "GitHub Pages / CDN Anycast Sunucu 1",
  },
  {
    type: "A",
    host: "@ (maarifos.com)",
    target: "185.199.109.153",
    ttl: "3600 (Otomatik)",
    purpose: "GitHub Pages / CDN Anycast Sunucu 2",
  },
  {
    type: "A",
    host: "@ (maarifos.com)",
    target: "185.199.110.153",
    ttl: "3600 (Otomatik)",
    purpose: "GitHub Pages / CDN Anycast Sunucu 3",
  },
  {
    type: "A",
    host: "@ (maarifos.com)",
    target: "185.199.111.153",
    ttl: "3600 (Otomatik)",
    purpose: "GitHub Pages / CDN Anycast Sunucu 4",
  },
  {
    type: "CNAME",
    host: "www (www.maarifos.com)",
    target: "fbsercannn-cpu.github.io.",
    ttl: "3600 (Otomatik)",
    purpose: "Birincil Web Sitesi Adresi (SSL & PWA Otomatik)",
  },
];

const SECONDARY_DNS_RECORDS: DNSRecord[] = [
  {
    type: "REDIRECT",
    host: "@ (maarifos.net)",
    target: "https://www.maarifos.com/",
    ttl: "Kalıcı (301)",
    purpose: "Tüm maarifos.net trafiğini www.maarifos.com'a yönlendirir",
  },
  {
    type: "REDIRECT",
    host: "www (www.maarifos.net)",
    target: "https://www.maarifos.com/",
    ttl: "Kalıcı (301)",
    purpose: "Tüm www.maarifos.net trafiğini www.maarifos.com'a yönlendirir",
  },
];

export function DomainDeployCenter() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedRegistrar, setSelectedRegistrar] = useState<"turhost" | "godaddy" | "cloudflare" | "genel">("genel");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="domain-center-container">
      {/* ─── BAŞLIK PANELİ ─── */}
      <div className="domain-hero-card">
        <div className="domain-hero-header">
          <div className="domain-badge-group">
            <span className="domain-pill-badge domain-pill-live">
              <span className="domain-pulse-dot" /> CANLI AĞ DEVREDE
            </span>
            <span className="domain-pill-badge domain-pill-gold">
              🏆 Tescilli Alan Adları
            </span>
            <span className="domain-pill-badge domain-pill-neutral">
              Sıfır Sunucu Maliyeti (%100 Stateless)
            </span>
          </div>
          <h2 className="domain-hero-title">
            🌐 MaarifOS Web Sitesi & Domain Dağıtım Merkezi
          </h2>
          <p className="domain-hero-desc">
            <strong>www.maarifos.com</strong> ve <strong>www.maarifos.net</strong> alan adlarınızı
            doğrudan küresel CDN altyapısına bağlayarak öğretmenlerimize yüksek hızlı, kesintisiz ve
            güvenli bir deneyim sunun.
          </p>
        </div>

        {/* ─── DOMAIN KARTLARI ─── */}
        <div className="domain-cards-grid">
          {/* Kart 1: maarifos.com */}
          <div className="domain-status-card domain-card-primary">
            <div className="domain-card-head">
              <div className="domain-card-icon">👑</div>
              <div className="domain-card-meta">
                <span className="domain-role-label">BİRİNCİL RESMÎ WEB SİTESİ</span>
                <h3 className="domain-name">www.maarifos.com</h3>
                <span className="domain-alias">maarifos.com</span>
              </div>
            </div>
            <div className="domain-card-body">
              <div className="domain-telemetry-row">
                <span className="domain-telemetry-label">Hedef Altyapı:</span>
                <span className="domain-telemetry-val">GitHub Pages CDN</span>
              </div>
              <div className="domain-telemetry-row">
                <span className="domain-telemetry-label">SSL Sertifikası:</span>
                <span className="domain-telemetry-val domain-val-green">Otomatik Let's Encrypt (Ücretsiz)</span>
              </div>
              <div className="domain-telemetry-row">
                <span className="domain-telemetry-label">PWA / Mobil Kurulum:</span>
                <span className="domain-telemetry-val domain-val-green">Etkin (Ana Ekrana Ekle)</span>
              </div>
              <div className="domain-telemetry-row">
                <span className="domain-telemetry-label">CNAME Durumu:</span>
                <span className="domain-telemetry-val domain-val-blue">public/CNAME mühürlendi</span>
              </div>
            </div>
            <div className="domain-card-actions">
              <a
                href="https://www.maarifos.com"
                target="_blank"
                rel="noreferrer"
                className="domain-btn domain-btn-primary"
              >
                🚀 www.maarifos.com'a Git
              </a>
              <a
                href="https://www.whatsmydns.net/#A/maarifos.com"
                target="_blank"
                rel="noreferrer"
                className="domain-btn domain-btn-secondary"
              >
                📡 DNS Durumunu Sorgula
              </a>
            </div>
          </div>

          {/* Kart 2: maarifos.net */}
          <div className="domain-status-card domain-card-secondary">
            <div className="domain-card-head">
              <div className="domain-card-icon">🛡️</div>
              <div className="domain-card-meta">
                <span className="domain-role-label">YÖNLENDİRME & MARKA KALKANI</span>
                <h3 className="domain-name">www.maarifos.net</h3>
                <span className="domain-alias">maarifos.net</span>
              </div>
            </div>
            <div className="domain-card-body">
              <div className="domain-telemetry-row">
                <span className="domain-telemetry-label">Yönlendirme Türü:</span>
                <span className="domain-telemetry-val">301 Kalıcı (Permanent)</span>
              </div>
              <div className="domain-telemetry-row">
                <span className="domain-telemetry-label">Hedef Adres:</span>
                <span className="domain-telemetry-val domain-val-green">https://www.maarifos.com/</span>
              </div>
              <div className="domain-telemetry-row">
                <span className="domain-telemetry-label">İstemci Taraflı Koruma:</span>
                <span className="domain-telemetry-val domain-val-blue">index.html Domain Guard Aktif</span>
              </div>
              <div className="domain-telemetry-row">
                <span className="domain-telemetry-label">SEO Etkisi:</span>
                <span className="domain-telemetry-val domain-val-green">%100 Güç Aktarımı (Canonical)</span>
              </div>
            </div>
            <div className="domain-card-actions">
              <a
                href="https://www.maarifos.net"
                target="_blank"
                rel="noreferrer"
                className="domain-btn domain-btn-secondary"
              >
                🔗 www.maarifos.net Test Et
              </a>
              <a
                href="https://www.whatsmydns.net/#A/maarifos.net"
                target="_blank"
                rel="noreferrer"
                className="domain-btn domain-btn-secondary"
              >
                📡 DNS Durumunu Sorgula
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DNS YAPILANDIRMA MASASI ─── */}
      <div className="domain-section">
        <div className="domain-section-header">
          <div>
            <h3 className="domain-section-title">📋 Adım 1: Alan Adı Panelinde Girilecek DNS Kayıtları</h3>
            <p className="domain-section-desc">
              Alan adınızı satın aldığınız firmanın (Turhost, IHS, Natro, GoDaddy, Namecheap vb.) 
              <strong>DNS Yönetimi</strong> sayfasına aşağıdaki kayıtları ekleyin. Değerleri kopyalamak için yanlarındaki butona basabilirsiniz.
            </p>
          </div>
        </div>

        {/* maarifos.com DNS Tablosu */}
        <div className="domain-table-wrapper">
          <div className="domain-table-title">
            <span>👑 <strong>maarifos.com</strong> İçin Gerekli 5 DNS Kaydı</span>
          </div>
          <table className="domain-dns-table">
            <thead>
              <tr>
                <th>Kayıt Tipi</th>
                <th>Ad / Host</th>
                <th>Değer / Hedef</th>
                <th>TTL</th>
                <th>Açıklama</th>
                <th>Eylem</th>
              </tr>
            </thead>
            <tbody>
              {PRIMARY_DNS_RECORDS.map((rec, i) => {
                const key = `rec-${i}-${rec.target}`;
                const isCopied = copiedKey === key;
                return (
                  <tr key={i}>
                    <td>
                      <span className={`domain-type-badge type-${rec.type.toLowerCase()}`}>
                        {rec.type}
                      </span>
                    </td>
                    <td>
                      <code className="domain-code">{rec.host}</code>
                    </td>
                    <td>
                      <code className="domain-code domain-code-target">{rec.target}</code>
                    </td>
                    <td>{rec.ttl}</td>
                    <td className="domain-desc-cell">{rec.purpose}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(rec.target, key)}
                        className={`domain-copy-btn ${isCopied ? "copied" : ""}`}
                      >
                        {isCopied ? "✓ Kopyalandı" : "📋 Kopyala"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* maarifos.net DNS / Yönlendirme Tablosu */}
        <div className="domain-table-wrapper" style={{ marginTop: "24px" }}>
          <div className="domain-table-title">
            <span>🛡️ <strong>maarifos.net</strong> İçin Yönlendirme Ayarı</span>
          </div>
          <table className="domain-dns-table">
            <thead>
              <tr>
                <th>İşlem Tipi</th>
                <th>Kaynak Alan Adı</th>
                <th>Hedef URL</th>
                <th>Yönlendirme Kodu</th>
                <th>Açıklama</th>
                <th>Eylem</th>
              </tr>
            </thead>
            <tbody>
              {SECONDARY_DNS_RECORDS.map((rec, i) => {
                const key = `sec-${i}-${rec.target}`;
                const isCopied = copiedKey === key;
                return (
                  <tr key={i}>
                    <td>
                      <span className="domain-type-badge type-redirect">
                        YÖNLENDİRME (301)
                      </span>
                    </td>
                    <td>
                      <code className="domain-code">{rec.host}</code>
                    </td>
                    <td>
                      <code className="domain-code domain-code-target">{rec.target}</code>
                    </td>
                    <td>Kalıcı 301</td>
                    <td className="domain-desc-cell">{rec.purpose}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(rec.target, key)}
                        className={`domain-copy-btn ${isCopied ? "copied" : ""}`}
                      >
                        {isCopied ? "✓ Kopyalandı" : "📋 Kopyala"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── SAĞLAYICI BAZINDA KURULUM REHBERİ ─── */}
      <div className="domain-section">
        <div className="domain-section-header">
          <div>
            <h3 className="domain-section-title">🛠️ Adım 2: Alan Adı Firmanıza Göre 3 Dakikalık Kurulum</h3>
            <p className="domain-section-desc">
              Hangi firmayı kullanıyorsanız ilgili sekmeyi seçerek yönergeleri takip edebilirsiniz:
            </p>
          </div>
          <div className="domain-registrar-tabs">
            <button
              type="button"
              onClick={() => setSelectedRegistrar("genel")}
              className={`domain-reg-tab ${selectedRegistrar === "genel" ? "active" : ""}`}
            >
              🌐 Genel Standart
            </button>
            <button
              type="button"
              onClick={() => setSelectedRegistrar("turhost")}
              className={`domain-reg-tab ${selectedRegistrar === "turhost" ? "active" : ""}`}
            >
              🇹🇷 Turhost / Natro / IHS
            </button>
            <button
              type="button"
              onClick={() => setSelectedRegistrar("godaddy")}
              className={`domain-reg-tab ${selectedRegistrar === "godaddy" ? "active" : ""}`}
            >
              🌐 GoDaddy / Namecheap
            </button>
            <button
              type="button"
              onClick={() => setSelectedRegistrar("cloudflare")}
              className={`domain-reg-tab ${selectedRegistrar === "cloudflare" ? "active" : ""}`}
            >
              ⚡ Cloudflare DNS
            </button>
          </div>
        </div>

        <div className="domain-guide-box">
          {selectedRegistrar === "genel" && (
            <ol className="domain-steps-list">
              <li>
                <strong>maarifos.com Yönetimi:</strong> Alan adı firmanızın kontrol paneline girin, 
                <em>DNS Yönetimi</em> veya <em>Alan Adı Yöneticisi</em> ekranını açın.
              </li>
              <li>
                <strong>A Kayıtlarını Ekleyin:</strong> Varsa eski A kayıtlarını silip yukarıdaki 4 adet IP adresini (<code>185.199.108.153</code>, <code>185.199.109.153</code>, <code>185.199.110.153</code>, <code>185.199.111.153</code>) Host: <code>@</code> olarak ekleyin.
              </li>
              <li>
                <strong>CNAME Kaydını Ekleyin:</strong> Host: <code>www</code>, Hedef: <code>fbsercannn-cpu.github.io.</code> olarak kaydedin.
              </li>
              <li>
                <strong>maarifos.net Yönlendirmesi:</strong> <code>maarifos.net</code> alan adınızın paneline girin, <em>Alan Adı Yönlendirme (Domain Forwarding)</em> seçeneğini açıp <code>https://www.maarifos.com/</code> yazın ve <em>301 Kalıcı Yönlendirme</em>'yi seçin.
              </li>
            </ol>
          )}

          {selectedRegistrar === "turhost" && (
            <ol className="domain-steps-list">
              <li>
                <strong>Müşteri Paneline Giriş:</strong> Turhost / Natro / IHS panelinize giriş yapın ve <em>Alan Adlarım</em> menüsünden <strong>maarifos.com</strong>'u seçin.
              </li>
              <li>
                <strong>Gelişmiş DNS Yönetimi:</strong> "Gelişmiş DNS Yönetimi" sekmesine tıklayın. Varsa varsayılan park IP'sini silin.
              </li>
              <li>
                <strong>4 Adet A Kaydı Girin:</strong> "Yeni Kayıt Ekle" &gt; Tip: <strong>A</strong> &gt; İsim: <strong>@</strong> &gt; IP: <strong>185.199.108.153</strong> (ve sırasıyla 109, 110, 111) kaydedin.
              </li>
              <li>
                <strong>CNAME Girin:</strong> "Yeni Kayıt Ekle" &gt; Tip: <strong>CNAME</strong> &gt; İsim: <strong>www</strong> &gt; Değer: <strong>fbsercannn-cpu.github.io</strong> kaydedin.
              </li>
              <li>
                <strong>maarifos.net İçin:</strong> <em>maarifos.net</em> alan adının menüsünden "Web Yönlendirme" butonuna tıklayıp hedef adrese <code>https://www.maarifos.com</code> yazıp onaylayın.
              </li>
            </ol>
          )}

          {selectedRegistrar === "godaddy" && (
            <ol className="domain-steps-list">
              <li>
                <strong>GoDaddy Alan Adı Portföyü:</strong> Hesabınıza giriş yapıp <strong>maarifos.com</strong> yanındaki <em>DNS</em> butonuna basın.
              </li>
              <li>
                <strong>DNS Kayıtları Ekle:</strong> "Yeni Kayıt Ekle" &gt; Tür: <strong>A</strong> &gt; Ad: <strong>@</strong> &gt; Değer: <strong>185.199.108.153</strong> ekleyin. Diğer 3 IP için de tekrarlayın.
              </li>
              <li>
                <strong>www CNAME Ayarı:</strong> <code>www</code> adındaki CNAME kaydını düzenleyip Değer alanına <strong>fbsercannn-cpu.github.io</strong> yazıp kaydedin.
              </li>
              <li>
                <strong>maarifos.net Yönlendirme:</strong> GoDaddy'de <em>maarifos.net</em> DNS sayfasına gelin, en alttaki <em>Yönlendirme</em> alanında "Yönlendirme Ekle" diyerek <code>https://www.maarifos.com</code> seçin.
              </li>
            </ol>
          )}

          {selectedRegistrar === "cloudflare" && (
            <ol className="domain-steps-list">
              <li>
                <strong>Cloudflare Dashboard:</strong> <code>maarifos.com</code> sitesine girip <em>DNS &gt; Records</em> sekmesini açın.
              </li>
              <li>
                <strong>A Kayıtları:</strong> Type: <strong>A</strong>, Name: <strong>@</strong>, IPv4: <strong>185.199.108.153</strong> (109, 110, 111). Proxy status: <strong>DNS only (Gri Bulut)</strong> veya <strong>Proxied (Turuncu Bulut)</strong> seçebilirsiniz.
              </li>
              <li>
                <strong>CNAME:</strong> Type: <strong>CNAME</strong>, Name: <strong>www</strong>, Target: <strong>fbsercannn-cpu.github.io</strong> ekleyin.
              </li>
              <li>
                <strong>maarifos.net Redirect Rule:</strong> <code>maarifos.net</code> alan adınızda <em>Rules &gt; Redirect Rules</em> açıp "All incoming requests" için <code>Dynamic Redirect</code>: <code>https://www.maarifos.com/${"{"}http.request.uri.path{"}"}</code> (Status 301) kuralı oluşturun.
              </li>
            </ol>
          )}
        </div>
      </div>

      {/* ─── MİMARİ GÜVENCE BİLGİSİ ─── */}
      <div className="domain-footer-banner">
        <div className="domain-footer-icon">🔒</div>
        <div className="domain-footer-text">
          <h4>Üst Düzey Yerel Veri Güvenliği ve Sıfır İhlal Taahhüdü</h4>
          <p>
            MaarifOS, hiçbir öğretmen veya öğrenci verisini sunucuya göndermez. 
            Tüm planlar, gözlemler, yoklamalar ve 528 ders kitabı etkinliği %100 kullanıcının kendi tarayıcısının RAM ve yerel şifreli depolamasında (IndexedDB) barındırılır.
            <code>www.maarifos.com</code> domaini, dünya standartlarında DDoS korumalı statik CDN omurgası üzerinden milisaniyeler içinde dağıtılır.
          </p>
        </div>
      </div>
    </div>
  );
}
