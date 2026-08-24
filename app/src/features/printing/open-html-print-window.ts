export type HtmlPrintWindowResult =
  | Readonly<{ opened: true }>
  | Readonly<{ opened: false; reason: "popup-blocked" }>;

interface HtmlPrintPopup {
  opener: unknown;
  readonly document?: { title: string };
  addEventListener(
    type: "load" | "afterprint",
    listener: () => void,
    options?: AddEventListenerOptions,
  ): void;
  focus(): void;
  print(): void;
}

export interface HtmlPrintEnvironment {
  createBlobUrl(html: string, mimeType: string): string;
  revokeBlobUrl(url: string): void;
  open(url: string, target: string, features: string): HtmlPrintPopup | null;
  setTimer(handler: () => void, delayMs: number): number;
  clearTimer(timerId: number): void;
}

export interface OpenHtmlPrintWindowOptions {
  readonly html: string;
  readonly title: string;
  readonly features?: string;
}

function browserHtmlPrintEnvironment(): HtmlPrintEnvironment {
  return {
    createBlobUrl: (html, mimeType) =>
      URL.createObjectURL(new Blob([html], { type: mimeType })),
    revokeBlobUrl: (url) => URL.revokeObjectURL(url),
    open: (url, target, features) =>
      window.open(url, target, features) as HtmlPrintPopup | null,
    setTimer: (handler, delayMs) => window.setTimeout(handler, delayMs),
    clearTimer: (timerId) => window.clearTimeout(timerId),
  };
}

/**
 * Yerel, betiksiz HTML'i doğrudan kullanıcı hareketi içinde ayrı bir baskı
 * görünümüne açar. Yükleme olayı bazı gömülü tarayıcılarda gelmezse kısa bir
 * zaman aşımı aynı görünümde `print()` çağrısını güvenle tamamlar.
 */
export function openHtmlPrintWindow(
  options: OpenHtmlPrintWindowOptions,
  environment: HtmlPrintEnvironment = browserHtmlPrintEnvironment(),
): HtmlPrintWindowResult {
  const blobUrl = environment.createBlobUrl(
    options.html,
    "text/html;charset=utf-8",
  );
  const popup = environment.open(
    blobUrl,
    "_blank",
    options.features ?? "popup,width=900,height=720",
  );
  if (!popup) {
    environment.revokeBlobUrl(blobUrl);
    return { opened: false, reason: "popup-blocked" };
  }

  popup.opener = null;
  let printed = false;
  let revoked = false;
  let fallbackTimer: number | null = null;
  let releaseTimer: number | null = null;

  const revokeOnce = () => {
    if (revoked) return;
    revoked = true;
    environment.revokeBlobUrl(blobUrl);
  };
  const printOnce = () => {
    if (printed) return;
    printed = true;
    if (fallbackTimer !== null) {
      environment.clearTimer(fallbackTimer);
      fallbackTimer = null;
    }
    try {
      if (popup.document && !popup.document.title.trim()) {
        popup.document.title = options.title;
      }
    } catch {
      // Çapraz pencere başlığı erişilemezse HTML içindeki başlık kullanılır.
    }
    popup.focus();
    popup.print();
  };
  const release = () => {
    if (releaseTimer !== null) {
      environment.clearTimer(releaseTimer);
      releaseTimer = null;
    }
    revokeOnce();
  };

  popup.addEventListener("load", printOnce, { once: true });
  popup.addEventListener("afterprint", release, { once: true });
  fallbackTimer = environment.setTimer(printOnce, 2_000);
  releaseTimer = environment.setTimer(revokeOnce, 60_000);

  return { opened: true };
}

export function escapePrintHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
