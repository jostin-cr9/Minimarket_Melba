package pe.minimelba.user.dao;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import pe.minimelba.common.SessionUser;
import pe.minimelba.user.model.StoredUser;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcUserDao implements UserDao {
    private final JdbcTemplate jdbc;
    private static final RowMapper<StoredUser> STORED = (rs, row) -> new StoredUser(
            rs.getLong("id"), rs.getString("name"), rs.getString("username"), rs.getString("role"),
            rs.getString("password_hash"), rs.getBoolean("active"));

    public JdbcUserDao(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public Optional<StoredUser> findByUsername(String username) {
        return jdbc.query("SELECT id,name,username,role,password_hash,active FROM users WHERE username=? LIMIT 1",
                STORED, username).stream().findFirst();
    }

    @Override
    public long create(String name, String username, String passwordHash, String role) {
        KeyHolder key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO users (name,username,password_hash,role) VALUES (?,?,?,?)", Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name); ps.setString(2, username); ps.setString(3, passwordHash); ps.setString(4, role);
            return ps;
        }, key);
        return key.getKey().longValue();
    }

    @Override
    public List<SessionUser> findAll() {
        return jdbc.query("SELECT id,name,username,role FROM users ORDER BY created_at DESC",
                (rs, row) -> new SessionUser(rs.getLong("id"), rs.getString("name"), rs.getString("username"), rs.getString("role")));
    }
}
