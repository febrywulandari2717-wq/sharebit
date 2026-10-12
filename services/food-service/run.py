import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5001"))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    # use_reloader=False agar tidak menjalankan aplikasi dua kali
    app.run(host=host, port=port, debug=debug, use_reloader=False)
