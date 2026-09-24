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
                if 'Alan Ad' in b.value or 'maarifos' in b.value or 'GoDaddy' in b.value:
                    found.append(hwnd)
        return True
    WNDENUM = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumDesktopWindows(h_desk, WNDENUM(handler), 0)
    return found[0] if found else None

hwnd = find_chrome()
user32.ShowWindow(hwnd, 3)
user32.SetForegroundWindow(hwnd)
time.sleep(0.3)

# 1. Put URL in clipboard
target_url = "https://dcc.godaddy.com/control/portfolio/maarifos.net/settings?tab=dns"
subprocess.run(['powershell', '-Command', f'Set-Clipboard -Value "{target_url}"'], check=True)

# 2. Ctrl+L to focus address bar
VK_CONTROL = 0x11
VK_L = 0x4C
VK_V = 0x56
VK_RETURN = 0x0D

user32.keybd_event(VK_CONTROL, 0, 0, 0)
user32.keybd_event(VK_L, 0, 0, 0)
time.sleep(0.05)
user32.keybd_event(VK_L, 0, 2, 0)
user32.keybd_event(VK_CONTROL, 0, 2, 0)
time.sleep(0.2)

# 3. Ctrl+V to paste URL
user32.keybd_event(VK_CONTROL, 0, 0, 0)
user32.keybd_event(VK_V, 0, 0, 0)
time.sleep(0.05)
user32.keybd_event(VK_V, 0, 2, 0)
user32.keybd_event(VK_CONTROL, 0, 2, 0)
time.sleep(0.2)

# 4. Press Enter
user32.keybd_event(VK_RETURN, 0, 0, 0)
time.sleep(0.05)
user32.keybd_event(VK_RETURN, 0, 2, 0)

time.sleep(4.0)
img = ImageGrab.grab()
out_path = r"C:\Users\Asus\.gemini\antigravity\brain\b3555101-a26c-4830-8426-867ed4aa4195\godaddy_net_page.png"
img.save(out_path)
print("Saved maarifos.net page screenshot to:", out_path)
