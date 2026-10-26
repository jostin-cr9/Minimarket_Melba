package com.melba.security;

import com.melba.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.annotation.Annotation;
import java.util.Arrays;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/** Revisa @RequireAuth y @RequireRole antes de ejecutar cada ruta. */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method)) return true;

        RequireRole requireRole = find(method, RequireRole.class);
        RequireAuth requireAuth = find(method, RequireAuth.class);
        if (requireRole == null && requireAuth == null) return true;

        SessionUser user = SessionUser.of(request);
        if (user == null) {
            throw new ApiException(401, "Inicia sesión para continuar.");
        }
        if (requireRole != null && !Arrays.asList(requireRole.value()).contains(user.role())) {
            throw new ApiException(403, "No tienes permiso para esta acción.");
        }
        return true;
    }

    private static <A extends Annotation> A find(HandlerMethod method, Class<A> type) {
        A annotation = method.getMethodAnnotation(type);
        return annotation != null ? annotation : method.getBeanType().getAnnotation(type);
    }
}