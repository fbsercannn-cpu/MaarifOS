import React, { useState, useEffect } from "react";
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

/**
 * MaarifOS 0.66.1 — öğretmen çalışma alanı ve web vitrini
 */
export default function App() {
  const [activeView, setActiveView] = useState<"landing" | "app">(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = new URLSearchParams(window.location.search);
      if (
        hash === "#landing" ||
        hash === "#web" ||
        hash === "#site" ||
        search.get("view") === "landing" ||
        search.get("site") === "1"
      ) {
        return "landing";
      }
      if (
        hash === "#app" ||
        search.get("view") === "app" ||
        search.get("native") === "1" ||
        window.location.pathname.startsWith("/gunum/")
      ) {
        return "app";
      }
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

    window.addEventListener("maarif_open_tymm_hub", handleOpenTymm);
    window.addEventListener("maarif_open_api_config", handleOpenApiConfig);
    window.addEventListener("maarif_open_ai_anecdote", handleOpenAnecdote);
    window.addEventListener("maarif_toggle_voice_dikte", handleOpenVoiceDikte);
    window.addEventListener("maarif_open_quick_observation", handleOpenAnecdote);
    window.addEventListener("maarif_open_settings", handleOpenSettings);
    window.addEventListener("maarif_open_chatgpt_bridge", handleOpenChatGptBridge);
    window.addEventListener("maarif_open_install_modal", handleOpenInstallModal);

    return () => {
      window.removeEventListener("maarif_open_tymm_hub", handleOpenTymm);
      window.removeEventListener("maarif_open_api_config", handleOpenApiConfig);
      window.removeEventListener("maarif_open_ai_anecdote", handleOpenAnecdote);
      window.removeEventListener("maarif_toggle_voice_dikte", handleOpenVoiceDikte);
      window.removeEventListener("maarif_open_quick_observation", handleOpenAnecdote);
      window.removeEventListener("maarif_open_settings", handleOpenSettings);
      window.removeEventListener("maarif_open_chatgpt_bridge", handleOpenChatGptBridge);
      window.removeEventListener("maarif_open_install_modal", handleOpenInstallModal);
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
      <MaarifAIAssistant context={{}} hideFAB={true} />

      {/* ─── TELEFONA DOĞRUDAN UYGULAMA YÜKLEME REHBERİ (PWA) ─── */}
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
