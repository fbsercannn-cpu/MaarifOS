import { useEffect, useState, type FormEvent } from "react";
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
import type {
  PremiumFounderActivationErrorPresentation,
  PremiumFounderActivationRecovery,
} from "../premium-access/founder-client.ts";

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
  errorPresentation?: PremiumFounderActivationErrorPresentation | null;
  resetBusy?: boolean;
  onActivate: (code: string) => Promise<void>;
  onOpenPlans: () => void;
  onResetLocalLicense?: () => Promise<void>;
}

const recoveryInstructions: Readonly<
  Record<PremiumFounderActivationRecovery, string>
> = {
  retry: "Bilgileri kontrol edip yalnız bir kez daha deneyin.",
  "check-connection":
    "Wi-Fi veya mobil verinin çalıştığını doğrulayın; bağlantı düzeldikten sonra yeniden deneyin.",
  "close-other-tabs":
    "Açık diğer MaarifOS sekmelerini kapatın, sonra bu ekrandan yeniden deneyin.",
  "reload-app":
    "MaarifOS'u tamamen kapatıp yeniden açın. Mevcut sınıf ve öğretmen kayıtları silinmez.",
  "update-app":
    "Uygulamanın güncel sürümünü açın; sorun sürerse destek koduyla yardım isteyin.",
  "reset-local-license":
    "Yalnız bu telefondaki premium lisans alanı kontrollü olarak onarılabilir.",
  "contact-support":
    "Arka arkaya kod denemeyin. Görünen destek kodunu ürün sahibine iletin.",
};

export function founderPremiumRecoveryInstruction(
  recovery: PremiumFounderActivationRecovery,
): string {
  return recoveryInstructions[recovery];
}

export function FounderPremiumActivationPanel({
  access,
  busy,
  configured,
  error = "",
  errorPresentation = null,
  resetBusy = false,
  onActivate,
  onOpenPlans,
  onResetLocalLicense,
}: FounderPremiumActivationPanelProps) {
  const [code, setCode] = useState("");
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const presentation = founderPremiumAccessPresentation(access);
  const visibleError = errorPresentation?.message ?? error;

  useEffect(() => {
    setResetConfirmationOpen(false);
  }, [errorPresentation?.failure]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || resetBusy || !/^\d{6}$/.test(code)) return;
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
                  disabled={busy || resetBusy}
                />
              </label>
              <button
                className="install-app-button founder-premium-primary"
                type="submit"
                data-testid="founder-premium-activate"
                disabled={busy || resetBusy || !/^\d{6}$/.test(code)}
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

      {visibleError ? (
        <p className="security-inline-error" role="alert" data-testid="founder-premium-error">
          {visibleError}
        </p>
      ) : null}

      {errorPresentation ? (
        <div className="secure-secret-form" data-testid="founder-premium-recovery">
          <small className="provider-status">
            {founderPremiumRecoveryInstruction(errorPresentation.recovery)}
          </small>
          {errorPresentation.supportCode ? (
            <small className="provider-status" data-testid="founder-premium-support-code">
              Destek kodu: <code>{errorPresentation.supportCode}</code>
            </small>
          ) : null}

          {errorPresentation.recovery === "reset-local-license" &&
          onResetLocalLicense ? (
            resetConfirmationOpen ? (
              <div data-testid="founder-premium-reset-confirmation">
                <p className="founder-premium-unavailable">
                  Bu işlem yalnız premium cihaz anahtarını, premium yetki belgesini ve
                  indirilen premium içerik önbelleğini siler. Sınıf, çocuk, gözlem, plan
                  ve belgeler silinmez. Sunucudaki cihaz slotu boşalmaz; yeniden bağlanan
                  telefon yeni cihaz sayılır ve boş ikinci slotu kullanabilir. Slot yoksa
                  yönetici desteği gerekir.
                </p>
                <button
                  className="install-app-button founder-premium-primary"
                  type="button"
                  data-testid="founder-premium-reset-confirm"
                  disabled={busy || resetBusy}
                  onClick={async () => {
                    await onResetLocalLicense();
                    setResetConfirmationOpen(false);
                  }}
                >
                  {resetBusy
                    ? "Premium lisans alanı onarılıyor…"
                    : "Yalnız premium lisans alanını sıfırla"}
                </button>
                <button
                  className="install-app-button"
                  type="button"
                  disabled={busy || resetBusy}
                  onClick={() => setResetConfirmationOpen(false)}
                >
                  Vazgeç
                </button>
              </div>
            ) : (
              <button
                className="install-app-button"
                type="button"
                data-testid="founder-premium-reset-start"
                disabled={busy || resetBusy}
                onClick={() => setResetConfirmationOpen(true)}
              >
                Yerel premium lisansını onar
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
