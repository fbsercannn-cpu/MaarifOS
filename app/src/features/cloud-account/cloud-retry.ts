/** One retry owner: the session. HTTP transport never retries writes itself. */
export class CloudRequestError extends Error {
  readonly status: number;
  readonly retryable: boolean;
  constructor(message: string, status = 0, retryable = false) {
    super(message);
    this.name = 'CloudRequestError';
    this.status = status;
    this.retryable = retryable;
  }
}

export function transientCloudStatus(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

/** Three additional attempts, at 1, 2 and 4 minutes; no unlimited retry loop. */
export function cloudRetryDelay(failures: number): number | null {
  return failures >= 1 && failures <= 3 ? 60_000 * 2 ** (failures - 1) : null;
}

export interface RetrySessionState { active: boolean; message: string; stop(): void; }
export function createCloudRetryLoop(options: {
  attempt(): Promise<void>;
  online(): boolean;
  writable(): boolean;
  changed(): void;
  schedule(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  cancel(timer: ReturnType<typeof setTimeout>): void;
}): RetrySessionState & { start(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let failures = 0;
  const state = {
    active: true,
    message: 'Bu oturumda otomatik yedek açık. Değişiklikler her dakika denetlenir.',
    stop() { stopped = true; state.active = false; if (timer !== undefined) options.cancel(timer); },
    start() { void tick(); },
  };
  async function tick() {
    if (stopped) return;
    let delay = 60_000;
    try {
      if (!options.online()) state.message = 'İnternet yok. Yerel kayıtlar korunuyor; bağlantı gelince yedekleme yeniden denenecek.';
      else if (!options.writable()) state.message = 'Cihaz kilitli. Kilit açılınca otomatik yedekleme devam edecek.';
      else {
        await options.attempt();
        failures = 0;
        state.message = `Son yedek denetimi: ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}.`;
      }
    } catch (error) {
      const retry = error instanceof CloudRequestError && error.retryable ? cloudRetryDelay(++failures) : null;
      if (retry === null) {
        state.stop();
        state.message = `${error instanceof Error ? error.message : 'Yedek tamamlanamadı.'} Otomatik yedek durdu; Hesap bölümünden yeniden başlatın.`;
      } else {
        delay = retry;
        state.message = `Bağlantı geçici olarak kesildi. Yerel kayıtlar korunuyor. ${delay / 60_000} dakika sonra yeniden denenecek (${failures}/3).`;
      }
    } finally {
      if (!stopped) { options.changed(); timer = options.schedule(() => void tick(), delay); }
      else options.changed();
    }
  }
  return state;
}
