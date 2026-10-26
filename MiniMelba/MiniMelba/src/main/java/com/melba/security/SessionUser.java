package com.melba.security;

import com.melba.model.Role;
import com.melba.model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.io.Serializable;

/** Usuario guardado en la sesión (debe ser Serializable porque la sesión va a MySQL). */
public record SessionUser(Long id, String name, String username, Role role) implements Serializable {

    private static final long serialVersionUID = 1L;
    public static final String ATTRIBUTE = "user";

    public static SessionUser from(User user) {
        return new SessionUser(user.id(), user.name(), user.username(), user.role());
    }

    /** Devuelve el usuario con sesión iniciada, o null si no hay sesión. */
    public static SessionUser of(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        return session.getAttribute(ATTRIBUTE) instanceof SessionUser user ? user : null;
    }
}