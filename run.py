"""
Start both the FastAPI backend and Vite frontend concurrently.
Usage: python run.py
"""
import subprocess
import sys
import os
import signal

def run():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")

    print("==================================================")
    print(" Starting BrandLens Backend & Frontend Services ")
    print("==================================================")
    print("-> FastAPI backend starting at: http://127.0.0.1:8000")
    print("-> Vite frontend starting at:  http://localhost:5173")
    print("Press Ctrl+C to stop both servers.\n")

    # Start FastAPI backend
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)

    # Start Vite frontend
    frontend_cmd = ["npm", "run", "dev"]
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir, shell=True)

    def shutdown(sig, frame):
        print("\nStopping servers...")
        try:
            frontend_proc.terminate()
        except Exception:
            pass
        try:
            backend_proc.terminate()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == "__main__":
    run()

