import ctypes
import time
import subprocess
from PIL import ImageGrab

user32 = ctypes.windll.user32
h_winsta = user32.OpenWindowStationW('winsta0', False, 0x00020000 | 0x000F037F)
if h_winsta: user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW('default', 0, False, 0x01FF)
if h_desk: user32.SetThreadDesktop(h_desk)

def find_chrome():
    found = []
    def handler(hwnd, extra):
        if user32.IsWindowVisible(hwnd):
            l = user32.GetWindowTextLengthW(hwnd)
            if l > 0:
                b = ctypes.create_unicode_buffer(l + 1)
                user32.GetWindowTextW(hwnd, b, l + 1)
                if 'Alan Ad' in b.value or 'maarifos' in b.value:
                    found.append(hwnd)
        return True
    WNDENUM = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumDesktopWindows(h_desk, WNDENUM(handler), 0)
    return found[0] if found else None

hwnd = find_chrome()
if not hwnd:
    print('Chrome not found!')
    exit(1)

user32.ShowWindow(hwnd, 3)
user32.SetForegroundWindow(hwnd)
time.sleep(0.3)

# 1. Click 'Yönlendirme ekle' at (1655, 640)
print('Clicking Yönlendirme ekle at (1655, 640)...')
user32.SetCursorPos(1655, 640)
time.sleep(0.1)
user32.mouse_event(2, 0, 0, 0, 0)
time.sleep(0.05)
user32.mouse_event(4, 0, 0, 0, 0)
time.sleep(1.5)

# 2. Click in Hedef URL input box at (840, 430)
print('Clicking in Hedef URL at (840, 430)...')
user32.SetCursorPos(840, 430)
time.sleep(0.1)
user32.mouse_event(2, 0, 0, 0, 0)
time.sleep(0.05)
user32.mouse_event(4, 0, 0, 0, 0)
time.sleep(0.3)

# 3. Put 'www.maarifos.com' in clipboard
subprocess.run(['powershell', '-Command', 'Set-Clipboard -Value "www.maarifos.com"'], check=True)

# 4. Ctrl+A then Ctrl+V
VK_CONTROL = 0x11
VK_A = 0x41
VK_V = 0x56

user32.keybd_event(VK_CONTROL, 0, 0, 0)
time.sleep(0.05)
user32.keybd_event(VK_A, 0, 0, 0)
time.sleep(0.05)
user32.keybd_event(VK_A, 0, 2, 0)
time.sleep(0.05)

user32.keybd_event(VK_V, 0, 0, 0)
time.sleep(0.05)
user32.keybd_event(VK_V, 0, 2, 0)
time.sleep(0.05)
user32.keybd_event(VK_CONTROL, 0, 2, 0)

time.sleep(1.0)

img = ImageGrab.grab()
out_path = r'C:\Users\Asus\.gemini\antigravity\brain\b3555101-a26c-4830-8426-867ed4aa4195\after_typing_target_url.png'
img.save(out_path)
print('Saved after_typing_target_url.png')
