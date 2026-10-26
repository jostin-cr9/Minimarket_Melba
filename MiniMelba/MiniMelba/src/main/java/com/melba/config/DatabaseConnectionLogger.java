package com.melba.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Al arrancar, comprueba la conexión a MySQL y la registra en el log. */
@Component
@Order(1)
public class DatabaseConnectionLogger implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConnectionLogger.class);

    private final JdbcTemplate jdbc;

    public DatabaseConnectionLogger(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            log.info("Conexión a MySQL correcta");
        } catch (Exception e) {
            log.error("No se pudo conectar a MySQL: {}", e.getMessage());
        }
    }
}