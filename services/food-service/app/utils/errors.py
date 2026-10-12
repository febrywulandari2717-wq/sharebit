from flask import jsonify
from werkzeug.exceptions import HTTPException


class AppError(Exception):
    def __init__(self, code, message, status=400, details=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details

    def to_response(self):
        body = {"error": {"code": self.code, "message": self.message}}
        if self.details:
            body["error"]["details"] = self.details
        return jsonify(body), self.status


def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(e):
        return e.to_response()

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        return (
            jsonify({"error": {"code": e.name.upper().replace(" ", "_"), "message": e.description}}),
            e.code,
        )

    @app.errorhandler(Exception)
    def handle_generic_error(e):
        app.logger.exception("Unhandled error: %s", e)
        return jsonify({"error": {"code": "INTERNAL_ERROR", "message": "Terjadi kesalahan pada server."}}), 500
