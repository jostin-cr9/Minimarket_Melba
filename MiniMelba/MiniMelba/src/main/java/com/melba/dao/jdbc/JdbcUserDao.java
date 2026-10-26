package com.melba.dao.jdbc;

import com.melba.dao.UserDao;
import com.melba.model.Role;
import com.melba.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcUserDao implements UserDao {

    private final JdbcTemplate jdbc;

    public JdbcUserDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<User> findByUsername(String username) {
        List<User> rows = jdbc.query(
                "SELECT id, name, username, role, password_hash, active FROM users WHERE username = ? LIMIT 1",
                (rs, i) -> new User(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getString("username"),
                        rs.getString("password_hash"),
                        Role.fromValue(rs.getString("role")),
                        rs.getBoolean("active"),
                        null),
                username);
        return rows.stream().findFirst();
    }

    @Override
    public long create(String name, String username, String passwordHash, Role role) {
        return JdbcHelper.insertReturningId(jdbc,
                "INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)",
                name, username, passwordHash, role.getValue());
    }

    @Override
    public List<User> findAll() {
        return jdbc.query(
                "SELECT id, name, username, role, active, created_at FROM users ORDER BY created_at DESC",
                (rs, i) -> new User(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getString("username"),
                        null,
                        Role.fromValue(rs.getString("role")),
                        rs.getBoolean("active"),
                        JdbcHelper.instant(rs.getTimestamp("created_at"))));
    }
}