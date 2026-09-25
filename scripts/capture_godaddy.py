import ctypes
import time
from ctypes import wintypes
from PIL import ImageGrab

user32 = ctypes.windll.user32
h_winsta = user32.OpenWindowStationW('winsta0', False, 0x00020000 | 0x000F037F)
if h_winsta:
    user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW('default', 0, False, 0x01FF)
if h_desk:
    user32.SetThreadDesktop(h_desk)

found_hwnd = None

def handler(hwnd, extra):
    global found_hwnd
    if user32.IsWindowVisible(hwnd):
        l = user32.GetWindowTextLengthW(hwnd)
        if l > 0:
            b = ctypes.create_unicode_buffer(l + 1)
            user32.GetWindowTextW(hwnd, b, l + 1)
            title = b.value
            if 'Alan Ad' in title or 'maarifos.com' in title:
                found_hwnd = hwnd
    return True

WNDENUM = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
user32.EnumDesktopWindows(h_desk, WNDENUM(handler), 0)

if found_hwnd:
    print("Restoring window:", found_hwnd)
    user32.ShowWindow(found_hwnd, 9) # SW_RESTORE
    user32.SetForegroundWindow(found_hwnd)
    time.sleep(1.0)
    
    img = ImageGrab.grab()
    out_path = r"C:\Users\Asus\.gemini\antigravity\brain\b3555101-a26c-4830-8426-867ed4aa4195\godaddy_screen.png"
    img.save(out_path)
    print("Screenshot saved to:", out_path)
else:
    print("Window not found!")
