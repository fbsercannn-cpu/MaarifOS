import { useState, type FormEvent } from "react";
import {
  CheckCircledIcon,
  LockClosedIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { KeyboardInput } from "../../mobile";
import type {
  PremiumAccessStatus,
  VerifiedPremiumAccess,
} from "../premium-access/entitlement.ts";

type FounderPremiumAccessSnapshot = Pick<
  VerifiedPremiumAccess,
  "status" | "canUsePremiumContent" | "canReadExistingTeacherPlans"
>;

export interface FounderPremiumAccessPresentation {
  active: boolean;
  badge: string;
  detail: string;
  canOpenExistingPlans: boolean;
}

const inactiveStatusPresentation: Readonly<
  Record<PremiumAccessStatus, Pick<FounderPremiumAccessPresentation, "badge" | "detail">>
> = {
  active: {
    badge: "Yenileme gerekli",
    detail:
      "Bu cihazın premium içeriği şu anda kullanılamıyor. Kurucu kodunu yeniden doğrulayın.",
  },
  expired: {
    badge: "Süresi doldu",
    detail:
      "Bu cihazdaki Kurucu Premium süresi doldu. Kurucu kodunu yeniden doğrulayarak erişimi yenileyin.",
  },
  "refresh-required": {
    badge: "Yenileme gerekli",
    detail:
      "Çevrimdışı doğrulama süresi doldu. İnternete bağlanıp Kurucu kodunu yeniden doğrulayın.",
  },
  revoked: {
    badge: "İptal edildi",
    detail:
      "Bu cihazın Kurucu Premium yetkisi iptal edildi. Yetkiniz varsa Kurucu koduyla yeniden etkinleştirin.",
  },
};

export function founderPremiumAccessPresentation(
  access: FounderPremiumAccessSnapshot | null,
): FounderPremiumAccessPresentation {
  const active =
    access?.status === "active" && access.canUsePremiumContent === true;
  if (active) {
    return {
      active: true,
      badge: "Etkin",
      detail:
        "Bu telefon doğrulandı. Plan, değerlendirme ve belge hakları çevrimdışıyken de korunur.",
      canOpenExistingPlans: true,
    };
  }
  if (!access) {
    return {
      active: false,
      badge: "Cihaza özel",
      detail:
        "Size ve Emine Öğretmen’e ayrılan iki cihazlık erişim. Ücretli premium üyeliklerden tamamen ayrıdır.",
      canOpenExistingPlans: false,
    };
  }
  return {
    active: false,
    ...inactiveStatusPresentation[access.status],
    canOpenExistingPlans: access.canReadExistingTeacherPlans === true,
  };
}

export interface FounderPremiumActivationPanelProps {
  access: FounderPremiumAccessSnapshot | null;
  busy: boolean;
  configured: boolean;
  error?: string;
  onActivate: (code: string) => Promise<void>;
  onOpenPlans: () => void;
}

export function FounderPremiumActivationPanel({
  access,
  busy,
  configured,
  error = "",
  onActivate,
  onOpenPlans,
}: FounderPremiumActivationPanelProps) {
  const [code, setCode] = useState("");
  const presentation = founderPremiumAccessPresentation(access);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !/^\d{6}$/.test(code)) return;
    const oneTimeCode = code;
    setCode("");
    await onActivate(oneTimeCode);
  };

  return (
    <section
      className={`security-section founder-premium-card${presentation.active ? " is-active" : ""}`}
      aria-labelledby="founder-premium-heading"
      data-testid="founder-premium-card"
    >
      <div className="security-heading-row">
        <span className="founder-premium-icon" aria-hidden="true">
          {presentation.active ? <CheckCircledIcon /> : <StarIcon />}
        </span>
        <div>
          <h3 id="founder-premium-heading">Kurucu Premium</h3>
          <p>{presentation.detail}</p>
        </div>
        <span className="optional-badge">{presentation.badge}</span>
      </div>

      {presentation.active ? (
        <button
          className="install-app-button founder-premium-primary"
          type="button"
          onClick={onOpenPlans}
        >
          <StarIcon aria-hidden="true" /> Plan Kütüphanesini aç
        </button>
      ) : (
        <>
          {presentation.canOpenExistingPlans ? (
            <button
              className="install-app-button"
              type="button"
              onClick={onOpenPlans}
            >
              Mevcut öğretmen planlarını aç
            </button>
          ) : null}
          {configured ? (
            <form className="secure-secret-form founder-premium-form" onSubmit={submit}>
              <label htmlFor="founder-premium-code">
                6 haneli Kurucu kodu
                <KeyboardInput
                  id="founder-premium-code"
                  data-testid="founder-premium-code"
                  type="password"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  minLength={6}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  autoComplete="off"
                  aria-describedby="founder-premium-code-note"
                  disabled={busy}
                />
              </label>
              <button
                className="install-app-button founder-premium-primary"
                type="submit"
                data-testid="founder-premium-activate"
                disabled={busy || !/^\d{6}$/.test(code)}
              >
                <LockClosedIcon aria-hidden="true" />
                {busy ? "Bu telefon doğrulanıyor…" : "Bu telefonda etkinleştir"}
              </button>
              <small id="founder-premium-code-note" className="provider-status">
                Kod cihazda saklanmaz. Her telefon kendi çıkarılamaz cihaz anahtarıyla
                ayrı doğrulanır; üçüncü cihaz sunucuda reddedilir.
              </small>
            </form>
          ) : (
            <p className="founder-premium-unavailable" role="status">
              Kurucu erişim servisi bu sürümde yapılandırılmamış. Ücretli premium
              erişimi bu durumdan etkilenmez.
            </p>
          )}
        </>
      )}

      {error ? (
        <p className="security-inline-error" role="alert" data-testid="founder-premium-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
