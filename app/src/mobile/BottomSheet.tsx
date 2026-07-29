import { type PropsWithChildren, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useDrag } from "@use-gesture/react";
import { AnimatePresence, motion } from "motion/react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useKeyboard, useKeyboardInsets } from "./Keyboard";
import { useScreenPortal } from "./PhoneFrame";
import { useMobileDevice } from "./Device";

type BottomSheetProps = PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  snap?: number;
}>;

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  snap = 0.72,
  children,
}: BottomSheetProps) {
  const { device, native } = useMobileDevice();
  const { screenRef } = useScreenPortal();
  const keyboard = useKeyboard();
  const { keyboardHeight } = useKeyboardInsets();
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (open) keyboard.hide();
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      keyboard.hide();
    }

    onOpenChange(nextOpen);
  };

  const bindDrag = useDrag(
    (state) => {
      const [, movementY] = state.movement;
      const [, velocityY] = state.velocity;
      const [, directionY] = state.direction;
      const nextY = Math.max(0, movementY);

      if (!state.last) {
        setDragY(nextY);
        return;
      }

      const shouldClose = nextY > 96 || (velocityY > 0.55 && directionY > 0);
      setDragY(0);

      if (shouldClose) {
        onOpenChange(false);
      }
    },
    {
      axis: "y",
      filterTaps: true,
    },
  );

  const fullscreen = snap >= 0.98;
  const sheetBottom =
    native
      ? keyboardHeight
      : device.platform === "android"
      ? Math.max(device.geometry.safeArea.bottom, keyboardHeight)
      : keyboardHeight;
  const sheetHeight = Math.round(device.geometry.screen.height * snap);
  const effectiveHeight = Math.max(
    260,
    Math.min(sheetHeight, device.geometry.screen.height - sheetBottom),
  );
  const portalContainer = screenRef.current ?? undefined;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {/* Keep the portal mounted after `open` flips so AnimatePresence can run
          the sheet and overlay exit animations before Radix removes them. */}
      <Dialog.Portal container={portalContainer} forceMount>
        <AnimatePresence>
          {open ? (
            <>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="sheet-overlay"
                  data-testid="sheet-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, pointerEvents: "none" }}
                  transition={{ duration: 0.16 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount>
                <motion.div
                  className="bottom-sheet"
                  data-fullscreen={fullscreen ? "true" : "false"}
                  data-testid="bottom-sheet"
                  style={{
                    bottom: sheetBottom,
                    ...(fullscreen ? { height: effectiveHeight } : {}),
                    maxHeight: effectiveHeight,
                  }}
                  initial={{ y: effectiveHeight + 36 }}
                  animate={{ y: dragY }}
                  exit={{
                    y: effectiveHeight + 36,
                    pointerEvents: "none",
                    transition: {
                      type: "spring",
                      stiffness: 250,
                      damping: 30,
                      mass: 1.05,
                    },
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 43,
                    mass: 0.9,
                  }}
                >
                  <div className="sheet-handle-zone" data-testid="sheet-handle" {...bindDrag()}>
                    <div className="sheet-handle" />
                  </div>
                  <div className="sheet-header">
                    <div className="sheet-heading-copy">
                      <Dialog.Title className="sheet-title">{title}</Dialog.Title>
                      {description ? (
                        <Dialog.Description className="sheet-description">
                          {description}
                        </Dialog.Description>
                      ) : null}
                    </div>
                    <Dialog.Close asChild>
                      <button
                        className="sheet-close"
                        type="button"
                        aria-label={`${title} ekranını kapat`}
                      >
                        <Cross2Icon aria-hidden="true" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <div className="sheet-content">{children}</div>
                </motion.div>
              </Dialog.Content>
            </>
          ) : null}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
