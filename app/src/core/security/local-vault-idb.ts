import { LocalVaultSecurityError } from "./local-vault-envelope.ts";

export type LocalVaultDurabilityMode = "strict" | "browser-default";

export interface LocalVaultReadwriteTransaction {
  transaction: IDBTransaction;
  durability: LocalVaultDurabilityMode;
}

function durabilityFallbackAllowed(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      (error.name === "NotSupportedError" || error.name === "TypeError"))
  );
}

/**
 * Güvenlik-kritik yazmalarda tarayıcı destekliyorsa `strict` durability ister.
 * Eski tarayıcı imzayı tanımıyorsa yalnız durability ipucu düşürülür; aynı
 * IndexedDB transaction atomikliği korunur. Diğer bütün hatalar fail-closed
 * ile üst katmana taşınır.
 */
export function openLocalVaultReadwriteTransaction(
  database: IDBDatabase,
  storeNames: string | readonly string[],
): LocalVaultReadwriteTransaction {
  try {
    return {
      transaction: database.transaction(storeNames, "readwrite", {
        durability: "strict",
      }),
      durability: "strict",
    };
  } catch (error) {
    if (!durabilityFallbackAllowed(error)) {
      throw new LocalVaultSecurityError(
        "LOCAL_VAULT_DURABLE_TRANSACTION_FAILED",
        "Yerel kasa dayanıklı yazma işlemi başlatılamadı.",
      );
    }
    return {
      transaction: database.transaction(storeNames, "readwrite"),
      durability: "browser-default",
    };
  }
}
