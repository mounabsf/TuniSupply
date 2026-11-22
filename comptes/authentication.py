from rest_framework.authentication import SessionAuthentication


class SessionAuthentication401(SessionAuthentication):
    """Session Django + CSRF, mais répond 401 (et non 403) quand on n'est pas connecté,
    ce qui permet au frontend de distinguer « session expirée » de « accès interdit »."""

    def authenticate_header(self, request):
        return "Session"
