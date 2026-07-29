import {
  createContext,
  type InputHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type PropsWithChildren,
  type Ref,
  type TextareaHTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "motion/react";
import { mobileAssets } from "./assets";
import { useMobileDevice } from "./Device";

type KeyboardContextValue = {
  visible: boolean;
  height: number;
  fullHeight: number;
  progress: number;
  dragOffset: number;
  isDragging: boolean;
  focusedElement: HTMLElement | null;
  setDragOffset: (offset: number) => void;
  setDragging: (dragging: boolean) => void;
  show: (element?: HTMLElement | null) => void;
  hide: () => void;
};

type KeyboardInputProps = InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>;
};

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

const nativeKeyboardMinimumShrink = 80;
const nativeTextInputTypes = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

function resolveTextEntryElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;

  const candidate = target.closest<HTMLElement>("input, textarea, [contenteditable]");
  if (!candidate) return null;

  if (candidate instanceof HTMLInputElement) {
    return !candidate.disabled &&
      !candidate.readOnly &&
      nativeTextInputTypes.has(candidate.type)
      ? candidate
      : null;
  }

  if (candidate instanceof HTMLTextAreaElement) {
    return !candidate.disabled && !candidate.readOnly ? candidate : null;
  }

  return candidate.isContentEditable ? candidate : null;
}

function getVisualViewportBottom() {
  const viewport = window.visualViewport;
  return viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
}

export function KeyboardProvider({ children, native = false }: PropsWithChildren<{ native?: boolean }>) {
  const { device } = useMobileDevice();
  const [simulatedVisible, setSimulatedVisible] = useState(false);
  const [nativeMetrics, setNativeMetrics] = useState({ visible: false, height: 0 });
  const [dragOffset, setRawDragOffset] = useState(0);
  const [isDragging, setDragging] = useState(false);
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const focusedElementRef = useRef<HTMLElement | null>(null);
  const nativeSessionBaselineRef = useRef(0);
  const nativeMeasureFrameRef = useRef<number | null>(null);
  const nativeBlurTimerRef = useRef<number | null>(null);
  const visible = native ? nativeMetrics.visible : simulatedVisible;
  const fullHeight = native ? nativeMetrics.height : device.geometry.keyboard.height;

  const measureNativeKeyboard = useCallback(() => {
    if (!native) return;

    const currentFocus = resolveTextEntryElement(document.activeElement);
    if (!currentFocus || currentFocus !== focusedElementRef.current) {
      setNativeMetrics({ visible: false, height: 0 });
      return;
    }

    const visualBottom = getVisualViewportBottom();
    const baseline = nativeSessionBaselineRef.current;
    const shrink = Math.max(0, baseline - visualBottom);
    const overlapsLayoutViewport = Math.max(0, window.innerHeight - visualBottom);
    const isVisible = shrink >= nativeKeyboardMinimumShrink;

    setNativeMetrics({
      visible: isVisible,
      height: isVisible ? Math.round(overlapsLayoutViewport) : 0,
    });
  }, [native]);

  const queueNativeMeasurement = useCallback(() => {
    if (!native) return;
    if (nativeMeasureFrameRef.current !== null) {
      window.cancelAnimationFrame(nativeMeasureFrameRef.current);
    }
    nativeMeasureFrameRef.current = window.requestAnimationFrame(() => {
      nativeMeasureFrameRef.current = null;
      measureNativeKeyboard();
    });
  }, [measureNativeKeyboard, native]);

  const beginNativeFocusSession = useCallback((element: HTMLElement) => {
    if (focusedElementRef.current === null) {
      nativeSessionBaselineRef.current = Math.max(
        window.innerHeight,
        getVisualViewportBottom(),
      );
    }
    focusedElementRef.current = element;
    setFocusedElement(element);
    queueNativeMeasurement();
  }, [queueNativeMeasurement]);

  const clearNativeFocusSession = useCallback(() => {
    focusedElementRef.current = null;
    setFocusedElement(null);
    setNativeMetrics({ visible: false, height: 0 });
    nativeSessionBaselineRef.current = Math.max(
      window.innerHeight,
      getVisualViewportBottom(),
    );
  }, []);

  useEffect(() => {
    if (!native) return;

    nativeSessionBaselineRef.current = Math.max(window.innerHeight, getVisualViewportBottom());

    const handleFocusIn = (event: FocusEvent) => {
      const element = resolveTextEntryElement(event.target);
      if (element) {
        if (nativeBlurTimerRef.current !== null) {
          window.clearTimeout(nativeBlurTimerRef.current);
          nativeBlurTimerRef.current = null;
        }
        beginNativeFocusSession(element);
        return;
      }
      clearNativeFocusSession();
    };
    const handleFocusOut = () => {
      if (nativeBlurTimerRef.current !== null) {
        window.clearTimeout(nativeBlurTimerRef.current);
      }
      nativeBlurTimerRef.current = window.setTimeout(() => {
        nativeBlurTimerRef.current = null;
        const nextElement = resolveTextEntryElement(document.activeElement);
        if (nextElement) {
          beginNativeFocusSession(nextElement);
        } else {
          clearNativeFocusSession();
        }
      }, 0);
    };
    const handleViewportChange = () => {
      if (focusedElementRef.current) {
        queueNativeMeasurement();
      } else {
        nativeSessionBaselineRef.current = Math.max(
          window.innerHeight,
          getVisualViewportBottom(),
        );
      }
    };
    const handleOrientationChange = () => {
      nativeSessionBaselineRef.current = Math.max(
        window.innerHeight,
        getVisualViewportBottom(),
      );
      setNativeMetrics({ visible: false, height: 0 });
      if (focusedElementRef.current) queueNativeMeasurement();
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleOrientationChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
      if (nativeMeasureFrameRef.current !== null) {
        window.cancelAnimationFrame(nativeMeasureFrameRef.current);
      }
      if (nativeBlurTimerRef.current !== null) {
        window.clearTimeout(nativeBlurTimerRef.current);
      }
    };
  }, [
    beginNativeFocusSession,
    clearNativeFocusSession,
    native,
    queueNativeMeasurement,
  ]);

  const setDragOffset = (offset: number) => {
    setRawDragOffset(Math.max(0, Math.min(fullHeight, offset)));
  };

  const show = useCallback((element?: HTMLElement | null) => {
    setRawDragOffset(0);
    setDragging(false);
    const nextElement = element ?? null;
    if (native) {
      if (nextElement && resolveTextEntryElement(nextElement)) {
        beginNativeFocusSession(nextElement);
      }
      return;
    }
    focusedElementRef.current = nextElement;
    setFocusedElement(nextElement);
    setSimulatedVisible(true);
  }, [beginNativeFocusSession, native]);

  const hide = useCallback(() => {
    focusedElementRef.current?.blur();
    setDragging(false);
    if (native) {
      clearNativeFocusSession();
      return;
    }
    focusedElementRef.current = null;
    setFocusedElement(null);
    setSimulatedVisible(false);
  }, [clearNativeFocusSession, native]);

  const value = useMemo<KeyboardContextValue>(
    () => ({
      visible,
      height: visible ? Math.max(0, fullHeight - dragOffset) : 0,
      fullHeight,
      dragOffset,
      isDragging,
      progress: visible ? 1 : 0,
      focusedElement,
      setDragOffset,
      setDragging,
      show,
      hide,
    }),
    [dragOffset, focusedElement, fullHeight, hide, isDragging, show, visible],
  );

  return <KeyboardContext.Provider value={value}>{children}</KeyboardContext.Provider>;
}

export function useKeyboard() {
  const context = useContext(KeyboardContext);

  if (!context) {
    throw new Error("useKeyboard must be used inside KeyboardProvider");
  }

  return context;
}

export function useKeyboardInsets() {
  const keyboard = useKeyboard();
  const { device } = useMobileDevice();
  const reservesAndroidNavigation = device.platform === "android" && !keyboard.visible;

  return {
    keyboardHeight: keyboard.height,
    keyboardFullHeight: keyboard.fullHeight,
    keyboardDragging: keyboard.isDragging,
    bottomInset: reservesAndroidNavigation
      ? 0
      : device.platform === "android"
        ? keyboard.height
        : Math.max(device.geometry.safeArea.bottom, keyboard.height),
    availableHeight:
      device.geometry.screen.height -
      keyboard.height -
      (reservesAndroidNavigation ? device.geometry.safeArea.bottom : 0),
    isKeyboardVisible: keyboard.visible,
  };
}

export function useKeyboardDismissDrag() {
  const keyboard = useKeyboard();
  const dragRef = useRef({
    pointerId: null as number | null,
    startY: 0,
    lastY: 0,
    lastTime: 0,
    velocityY: 0,
  });

  const endDismissDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be gone after pointer cancel.
    }

    const nextY = Math.max(0, event.clientY - drag.startY);
    const shouldDismiss = nextY > 76 || drag.velocityY > 0.45;
    drag.pointerId = null;

    if (shouldDismiss) {
      keyboard.setDragOffset(nextY);
      keyboard.hide();
      return;
    }

    keyboard.setDragging(false);
    keyboard.setDragOffset(0);
  };

  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (!keyboard.visible) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (
        event.target instanceof Element &&
        event.target.closest('button, input, textarea, select, a, [role="button"], [contenteditable="true"]')
      ) {
        return;
      }

      keyboard.setDragging(true);
      dragRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
        lastTime: performance.now(),
        velocityY: 0,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (drag.pointerId !== event.pointerId) return;

      const now = performance.now();
      const elapsed = Math.max(1, now - drag.lastTime);
      drag.velocityY = (event.clientY - drag.lastY) / elapsed;
      drag.lastY = event.clientY;
      drag.lastTime = now;
      keyboard.setDragOffset(Math.max(0, event.clientY - drag.startY));
    },
    onPointerUp: endDismissDrag,
    onPointerCancel: endDismissDrag,
  };
}

export function KeyboardInput(props: KeyboardInputProps) {
  const keyboard = useKeyboard();
  const { ref, ...inputProps } = props;

  return (
    <input
      {...inputProps}
      ref={ref}
      onFocus={(event) => {
        keyboard.show(event.currentTarget);
        inputProps.onFocus?.(event);
      }}
    />
  );
}

export function KeyboardTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const keyboard = useKeyboard();

  return (
    <textarea
      {...props}
      onFocus={(event) => {
        keyboard.show(event.currentTarget);
        props.onFocus?.(event);
      }}
    />
  );
}

export function KeyboardDock() {
  const keyboard = useKeyboard();
  const { device } = useMobileDevice();
  const dismissDrag = useKeyboardDismissDrag();
  const keyboardTransition = keyboard.isDragging
    ? { duration: 0 }
    : { duration: 0.26, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] };

  return (
    <motion.div
      className="keyboard-dock"
      data-platform={device.platform}
      data-testid="keyboard-dock"
      data-visible={keyboard.visible ? "true" : "false"}
      initial={{ y: keyboard.fullHeight }}
      animate={{ y: keyboard.visible ? keyboard.dragOffset : keyboard.fullHeight }}
      aria-hidden={keyboard.visible ? undefined : "true"}
      style={{ height: keyboard.fullHeight }}
      transition={keyboardTransition}
      {...dismissDrag}
    >
      <img
        className="keyboard-asset"
        src={device.platform === "android" ? mobileAssets.androidKeyboard : mobileAssets.iphoneKeyboard}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </motion.div>
  );
}
