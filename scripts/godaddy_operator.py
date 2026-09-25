import ctypes
import time
import subprocess
from ctypes import wintypes
from PIL import ImageGrab

user32 = ctypes.windll.user32

def attach_desktop():
    h_winsta = user32.OpenWindowStationW('winsta0', False, 0x00020000 | 0x000F037F)
    if h_winsta: user32.SetProcessWindowStation(h_winsta)
    h_desk = user32.OpenDesktopW('default', 0, False, 0x01FF)
    if h_desk: user32.SetThreadDesktop(h_desk)
    return h_desk

def find_chrome():
    h_desk = attach_desktop()
    found = []
    def handler(hwnd, extra):
        if user32.IsWindowVisible(hwnd):
            l = user32.GetWindowTextLengthW(hwnd)
            if l > 0:
                b = ctypes.create_unicode_buffer(l + 1)
                user32.GetWindowTextW(hwnd, b, l + 1)
                if 'Alan Ad' in b.value or 'maarifos.com' in b.value or 'GoDaddy' in b.value:
                    found.append((hwnd, b.value))
        return True
    WNDENUM = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumDesktopWindows(h_desk, WNDENUM(handler), 0)
    return found[0][0] if found else None

def activate_chrome():
    hwnd = find_chrome()
    if hwnd:
        user32.ShowWindow(hwnd, 3) # SW_MAXIMIZE
        user32.SetForegroundWindow(hwnd)
        time.sleep(0.3)
    return hwnd

def grab_screen(name):
    attach_desktop()
    activate_chrome()
    time.sleep(0.2)
    img = ImageGrab.grab()
    path = rf"C:\Users\Asus\.gemini\antigravity\brain\b3555101-a26c-4830-8426-867ed4aa4195\{name}.png"
    img.save(path)
    print(f"Screenshot saved: {path}")
    return path

if __name__ == "__main__":
    grab_screen("current_godaddy_state")
