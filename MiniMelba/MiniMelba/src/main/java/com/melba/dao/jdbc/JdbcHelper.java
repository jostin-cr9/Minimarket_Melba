package com.melba.dao.jdbc;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;

/** Utilidades compartidas por los DAO JDBC. */
final class JdbcHelper {

    private JdbcHelper() {
    }

    /** Ejecuta un INSERT de PostgreSQL y devuelve el id generado. */
    static long insertReturningId(JdbcTemplate jdbc, String sql, Object... params) {
        Long id = jdbc.queryForObject(sql + " RETURNING id", Long.class, params);
        if (id == null) throw new IllegalStateException("PostgreSQL no devolvió el ID generado.");
        return id;
    }

    static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
