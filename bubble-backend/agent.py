import pygetwindow as gw
import time
from datetime import datetime

def log_activity():
    """
    Logs the title of the active window to a file named log.txt.
    """
    active_window = gw.getActiveWindow()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # We only log if there is an active window and it has a title
    if active_window is not None and active_window.title:
        log_entry = f"[{timestamp}] Active Window: {active_window.title}\n"

        # Print to console so we can see it's working
        print(log_entry, end='') 

        # Append the log to our file
        with open("log.txt", "a", encoding="utf-8") as f:
            f.write(log_entry)

    # If no window is active (e.g., user is on desktop), log that.
    elif active_window is None:
        log_entry = f"[{timestamp}] Active Window: None (Desktop)\n"
        print(log_entry, end='')
        with open("log.txt", "a", encoding="utf-8") as f:
            f.write(log_entry)

if __name__ == "__main__":
    print("🚀 Starting Smart Time Tracker Agent...")
    print("Logging activity every 5 seconds. Press Ctrl+C to stop.")
    try:
        while True:
            log_activity()
            time.sleep(5) # Logs every 5 seconds
    except KeyboardInterrupt:
        print("\n🛑 Agent stopped. Log file 'log.txt' created.")