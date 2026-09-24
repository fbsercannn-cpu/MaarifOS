import ctypes
import time
from PIL import ImageGrab

user32 = ctypes.windll.user32
h_winsta = user32.OpenWindowStationW('winsta0', False, 0x00020000 | 0x000F037F)
if h_winsta: user32.SetProcessWindowStation(h_winsta)
h_desk = user32.OpenDesktopW('default', 0, False, 0x01FF)
if h_desk: user32.SetThreadDesktop(h_desk)

# First click "Kabul Et" on the cookie banner to dismiss it!
# Looking at the image: "Kabul Et" button is around x=850, y=905
print("Clicking Kabul Et on cookie banner...")
user32.SetCursorPos(850, 905)
time.sleep(0.1)
user32.mouse_event(2, 0, 0, 0, 0) # MOUSEEVENTF_LEFTDOWN
time.sleep(0.05)
user32.mouse_event(4, 0, 0, 0, 0) # MOUSEEVENTF_LEFTUP
time.sleep(0.5)

# Now scroll down
user32.SetCursorPos(500, 500)
for _ in range(6):
    user32.mouse_event(0x0800, 0, 0, -120, 0) # MOUSEEVENTF_WHEEL, scroll down
    time.sleep(0.1)

time.sleep(1.0)
img = ImageGrab.grab()
out_path = r"C:\Users\Asus\.gemini\antigravity\brain\b3555101-a26c-4830-8426-867ed4aa4195\godaddy_records_table.png"
img.save(out_path)
print("Saved table screenshot to:", out_path)
