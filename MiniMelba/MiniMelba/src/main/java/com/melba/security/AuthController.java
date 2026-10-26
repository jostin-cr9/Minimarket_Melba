package com.melba.security;

import com.melba.dao.UserDao;
import com.melba.exception.ApiException;
import com.melba.model.Role;
import com.melba.model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private static final Pattern USERNAME = Pattern.compile("^[a-zA-Z0-9_.-]{3,50}$");

    private final UserDao userDao;
    private final PasswordEncoder encoder;
    private final AuthRateLimiter limiter;

    public AuthController(UserDao userDao, PasswordEncoder encoder, AuthRateLimiter limiter) {
        this.userDao = userDao;
        this.encoder = encoder;
        this.limiter = limiter;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        limiter.check(request);
        Map<String, Object> data = body == null ? Map.of() : body;

        String name = asString(data.get("name"));
        String username = asString(data.get("username"));
        String password = asString(data.get("password"));
        String roleText = asString(data.get("role"));

        if (name == null || name.isBlank() || name.length() > 120
                || username == null || !USERNAME.matcher(username).matches()
                || password == null || password.length() < 8 || password.length() > 200) {
            throw new ApiException(400, "Revisa los datos. La contraseña debe tener 8 caracteres como mínimo.");
        }
        Role role = roleText == null ? null : Role.fromValue(roleText);
        if (role != Role.COMPRADOR && role != Role.VENDEDOR) {
            throw new ApiException(400, "El rol elegido no se puede registrar desde la página pública.");
        }

        String passwordHash = encoder.encode(password);
        String cleanName = name.strip();
        String cleanUsername = username.strip().toLowerCase(Locale.ROOT);
        long id;
        try {
            id = userDao.create(cleanName, cleanUsername, passwordHash, role);
        } catch (DuplicateKeyException e) {
            throw new ApiException(409, "Ese nombre de usuario ya está registrado.");
        }

        SessionUser user = new SessionUser(id, cleanName, cleanUsername, role);
        startSession(request, user);
        log.info("Cuenta registrada username={} role={} ip={}", user.username(), role.getValue(), request.getRemoteAddr());
        return ResponseEntity.status(201).body(Map.of("user", user));
    }

    @PostMapping("/login")
    public Map<String, Object> login(
            @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        limiter.check(request);
        Map<String, Object> data = body == null ? Map.of() : body;

        String username = text(data.get("username")).strip().toLowerCase(Locale.ROOT);
        String password = text(data.get("password"));

        Optional<User> found = userDao.findByUsername(username);
        if (found.isEmpty() || !found.get().active() || !encoder.matches(password, found.get().passwordHash())) {
            log.warn("Inicio de sesión fallido username={} ip={}",
                    username.length() > 50 ? username.substring(0, 50) : username, request.getRemoteAddr());
            throw new ApiException(401, "Usuario o contraseña incorrectos.");
        }

        SessionUser user = SessionUser.from(found.get());
        startSession(request, user);
        log.info("Inicio de sesión correcto username={} role={} ip={}",
                user.username(), user.role().getValue(), request.getRemoteAddr());
        return Map.of("user", user);
    }

    @RequireAuth
    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest request) {
        return Map.of("user", SessionUser.of(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        try {
            HttpSession session = request.getSession(false);
            if (session != null) session.invalidate();
        } catch (RuntimeException e) {
            throw new ApiException(500, "No se pudo cerrar la sesión.");
        }
        return ResponseEntity.noContent().build();
    }

    /** Regenera la sesión (evita fijación de sesión) y guarda al usuario. */
    private void startSession(HttpServletRequest request, SessionUser user) {
        HttpSession old = request.getSession(false);
        if (old != null) old.invalidate();
        request.getSession(true).setAttribute(SessionUser.ATTRIBUTE, user);
    }

    /** Devuelve el valor solo si es un texto (como el typeof === 'string' de Node). */
    private static String asString(Object value) {
        return value instanceof String s ? s : null;
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}