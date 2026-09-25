import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { KeyboardProvider, MobileDeviceProvider } from "./mobile";
import { ScreenPortalRoot } from "./mobile/PhoneFrame";
import Prototype from "./Prototype";
import { TYMMPlanHub } from "./features/official-forms/TYMMPlanHub";
import { MaarifAIAssistant } from "./components/MaarifAIAssistant";
import { MaarifApiConfigModal } from "./components/MaarifApiConfigModal";
import { MaarifSettingsModal } from "./components/MaarifSettingsModal";
import { PwaInstallPromptModal } from "./components/PwaInstallPromptModal";
import { MaarifLandingPage } from "./features/landing/MaarifLandingPage";
import { AIObservationAnecdoteWorkspace } from "./features/anecdote/AIObservationAnecdoteWorkspace";
import { ChatGPTBridgeModal } from "./features/chatgpt-bridge/ChatGPTBridgeModal";
import { resolveAppSurface } from "./native/runtime";
import { installNativeAccountHandler } from "./native/native-account";

/**
 * MaarifOS 0.75.2 — öğretmen çalışma alanı, web vitrini ve native mağaza kabuğu
 */
export default function App() {
  const [activeView, setActiveView] = useState<"landing" | "app">(() => {
    if (typeof window !== "undefined") {
      return resolveAppSurface(
        window.location,
        Capacitor.isNativePlatform(),
        import.meta.env.VITE_MAARIFOS_TEST_APP_ROOT === "1",
      );
    }
    return "landing";
  });

  const launchApplication = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "app");
    url.searchParams.set("native", "1");
    url.hash = "";
    window.history.pushState({ view: "app" }, "", url);
    setActiveView("app");
  };
  const [showTymmHub, setShowTymmHub] = useState(false);
  const [tymmInitialTab, setTymmInitialTab] = useState<string>("wizard");
  const [showAnecdoteModal, setShowAnecdoteModal] = useState(false);
  const [anecdoteAutoVoice, setAnecdoteAutoVoice] = useState(false);
  const [anecdoteStudentName, setAnecdoteStudentName] = useState<string | undefined>(undefined);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);
  const [showChatGptBridgeModal, setShowChatGptBridgeModal] = useState(false);
  const [showApiConfigModal, setShowApiConfigModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    let removeNativeAccountHandler: (() => Promise<void>) | null = null;
    void installNativeAccountHandler().then((remove) => { removeNativeAccountHandler = remove; });
    const handleOpenTymm = (e?: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent?.detail?.tab) {
        setTymmInitialTab(customEvent.detail.tab);
      } else {
        setTymmInitialTab("wizard");
      }
      setShowTymmHub(true);
    };
    const handleOpenApiConfig = () => {
      setShowApiConfigModal(true);
    };
    const handleOpenAnecdote = (e?: Event) => {
      const customEvent = e as CustomEvent;
      setAnecdoteAutoVoice(false);
      setAnecdoteStudentName(customEvent?.detail?.studentName);
      setShowAnecdoteModal(true);
    };
    const handleOpenVoiceDikte = (e?: Event) => {
      const customEvent = e as CustomEvent;
      setAnecdoteAutoVoice(true);
      setAnecdoteStudentName(customEvent?.detail?.studentName);
      setShowAnecdoteModal(true);
    };
    const handleOpenSettings = () => {
      setShowSettingsModal(true);
    };
    const handleOpenChatGptBridge = () => {
      setShowChatGptBridgeModal(true);
    };
    const handleOpenInstallModal = () => {
      setShowPwaInstallModal(true);
    };
    const handleCloseGlobalOverlays = () => {
      setShowTymmHub(false);
      setShowAnecdoteModal(false);
      setAnecdoteAutoVoice(false);
      setAnecdoteStudentName(undefined);
      setShowPwaInstallModal(false);
      setShowChatGptBridgeModal(false);
      setShowApiConfigModal(false);
      setShowSettingsModal(false);
    };

    window.addEventListener("maarif_open_tymm_hub", handleOpenTymm);
    window.addEventListener("maarif_open_api_config", handleOpenApiConfig);
    window.addEventListener("maarif_open_ai_anecdote", handleOpenAnecdote);
    window.addEventListener("maarif_toggle_voice_dikte", handleOpenVoiceDikte);
    window.addEventListener("maarif_open_quick_observation", handleOpenAnecdote);
    window.addEventListener("maarif_open_settings", handleOpenSettings);
    window.addEventListener("maarif_open_chatgpt_bridge", handleOpenChatGptBridge);
    window.addEventListener("maarif_open_install_modal", handleOpenInstallModal);
    window.addEventListener("maarif_close_global_overlays", handleCloseGlobalOverlays);

    return () => {
      void removeNativeAccountHandler?.();
      window.removeEventListener("maarif_open_tymm_hub", handleOpenTymm);
      window.removeEventListener("maarif_open_api_config", handleOpenApiConfig);
      window.removeEventListener("maarif_open_ai_anecdote", handleOpenAnecdote);
      window.removeEventListener("maarif_toggle_voice_dikte", handleOpenVoiceDikte);
      window.removeEventListener("maarif_open_quick_observation", handleOpenAnecdote);
      window.removeEventListener("maarif_open_settings", handleOpenSettings);
      window.removeEventListener("maarif_open_chatgpt_bridge", handleOpenChatGptBridge);
      window.removeEventListener("maarif_open_install_modal", handleOpenInstallModal);
      window.removeEventListener("maarif_close_global_overlays", handleCloseGlobalOverlays);
    };
  }, []);

  return (
    <div className="maarif-app-root">
      {activeView === "landing" ? (
        <div style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto", width: "100%" }}>
          <MaarifLandingPage
            onLaunchHub={(tab) => {
              setTymmInitialTab((tab as any) || "wizard");
              setShowTymmHub(true);
            }}
            onLaunchPhone={launchApplication}
            onLaunchApp={launchApplication}
            onOpenSettings={() => setShowSettingsModal(true)}
          />
        </div>
      ) : (
        /* ─── ESAS ÖĞRETMEN UYGULAMASI (TAM EKRAN SAF NATIVE RUNTIME) ─── */
        <MobileDeviceProvider native>
          <KeyboardProvider native>
            <ScreenPortalRoot className="native-app-runtime">
              <Prototype />
            </ScreenPortalRoot>
          </KeyboardProvider>
        </MobileDeviceProvider>
      )}

      {/* ─── TYMM 2026 RESMÎ PLANLAMA TERMİNALİ OVERLAY MODAL ─── */}
      {showTymmHub && (
        <MobileDeviceProvider native>
          <KeyboardProvider native>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                background: "#070d18",
                overflowY: "auto",
              }}
            >
              <TYMMPlanHub
                initialTab={tymmInitialTab as any}
                onClose={() => setShowTymmHub(false)}
              />
            </div>
          </KeyboardProvider>
        </MobileDeviceProvider>
      )}

      {/* ─── YAPAY ZEKA DESTEKLİ MEB EK-2 GÖZLEM VE ANEKDOT ÇALIŞMA MASASI OVERLAY MODAL ─── */}
      {showAnecdoteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "#070d18",
            overflowY: "auto",
            padding: "16px",
          }}
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <AIObservationAnecdoteWorkspace
              autoStartVoice={anecdoteAutoVoice}
              initialStudentName={anecdoteStudentName}
              onClose={() => {
                setShowAnecdoteModal(false);
                setAnecdoteAutoVoice(false);
                setAnecdoteStudentName(undefined);
              }}
            />
          </div>
        </div>
      )}

      {/* ─── GLOBAL PEDAGOJİK YAPAY ZEKÂ DESTEK (SAĞ ALTTAKİ ENGELLEYİCİ KUTUCUK KALDIRILDI) ─── */}
      <MobileDeviceProvider native>
        <KeyboardProvider native>
          <MaarifAIAssistant context={{}} hideFAB={true} />
        </KeyboardProvider>
      </MobileDeviceProvider>

      {/* ─── DOĞRULANMIŞ MOBİL MAĞAZA YAYIN BİLGİSİ ─── */}
      <PwaInstallPromptModal
        isOpen={showPwaInstallModal}
        onClose={() => setShowPwaInstallModal(false)}
      />

      {/* Yapay zekâ çalışma biçimi: yerel destek veya güvenli sunucu geçidi. */}
      <MaarifApiConfigModal
        isOpen={showApiConfigModal}
        onClose={() => setShowApiConfigModal(false)}
      />

      {/* ─── YETKİLİ AYARLAR VE LİSANS YÖNETİMİ MASASI ─── */}
      <MaarifSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onOpenApiConfig={() => setShowApiConfigModal(true)}
      />

      {/* ─── TELEFON CHATGPT VERİ KÖPRÜSÜ VE PLAN İTHALAT MASASI ─── */}
      <ChatGPTBridgeModal
        isOpen={showChatGptBridgeModal}
        onClose={() => setShowChatGptBridgeModal(false)}
      />
    </div>
  );
}
