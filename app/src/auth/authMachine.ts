export type NetworkStatus = "online" | "offline";

export type GoogleReadiness = "coming_soon" | "available";

export type AuthOrigin = "welcome" | "local_guest";

export type AuthErrorCode =
  | "offline"
  | "not_available"
  | "cancelled"
  | "invalid_response"
  | "provider_error";

type GoogleConnection = "not_connected" | "connecting" | "connected";

type AuthBase = {
  network: NetworkStatus;
  googleReadiness: GoogleReadiness;
  googleConnection: GoogleConnection;
};

export type WelcomeAuthState = AuthBase & {
  status: "welcome";
  googleConnection: "not_connected";
  notice?: AuthErrorCode;
};

export type LocalGuestAuthState = AuthBase & {
  status: "local_guest";
  googleConnection: "not_connected";
  notice?: AuthErrorCode | "google_disconnected";
};

export type GoogleConnectingAuthState = AuthBase & {
  status: "google_connecting";
  network: "online";
  googleReadiness: "available";
  googleConnection: "connecting";
  origin: AuthOrigin;
};

export type GoogleConnectedAuthState = AuthBase & {
  status: "google_connected";
  googleReadiness: "available";
  googleConnection: "connected";
  user: {
    /** Google subject identifier; never an OAuth token. */
    subject: string;
    displayName: string;
  };
};

export type GoogleErrorAuthState = AuthBase & {
  status: "google_error";
  googleConnection: "not_connected";
  error: AuthErrorCode;
  origin: AuthOrigin;
};

export type AuthState =
  | WelcomeAuthState
  | LocalGuestAuthState
  | GoogleConnectingAuthState
  | GoogleConnectedAuthState
  | GoogleErrorAuthState;

export type AuthEvent =
  | { type: "CONTINUE_OFFLINE" }
  | { type: "REQUEST_GOOGLE" }
  | { type: "GOOGLE_CANCELLED" }
  | { type: "GOOGLE_FAILED"; reason: "invalid_response" | "provider_error" }
  | {
      type: "GOOGLE_SESSION_CONFIRMED";
      user: { subject: string; displayName: string };
    }
  | { type: "DISCONNECT_GOOGLE" }
  | { type: "NETWORK_CHANGED"; network: NetworkStatus }
  | { type: "GOOGLE_READINESS_CHANGED"; readiness: GoogleReadiness };

export type WelcomeViewModel = {
  heading: string;
  privacySummary: string;
  localAction: {
    label: string;
    enabled: true;
  };
  googleAction: {
    label: string;
    enabled: boolean;
    statusText: string;
  };
};

const createOriginState = (
  origin: AuthOrigin,
  state: AuthState,
  notice?: WelcomeAuthState["notice"] | LocalGuestAuthState["notice"],
): WelcomeAuthState | LocalGuestAuthState => {
  const shared = {
    network: state.network,
    googleReadiness: state.googleReadiness,
    googleConnection: "not_connected" as const,
  };
  if (origin === "local_guest") {
    return {
      ...shared,
      status: "local_guest",
      ...(notice === undefined ? {} : { notice }),
    };
  }
  return {
    ...shared,
    status: "welcome",
    ...(notice === undefined || notice === "google_disconnected" ? {} : { notice }),
  };
};

const authOrigin = (state: AuthState): AuthOrigin => {
  if (state.status === "local_guest") return "local_guest";
  if (state.status === "google_connecting" || state.status === "google_error") {
    return state.origin;
  }
  return "welcome";
};

export const createInitialAuthState = (input?: {
  network?: NetworkStatus;
  googleReadiness?: GoogleReadiness;
}): WelcomeAuthState => ({
  status: "welcome",
  network: input?.network ?? "offline",
  googleReadiness: input?.googleReadiness ?? "coming_soon",
  googleConnection: "not_connected",
});

/**
 * Pure frontend state machine. It never creates credentials, calls the network,
 * or writes authentication material to browser storage.
 */
export const reduceAuthState = (state: AuthState, event: AuthEvent): AuthState => {
  switch (event.type) {
    case "CONTINUE_OFFLINE":
      return createOriginState("local_guest", state);

    case "REQUEST_GOOGLE": {
      const origin = authOrigin(state);
      if (state.googleReadiness !== "available") {
        return {
          ...createOriginState(origin, state),
          status: "google_error",
          error: "not_available",
          origin,
        };
      }
      if (state.network === "offline") {
        return {
          ...createOriginState(origin, state),
          status: "google_error",
          error: "offline",
          origin,
        };
      }
      return {
        status: "google_connecting",
        network: "online",
        googleReadiness: "available",
        googleConnection: "connecting",
        origin,
      };
    }

    case "GOOGLE_CANCELLED": {
      if (state.status !== "google_connecting") return state;
      return createOriginState(state.origin, state, "cancelled");
    }

    case "GOOGLE_FAILED": {
      if (state.status !== "google_connecting") return state;
      return {
        ...createOriginState(state.origin, state),
        status: "google_error",
        error: event.reason,
        origin: state.origin,
      };
    }

    case "GOOGLE_SESSION_CONFIRMED": {
      if (state.status !== "google_connecting") return state;
      const subject = event.user.subject.trim();
      const displayName = event.user.displayName.trim();
      if (!subject || !displayName) {
        return {
          ...createOriginState(state.origin, state),
          status: "google_error",
          error: "invalid_response",
          origin: state.origin,
        };
      }
      return {
        status: "google_connected",
        network: state.network,
        googleReadiness: "available",
        googleConnection: "connected",
        user: { subject, displayName },
      };
    }

    case "DISCONNECT_GOOGLE":
      if (state.status !== "google_connected") return state;
      return createOriginState("local_guest", state, "google_disconnected");

    case "NETWORK_CHANGED": {
      if (state.status === "google_connecting" && event.network === "offline") {
        return {
          ...createOriginState(state.origin, state),
          network: "offline",
          status: "google_error",
          error: "offline",
          origin: state.origin,
        };
      }
      if (state.status === "google_connecting") return state;
      return { ...state, network: event.network };
    }

    case "GOOGLE_READINESS_CHANGED": {
      if (state.status === "google_connected") return state;
      if (state.status === "google_connecting" && event.readiness === "coming_soon") {
        return {
          ...createOriginState(state.origin, state),
          googleReadiness: "coming_soon",
          status: "google_error",
          error: "not_available",
          origin: state.origin,
        };
      }
      if (state.status === "google_connecting") return state;
      return { ...state, googleReadiness: event.readiness };
    }
  }
};

export const deriveWelcomeViewModel = (state: AuthState): WelcomeViewModel => {
  const googleAvailable = state.googleReadiness === "available";
  const googleEnabled = googleAvailable && state.network === "online";
  const statusText = !googleAvailable
    ? "Henüz bağlı değil · Google ile giriş yakında"
    : state.network === "offline"
      ? "Çevrim dışısınız · Google bağlantısı için internet gerekir"
      : state.googleConnection === "connected"
        ? "Google hesabı bağlı"
        : "Henüz bağlı değil · İsteğe bağlı bağlantı";

  return {
    heading: "MaarifOS’a hoş geldiniz",
    privacySummary: "Çocuk verileri bu cihazda kalır. Google bağlantısı isteğe bağlıdır.",
    localAction: {
      label: "İnternetsiz devam et",
      enabled: true,
    },
    googleAction: {
      label: googleAvailable ? "Google ile giriş yap" : "Google ile giriş · Yakında",
      enabled: googleEnabled,
      statusText,
    },
  };
};

/** Auth state is intentionally memory-only. Local app data has its own repository. */
export const AUTH_STATE_PERSISTENCE = "memory-only" as const;
