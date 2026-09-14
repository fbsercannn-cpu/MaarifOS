import {
  downloadBrowserFile,
  type BrowserFileDownload,
} from "../documents/browser-file-download.ts";
import { requestPdfPreview } from "../documents/pdf-preview-model.ts";
import type {
  SimpleObservationDocumentAudience,
  SimpleObservationDocumentFile,
} from "./simple-observation-document.ts";

export const SIMPLE_OBSERVATION_PARENT_SHARE_WARNING =
  "Bu belge çocuğun adını ve öğretmenin gözlem notlarını içerir. Yalnız ilgili veliye veya güvenli kurumsal hedefe gönderin; sınıf ya da mesajlaşma grubunda paylaşmayın. Paylaşmaya veya bu cihaza indirmeye devam edilsin mi?";

export const SIMPLE_OBSERVATION_ADMINISTRATION_SHARE_WARNING =
  "Bu idare belgesi çocuğun adını, gözlem notlarını, öğrenci numarasını ve T.C. kimlik numarasını içerebilir. Yalnız yetkili idareciye veya güvenli kurumsal hedefe gönderin; veli ya da mesajlaşma grubunda paylaşmayın. Paylaşmaya veya bu cihaza indirmeye devam edilsin mi?";

export type SimpleObservationShareResult =
  | "shared"
  | "downloaded"
  | "cancelled";

export interface SimpleObservationShareEnvironment {
  readonly share?: (data: ShareData) => Promise<void>;
  readonly canShare?: (data: ShareData) => boolean;
  readonly FileConstructor?: typeof File;
  readonly confirmPersonalDataTransfer: (
    warning: string,
  ) => boolean | Promise<boolean>;
  readonly download: (file: BrowserFileDownload) => void;
}

function browserSimpleObservationShareEnvironment(): SimpleObservationShareEnvironment {
  return {
    share:
      typeof navigator !== "undefined" && typeof navigator.share === "function"
        ? (data) => navigator.share(data)
        : undefined,
    canShare:
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function"
        ? (data) => navigator.canShare(data)
        : undefined,
    FileConstructor: typeof File === "function" ? File : undefined,
    confirmPersonalDataTransfer: (warning) => window.confirm(warning),
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
    (reason instanceof DOMException && reason.name === "AbortError") ||
    (typeof reason === "object" &&
      reason !== null &&
      "name" in reason &&
      (reason as { name?: unknown }).name === "AbortError")
  );
}

function warningForAudience(
  audience: SimpleObservationDocumentAudience,
): string {
  return audience === "parent"
    ? SIMPLE_OBSERVATION_PARENT_SHARE_WARNING
    : SIMPLE_OBSERVATION_ADMINISTRATION_SHARE_WARNING;
}

/**
 * Seçili çocuğun gözlem belgesini açık kişisel veri uyarısından sonra telefonun
 * yerel paylaşım ekranına verir. Dosya paylaşımı desteklenmiyorsa aynı belgeyi,
 * aynı onayın kapsamında, bu cihaza indirir. Sistem paylaşım ekranını kapatmak
 * bir iptaldir ve beklenmedik indirme başlatmaz.
 */
export async function shareSimpleObservationDocumentWithDownloadFallback(
  file: Pick<
    SimpleObservationDocumentFile,
    "audience" | "bytes" | "fileName"
  > & { mimeType: string },
  environment?: SimpleObservationShareEnvironment,
): Promise<SimpleObservationShareResult> {
  if (!environment) {
    let complete: (action: SimpleObservationShareResult) => void = () => undefined;
    const result = new Promise<SimpleObservationShareResult>((resolve) => { complete = resolve; });
    if (requestPdfPreview(file, { warning: warningForAudience(file.audience), complete })) return result;
  }
  environment ??= browserSimpleObservationShareEnvironment();
  const bytes = copyBytes(file.bytes);
  const download = (): "downloaded" => {
    environment.download({
      fileName: file.fileName,
      mimeType: file.mimeType,
      bytes: copyBytes(bytes),
    });
    return "downloaded";
  };

  const confirmed = await environment.confirmPersonalDataTransfer(
    warningForAudience(file.audience),
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
  const audienceLabel = file.audience === "parent" ? "veli" : "idare";
  const shareData: ShareData = {
    title: `MaarifOS ${audienceLabel} gözlem özeti`,
    text: `Seçili çocuk için hazırlanmış ${audienceLabel} gözlem özeti.`,
    files: [shareFile],
  };

  try {
    if (environment.canShare && !environment.canShare(shareData)) {
      return download();
    }
    await environment.share(shareData);
    return "shared";
  } catch (reason) {
    if (isUserCancellation(reason)) return "cancelled";
    return download();
  }
}
