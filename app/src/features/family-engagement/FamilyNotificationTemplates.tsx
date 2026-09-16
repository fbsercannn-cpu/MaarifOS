/**
 * FamilyNotificationTemplates.tsx � 0.49.0
 *
 * 5 sablonlu veli bildirim olusturucu.
 * Zero-Trust: WhatsApp deep-link localhost'ta bile calisiyor, harici API yok.
 * GIGO: bos/undefined degerler kalip metnine dusmez.
 */
import { useState } from "react";
import "./family-engagement.css";

export interface FamilyNotificationTemplatesProps {
  readonly teacherName: string;
  readonly classroomName: string;
  readonly schoolName: string;
  /** Bu haftanin etkinlik konulari (otomatik cekilen) */
  readonly weekTopics?: readonly string[];
  /** Materyal gerektiren etkinlik isimleri */
  readonly materialRequests?: readonly string[];
  readonly disabled?: boolean;
}

type TemplateId = "weekly-topic" | "home-activity" | "announcement" | "material-request" | "meeting-invite";

interface Template {
  readonly id: TemplateId;
  readonly label: string;
  readonly icon: string;
  buildText(props: FamilyNotificationTemplatesProps, extra: string): string;
}

const TEMPLATES: readonly Template[] = [
  {
    id: "weekly-topic",
    label: "Bu hafta sunlari isliyoruz",
    icon: "??",
    buildText(p, _) {
      const topics = p.weekTopics?.length
        ? p.weekTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")
        : "� konu bilgisi girilmedi �";
      return `Sayin velimiz,\n\nBu hafta sinifimizda asagidaki konulari isliyoruz:\n\n${topics}\n\nSevgilerle,\n${p.teacherName} Ogretmen\n${p.classroomName} � ${p.schoolName}`;
    },
  },
  {
    id: "home-activity",
    label: "Evde yapilabilecek etkinlikler",
    icon: "??",
    buildText(p, extra) {
      const activities = extra.trim() || "Bu hafta calistigimiz konulara uygun kisa oyunlar oynayabilirsiniz.";
      return `Sayin velimiz,\n\nCocugunuzla evde yapabilecegiz baz� etkinlikler:\n\n${activities}\n\nSevgilerle,\n${p.teacherName} Ogretmen\n${p.classroomName} � ${p.schoolName}`;
    },
  },
  {
    id: "announcement",
    label: "Onemli duyuru",
    icon: "??",
    buildText(p, extra) {
      return `Sayin velimiz,\n\n${extra.trim() || "� duyuru metni giriniz �"}\n\nSevgilerle,\n${p.teacherName} Ogretmen\n${p.classroomName} � ${p.schoolName}`;
    },
  },
  {
    id: "material-request",
    label: "Etkinlik icin malzeme getirin",
    icon: "??",
    buildText(p, _) {
      const mats = p.materialRequests?.length
        ? p.materialRequests.map((m, i) => `${i + 1}. ${m}`).join("\n")
        : "� materyal bilgisi girilmedi �";
      return `Sayin velimiz,\n\nYaklasmakta olan etkinligimiz icin asagidaki malzemelerin getirilmesini rica ederiz:\n\n${mats}\n\nSevgilerle,\n${p.teacherName} Ogretmen\n${p.classroomName} � ${p.schoolName}`;
    },
  },
  {
    id: "meeting-invite",
    label: "Gorusme daveti",
    icon: "???",
    buildText(p, extra) {
      return `Sayin velimiz,\n\nCocugunuz hakkinda kisa bir gorusme yapmak istiyorum.\n\n${extra.trim() || "Uygun oldugunuz bir zaman� lutfen ogretmenimize iletiniz."}\n\nSevgilerle,\n${p.teacherName} Ogretmen\n${p.classroomName} � ${p.schoolName}`;
    },
  },
];

function buildWhatsAppLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function FamilyNotificationTemplates(props: FamilyNotificationTemplatesProps) {
  const [selectedId, setSelectedId] = useState<TemplateId>("weekly-topic");
  const [extraText, setExtraText] = useState("");
  const [copied, setCopied] = useState(false);

  const template = TEMPLATES.find((t) => t.id === selectedId)!;
  const messageText = template.buildText(props, extraText);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API yoksa selection ile geri don
      const el = document.createElement("textarea");
      el.value = messageText;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  const needsExtraText = selectedId === "announcement" || selectedId === "home-activity" || selectedId === "meeting-invite";

  return (
    <section className="family-notification-templates" aria-label="Veli Bildirim Sablonlari">
      <header>
        <h2>Veli Bildirimi Hazirla</h2>
        <p>Sablon sec, gerekirse duzenle, WhatsApp'a gonder.</p>
      </header>

      {/* Sablon secici */}
      <div className="fnt__tab-row" role="tablist" aria-label="Sablon turu">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selectedId === t.id}
            onClick={() => { setSelectedId(t.id); setExtraText(""); setCopied(false); }}
            disabled={props.disabled}
          >
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Ek metin alani (sadece bazi sablonlarda) */}
      {needsExtraText && (
        <label className="fnt__extra-label">
          <span>Ek bilgi / metin</span>
          <textarea
            className="fnt__extra-textarea"
            value={extraText}
            onChange={(e) => setExtraText(e.target.value)}
            rows={4}
            placeholder="Buraya yazin..."
            disabled={props.disabled}
          />
        </label>
      )}

      {/* Onizleme */}
      <div className="fnt__preview" aria-label="Mesaj onizleme">
        <pre>{messageText}</pre>
      </div>

      {/* Aksiyonlar */}
      <div className="fnt__actions">
        <button
          type="button"
          className="fnt__copy-btn"
          onClick={copyText}
          disabled={props.disabled}
          aria-live="polite"
        >
          {copied ? "Kopyalandi!" : "Metni Kopyala"}
        </button>
        <a
          className="fnt__whatsapp-btn"
          href={buildWhatsAppLink(messageText)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp'ta paylasim penceresini ac (yeni sekme)"
        >
          WhatsApp'ta Ac
        </a>
      </div>
    </section>
  );
}
