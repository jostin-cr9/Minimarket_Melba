package pe.minimelba.user.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.minimelba.common.SessionAccess;
import pe.minimelba.common.SessionUser;
import pe.minimelba.common.AuthRateLimiter;
import pe.minimelba.user.service.AuthService;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final SessionAccess access;
    private final AuthRateLimiter limiter;
    public AuthController(AuthService auth, SessionAccess access, AuthRateLimiter limiter) { this.auth = auth; this.access = access; this.limiter=limiter; }
    public record RegisterBody(String name, String username, String password, String role) {}
    public record LoginBody(String username, String password) {}

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterBody body, HttpServletRequest request) {
        limiter.check(request.getRemoteAddr()+":register");
        SessionUser user = auth.register(body.name(), body.username(), body.password(), body.role());
        request.getSession(true);
        request.changeSessionId();
        request.getSession().setAttribute("user", user);
        return ResponseEntity.status(201).body(Map.of("user", user));
    }

    @PostMapping("/login")
    public Map<String, SessionUser> login(@RequestBody LoginBody body, HttpServletRequest request) {
        limiter.check(request.getRemoteAddr()+":login");
        SessionUser user = auth.login(body.username(), body.password());
        HttpSession session = request.getSession(true);
        request.changeSessionId();
        session.setAttribute("user", user);
        return Map.of("user", user);
    }

    @GetMapping("/me")
    public Map<String, SessionUser> me(HttpSession session) { return Map.of("user", access.requireUser(session)); }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return ResponseEntity.noContent().build();
    }
}
