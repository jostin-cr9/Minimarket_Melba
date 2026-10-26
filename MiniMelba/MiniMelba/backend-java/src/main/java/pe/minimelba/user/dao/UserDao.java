package pe.minimelba.user.dao;

import pe.minimelba.common.SessionUser;
import pe.minimelba.user.model.StoredUser;
import java.util.List;
import java.util.Optional;

public interface UserDao {
    Optional<StoredUser> findByUsername(String username);
    long create(String name, String username, String passwordHash, String role);
    List<SessionUser> findAll();
}
