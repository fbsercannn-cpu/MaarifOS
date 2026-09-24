import ctypes
import time
import subprocess
from PIL import ImageGrab

user32 = ctypes.windll.user32
h_winsta = user32.OpenWindowStationW('winsta0', False, 0x00020000 | 0x000F037F)
if h_winsta: user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW('default', 0, False, 0x01FF)
if h_desk: user32.SetThreadDesktop(h_desk)

found_hwnd = None
def handler(hwnd, extra):
    global found_hwnd
    if user32.IsWindowVisible(hwnd):
        l = user32.GetWindowTextLengthW(hwnd)
        if l > 0:
            b = ctypes.create_unicode_buffer(l + 1)
            user32.GetWindowTextW(hwnd, b, l + 1)
            if 'Alan Ad' in b.value or 'maarifos.com' in b.value:
                found_hwnd = hwnd
    return True

WNDENUM = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
user32.EnumDesktopWindows(h_desk, WNDENUM(handler), 0)

if not found_hwnd:
    print("Chrome window not found!")
    exit(1)

user32.ShowWindow(found_hwnd, 3) # SW_MAXIMIZE
user32.SetForegroundWindow(found_hwnd)
time.sleep(0.3)

# 1. Put IP in Windows clipboard via powershell / ctypes
subprocess.run(['powershell', '-Command', 'Set-Clipboard -Value "185.199.108.153"'], check=True)

# 2. Click in Değer input box at (1250, 595)
print("Clicking in Değer box at (1250, 595)...")
user32.SetCursorPos(1250, 595)
time.sleep(0.1)
user32.mouse_event(2, 0, 0, 0, 0)
time.sleep(0.05)
user32.mouse_event(4, 0, 0, 0, 0)
time.sleep(0.2)

# 3. Ctrl+A to select all
print("Selecting all text (Ctrl+A)...")
VK_CONTROL = 0x11
VK_A = 0x41
VK_V = 0x56

user32.keybd_event(VK_CONTROL, 0, 0, 0)
time.sleep(0.05)
user32.keybd_event(VK_A, 0, 0, 0)
time.sleep(0.05)
user32.keybd_event(VK_A, 0, 2, 0)
time.sleep(0.05)

# 4. Ctrl+V to paste 185.199.108.153
print("Pasting 185.199.108.153...")
user32.keybd_event(VK_V, 0, 0, 0)
time.sleep(0.05)
user32.keybd_event(VK_V, 0, 2, 0)
time.sleep(0.05)
user32.keybd_event(VK_CONTROL, 0, 2, 0)
time.sleep(0.5)

# 5. Click Kaydet at (1610, 745)
print("Clicking Kaydet at (1610, 745)...")
user32.SetCursorPos(1610, 745)
time.sleep(0.1)
user32.mouse_event(2, 0, 0, 0, 0)
time.sleep(0.05)
user32.mouse_event(4, 0, 0, 0, 0)

time.sleep(3.0)
img = ImageGrab.grab()
out_path = r"C:\Users\Asus\.gemini\antigravity\brain\b3555101-a26c-4830-8426-867ed4aa4195\after_a_record_save.png"
img.save(out_path)
print("Saved result screenshot to:", out_path)
