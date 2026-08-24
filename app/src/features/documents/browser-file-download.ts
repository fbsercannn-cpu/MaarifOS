export const BROWSER_FILE_DOWNLOAD_URL_LIFETIME_MS = 30_000;

export interface BrowserFileDownloadAnchor {
  href: string;
  download: string;
  rel: string;
  click(): void;
}

export interface BrowserFileDownloadEnvironment {
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  createAnchor(): BrowserFileDownloadAnchor;
  setTimer(handler: () => void, delayMs: number): void;
}

export interface BrowserFileDownload {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  readonly fileName: string;
}

function browserFileDownloadEnvironment(): BrowserFileDownloadEnvironment {
  return {
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    createAnchor: () => document.createElement("a"),
    setTimer: (handler, delayMs) => {
      window.setTimeout(handler, delayMs);
    },
  };
}

/**
 * Tarayıcı indirmesini kullanıcı hareketi içinde başlatır ve Blob URL'sini
 * mobil tarayıcının dosyayı devralabilmesi için en az 30 saniye yaşatır.
 */
export function downloadBrowserFile(
  file: BrowserFileDownload,
  environment: BrowserFileDownloadEnvironment = browserFileDownloadEnvironment(),
): void {
  const bytes = new Uint8Array(file.bytes.byteLength);
  bytes.set(file.bytes);
  const objectUrl = environment.createObjectUrl(
    new Blob([bytes.buffer], { type: file.mimeType }),
  );
  const anchor = environment.createAnchor();
  anchor.href = objectUrl;
  anchor.download = file.fileName;
  anchor.rel = "noopener";
  environment.setTimer(
    () => environment.revokeObjectUrl(objectUrl),
    BROWSER_FILE_DOWNLOAD_URL_LIFETIME_MS,
  );
  anchor.click();
}
