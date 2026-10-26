package pe.minimelba.user.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import pe.minimelba.common.ApiException;
import pe.minimelba.common.SessionUser;
import pe.minimelba.user.dao.UserDao;
import pe.minimelba.user.model.StoredUser;
import java.util.List;

@Service
public class AuthService {
    private static final BCryptPasswordEncoder PASSWORDS = new BCryptPasswordEncoder(12);
    private final UserDao users;
    public AuthService(UserDao users) { this.users = users; }

    public SessionUser register(String name, String username, String password, String role) {
        if (name == null || name.isBlank() || name.length() > 120 || username == null ||
                !username.matches("[a-zA-Z0-9_.-]{3,50}") || password == null || password.length() < 8 || password.length() > 200) {
            throw ApiException.badRequest("Revisa los datos. La contraseña debe tener 8 caracteres como mínimo.");
        }
        if (role == null || !List.of("comprador", "vendedor").contains(role)) {
            throw ApiException.badRequest("El rol elegido no se puede registrar desde la página pública.");
        }
        String cleanName = name.trim();
        String cleanUsername = username.trim().toLowerCase();
        try {
            long id = users.create(cleanName, cleanUsername, PASSWORDS.encode(password), role);
            return new SessionUser(id, cleanName, cleanUsername, role);
        } catch (DuplicateKeyException e) {
            throw ApiException.conflict("Ese nombre de usuario ya está registrado.");
        }
    }

    public SessionUser login(String username, String password) {
        String cleanUsername = username == null ? "" : username.trim().toLowerCase();
        StoredUser stored = users.findByUsername(cleanUsername).orElse(null);
        if (stored == null || !stored.active() || password == null || !PASSWORDS.matches(password, stored.passwordHash())) {
            throw ApiException.unauthorized("Usuario o contraseña incorrectos.");
        }
        return new SessionUser(stored.id(), stored.name(), stored.username(), stored.role());
    }
}
