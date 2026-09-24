import { ArrowRightIcon, CheckCircledIcon, ReaderIcon } from "@radix-ui/react-icons";
import { type FormEvent, useState } from "react";

import { KeyboardInput, useKeyboard } from "../../mobile";
import {
  grantLocalSharedAccess,
  type LocalSharedAccessGrant,
  type LocalSharedAccessStorage,
} from "./local-shared-access.ts";
import "./invite-access.css";

type InviteAccessScreenProps = {
  onAccessGranted: (grant: LocalSharedAccessGrant) => void;
  storage?: LocalSharedAccessStorage | null;
  subtle?: SubtleCrypto | null;
  now?: () => Date;
};

export function InviteAccessScreen({
  onAccessGranted,
  storage,
  subtle,
  now,
}: InviteAccessScreenProps) {
  const keyboard = useKeyboard();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    const submittedCode = code;
    setCode("");
    setError("");
    keyboard.hide();

    if (!/^[0-9]{6}$/.test(submittedCode)) {
      setError("Davet kodu altı rakamdan oluşur.");
      return;
    }

    setBusy(true);
    const result = await grantLocalSharedAccess({
      code: submittedCode,
      storage,
      subtle,
      now: now?.() ?? new Date(),
    });
    setBusy(false);

    if (result.ok) {
      onAccessGranted(result.grant);
      return;
    }

    setError(
      result.reason === "invalid_code"
        ? "Kod doğrulanamadı. Davet kodunu kontrol edip yeniden deneyin."
        : "Bu telefonda erişim kaydı oluşturulamadı. Tarayıcı veri iznini kontrol edip yeniden deneyin.",
    );
  };

  return (
    <main className="invite-access-screen" aria-labelledby="invite-access-title">
      <section className="invite-access-card" aria-busy={busy ? "true" : "false"}>
        <div className="invite-access-mark" aria-hidden="true">
          <ReaderIcon />
        </div>

        <div className="invite-access-copy">
          <span className="invite-access-eyebrow">
            <CheckCircledIcon aria-hidden="true" /> KİŞİSEL ÖĞRETMEN ASİSTANI
          </span>
          <h1 id="invite-access-title" data-route-heading tabIndex={-1}>
            MaarifOS’a hoş geldiniz
          </h1>
          <p>Davet kodunuzla tüm öğretmen araçlarını kullanın.</p>
        </div>

        <form className="invite-access-form" onSubmit={submit} noValidate>
          <label htmlFor="maarifos-invite-code">6 haneli davet kodu</label>
          <KeyboardInput
            id="maarifos-invite-code"
            data-testid="maarifos-invite-code"
            type="password"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
            }
            minLength={6}
            maxLength={6}
            inputMode="numeric"
            pattern="[0-9]{6}"
            autoComplete="off"
            enterKeyHint="go"
            aria-invalid={error ? "true" : undefined}
            aria-describedby="maarifos-invite-note maarifos-invite-error"
            disabled={busy}
          />
          <button
            type="submit"
            data-testid="maarifos-invite-submit"
            disabled={busy || !/^[0-9]{6}$/.test(code)}
          >
            <span>{busy ? "Kod doğrulanıyor…" : "MaarifOS’a gir"}</span>
            <ArrowRightIcon aria-hidden="true" />
          </button>
          <small id="maarifos-invite-note">
            Bu kod ortak uygulama erişim anahtarıdır; öğretmen hesabı veya çocuk
            verisi kilidi değildir.
          </small>
          <p
            id="maarifos-invite-error"
            className="invite-access-error"
            role={error ? "alert" : undefined}
            aria-live="polite"
          >
            {error}
          </p>
        </form>

        <p className="invite-access-privacy">
          Kod kaydedilmez; yalnız erişim onayı bu telefonda saklanır. Sınıf ve
          öğrenci kayıtları davet kodundan ayrı yerel veri alanında tutulur.
          Ortak cihazda Ayarlar’dan uygulama kilidini açın; hassas alanlar cihazda
          şifreli tutulur.
        </p>
      </section>
    </main>
  );
}
