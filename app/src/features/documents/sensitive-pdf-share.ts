import {
  downloadBrowserFile,
  type BrowserFileDownload,
} from "./browser-file-download.ts";

export const SENSITIVE_CLASS_ROSTER_SHARE_WARNING =
  "Bu sınıf listesi T.C. kimlik numarası, veli/yakın adı ve telefon bilgisi içerir. Yalnız yetkili idareciye veya güvenli kurumsal hedefe gönderin; veli ya da mesajlaşma grubunda paylaşmayın. Paylaşmaya devam edilsin mi?";

export type SensitivePdfShareResult = "shared" | "downloaded" | "cancelled";

export interface SensitivePdfShareEnvironment {
  readonly share?: (data: ShareData) => Promise<void>;
  readonly canShare?: (data: ShareData) => boolean;
  readonly FileConstructor?: typeof File;
  readonly confirmSensitiveShare: (warning: string) => boolean | Promise<boolean>;
  readonly download: (file: BrowserFileDownload) => void;
}

function browserSensitivePdfShareEnvironment(): SensitivePdfShareEnvironment {
  return {
    share:
      typeof navigator !== "undefined" && typeof navigator.share === "function"
        ? (data) => navigator.share(data)
        : undefined,
    canShare:
      typeof navigator !== "undefined" && typeof navigator.canShare === "function"
        ? (data) => navigator.canShare(data)
        : undefined,
    FileConstructor: typeof File === "function" ? File : undefined,
    confirmSensitiveShare: (warning) => window.confirm(warning),
    download: (file) => downloadBrowserFile(file),
  };
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  const output = new Uint8Array(bytes.byteLength);
  output.set(bytes);
  return output;
}

function isUserCancellation(reason: unknown): boolean {
  return (
    reason instanceof DOMException && reason.name === "AbortError"
  ) || (
    typeof reason === "object" &&
    reason !== null &&
    "name" in reason &&
    (reason as { name?: unknown }).name === "AbortError"
  );
}

/**
 * Hassas PDF dosyasını ancak açık uyarı ve kullanıcı onayından sonra Web Share
 * API'sine veya indirme yoluna verir. Dosya paylaşımı yoksa ya da teknik olarak
 * başarısız olursa aynı gerçek PDF'yi ancak verilmiş onayın kapsamında indirir;
 * kullanıcı paylaşım ekranını kapattıysa sessizce iptal eder.
 */
export async function shareSensitivePdfWithDownloadFallback(
  file: BrowserFileDownload,
  environment: SensitivePdfShareEnvironment = browserSensitivePdfShareEnvironment(),
): Promise<SensitivePdfShareResult> {
  const bytes = copyBytes(file.bytes);
  const download = () => {
    environment.download({ ...file, bytes: copyBytes(bytes) });
    return "downloaded" as const;
  };
  const confirmed = await environment.confirmSensitiveShare(
    SENSITIVE_CLASS_ROSTER_SHARE_WARNING,
  );
  if (!confirmed) return "cancelled";

  const FileConstructor = environment.FileConstructor;
  if (!environment.share || !FileConstructor) return download();

  const fileBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(fileBuffer).set(bytes);
  const shareFile = new FileConstructor([fileBuffer], file.fileName, {
    type: file.mimeType,
    lastModified: Date.now(),
  });
  const shareData: ShareData = {
    title: "MaarifOS sınıf listesi",
    text: "Yetkili idare kullanımı için hazırlanmış hassas sınıf listesi PDF belgesi.",
    files: [shareFile],
  };
  if (environment.canShare && !environment.canShare(shareData)) return download();

  try {
    await environment.share(shareData);
    return "shared";
  } catch (reason) {
    if (isUserCancellation(reason)) return "cancelled";
    return download();
  }
}
