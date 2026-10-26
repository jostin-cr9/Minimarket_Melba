package com.melba.security;

import com.melba.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class AuthRateLimiter {

    private static final int LIMIT = 20;
    private static final long WINDOW_MS = 15 * 60 * 1000L;

    private record Window(long resetAt, int count) {
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    /** Cuenta la petición y lanza 429 si esa IP superó el límite de la ventana actual. */
    public void check(HttpServletRequest request) {
        long now = System.currentTimeMillis();
        windows.values().removeIf(w -> w.resetAt() <= now);

        Window window = windows.compute(request.getRemoteAddr(), (ip, current) ->
                current == null || current.resetAt() <= now
                        ? new Window(now + WINDOW_MS, 1)
                        : new Window(current.resetAt(), current.count() + 1));

        if (window.count() > LIMIT) {
            throw new ApiException(429, "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
        }
    }
}