import ctypes
import time
from ctypes import wintypes

user32 = ctypes.windll.user32
h_winsta = user32.OpenWindowStationW('winsta0', False, 0x00020000 | 0x000F037F)
if h_winsta:
    user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW('default', 0, False, 0x01FF)
if h_desk:
    user32.SetThreadDesktop(h_desk)

found_hwnd = None
found_title = ""

def handler(hwnd, extra):
    global found_hwnd, found_title
    if user32.IsWindowVisible(hwnd):
        l = user32.GetWindowTextLengthW(hwnd)
        if l > 0:
            b = ctypes.create_unicode_buffer(l + 1)
            user32.GetWindowTextW(hwnd, b, l + 1)
            title = b.value
            if 'Alan Ad' in title or 'maarifos.com' in title:
                found_hwnd = hwnd
                found_title = title
    return True

WNDENUM = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
user32.EnumDesktopWindows(h_desk, WNDENUM(handler), 0)

print("Found HWND:", found_hwnd)
print("Title:", found_title)

if found_hwnd:
    # Get window rect
    rect = wintypes.RECT()
    user32.GetWindowRect(found_hwnd, ctypes.byref(rect))
    print(f"Window Rect: left={rect.left}, top={rect.top}, right={rect.right}, bottom={rect.bottom}")
