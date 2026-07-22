import { KeyboardProvider, MobileDeviceProvider, MobileRuntime } from "./mobile";
import { ScreenPortalRoot } from "./mobile/PhoneFrame";
import Prototype from "./Prototype";

export default function App() {
  if (import.meta.env.PROD || new URLSearchParams(window.location.search).get("native") === "1") {
    return (
      <MobileDeviceProvider native>
        <KeyboardProvider native>
          <ScreenPortalRoot className="native-app-runtime">
            <Prototype />
          </ScreenPortalRoot>
        </KeyboardProvider>
      </MobileDeviceProvider>
    );
  }

  return (
    <MobileRuntime>
      <Prototype />
    </MobileRuntime>
  );
}
