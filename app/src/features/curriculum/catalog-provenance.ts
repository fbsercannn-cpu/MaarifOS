export type CurriculumCatalogImpact =
  | "unchanged"
  | "source-changed"
  | "catalog-changed"
  | "version-changed";

export interface CurriculumCatalogProvenanceMetadata {
  catalogId: string;
  catalogVersion: string;
  sourceVersion: string;
  sourceSha256: `sha256:${string}`;
  catalogContentSha256: `sha256:${string}`;
  sourceCheckedOn: string;
}

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export interface CurriculumCatalogSnapshot<
  Metadata extends CurriculumCatalogProvenanceMetadata,
  Target,
> {
  readonly schemaVersion: 1;
  readonly metadata: DeepReadonly<Metadata>;
  readonly targets: readonly DeepReadonly<Target>[];
}

function cloneAndFreeze<T>(value: T): DeepReadonly<T> {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => cloneAndFreeze(item))) as DeepReadonly<T>;
  }
  if (typeof value === "object" && value !== null) {
    const clone = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneAndFreeze(item)]),
    );
    return Object.freeze(clone) as DeepReadonly<T>;
  }
  return value as DeepReadonly<T>;
}

/**
 * Katalogu, üretildiği anda metadata ve hedeflerden ayıran derin-dondurulmuş
 * bir değer nesnesine çevirir. Böylece kaynak dizilerindeki sonraki değişiklikler
 * yayımlanmış snapshot'ı; yeni kataloglar da geçmiş profil/hedef snapshot'larını
 * kendiliğinden değiştiremez.
 */
export function createCurriculumCatalogSnapshot<
  Metadata extends CurriculumCatalogProvenanceMetadata,
  Target,
>(
  metadata: Metadata,
  targets: readonly Target[],
): CurriculumCatalogSnapshot<Metadata, Target> {
  return Object.freeze({
    schemaVersion: 1 as const,
    metadata: cloneAndFreeze(metadata),
    targets: cloneAndFreeze(targets),
  });
}

/**
 * İki katalog metadata'sı arasındaki en yüksek etkili farkı saf biçimde sınıflar.
 * Sürüm kimliği değişimi katalog/içerik farkından; katalog içeriği farkı da yalnız
 * kaynak dosyası farkından daha yüksek etkilidir. `sourceCheckedOn` bir denetim
 * izi olduğundan tek başına içerik değişikliği sayılmaz.
 */
export function analyzeCurriculumCatalogImpact(
  previous: Readonly<CurriculumCatalogProvenanceMetadata>,
  next: Readonly<CurriculumCatalogProvenanceMetadata>,
): CurriculumCatalogImpact {
  if (
    previous.catalogId !== next.catalogId ||
    previous.catalogVersion !== next.catalogVersion ||
    previous.sourceVersion !== next.sourceVersion
  ) {
    return "version-changed";
  }
  if (previous.catalogContentSha256 !== next.catalogContentSha256) {
    return "catalog-changed";
  }
  if (previous.sourceSha256 !== next.sourceSha256) {
    return "source-changed";
  }
  return "unchanged";
}
