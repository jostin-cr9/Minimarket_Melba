package pe.minimelba.common;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class SessionAccess {
    public SessionUser requireUser(HttpSession session) {
        Object user = session == null ? null : session.getAttribute("user");
        if (user instanceof SessionUser sessionUser) return sessionUser;
        throw ApiException.unauthorized("Inicia sesión para continuar.");
    }

    public SessionUser requireRole(HttpSession session, String... roles) {
        SessionUser user = requireUser(session);
        if (Arrays.stream(roles).noneMatch(user.role()::equals)) {
            throw ApiException.forbidden("No tienes permiso para esta acción.");
        }
        return user;
    }
}
