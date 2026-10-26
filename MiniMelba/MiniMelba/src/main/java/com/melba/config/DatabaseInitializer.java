package com.melba.config;

import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

/** Ejecuta schema.sql (tablas y productos iniciales). Es seguro repetirlo. */
@Component
@Order(2)
public class DatabaseInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseInitializer.class);

    private final DataSource dataSource;
    private final boolean enabled;

    public DatabaseInitializer(DataSource dataSource, @Value("${app.init-db:false}") boolean enabled) {
        this.dataSource = dataSource;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        try {
            ResourceDatabasePopulator populator = new ResourceDatabasePopulator(new ClassPathResource("schema.sql"));
            populator.setSqlScriptEncoding("UTF-8");
            populator.execute(dataSource);
            log.info("Base de datos y tablas creadas. Productos iniciales listos.");
        } catch (Exception e) {
            log.error("No se pudo inicializar PostgreSQL: {}", e.getMessage());
        }
    }
}
