package com.melba.security;

import com.melba.dao.UserDao;
import com.melba.model.Role;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea un usuario administrador y cierra la aplicación.
 * Solo actúa si se ejecuta con --create-admin (ver instrucciones de uso).
 */
@Component
@Order(3)
public class CreateAdminRunner implements ApplicationRunner {

    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9_.-]{3,50}$");

    private final UserDao userDao;
    private final PasswordEncoder encoder;
    private final ConfigurableApplicationContext context;
    private final BufferedReader console = new BufferedReader(new InputStreamReader(System.in));

    public CreateAdminRunner(UserDao userDao, PasswordEncoder encoder, ConfigurableApplicationContext context) {
        this.userDao = userDao;
        this.encoder = encoder;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!args.containsOption("create-admin")) return;

        int exitCode = 0;
        try {
            String name = read(args, "admin-name", "Nombre del administrador: ");
            String username = read(args, "admin-user", "Usuario: ").toLowerCase(Locale.ROOT);
            String password = read(args, "admin-password", "Contraseña (mínimo 8 caracteres): ");

            if (name.isEmpty() || !USERNAME.matcher(username).matches() || password.length() < 8) {
                throw new IllegalArgumentException("Datos no válidos. Revisa nombre, usuario y contraseña.");
            }
            userDao.create(name, username, encoder.encode(password), Role.ADMIN);
            System.out.println("Administrador " + username + " creado.");
        } catch (DuplicateKeyException e) {
            System.err.println("Ese usuario ya existe.");
            exitCode = 1;
        } catch (Exception e) {
            System.err.println(e.getMessage());
            exitCode = 1;
        }

        int code = exitCode;
        System.exit(SpringApplication.exit(context, () -> code));
    }

    /** Toma el valor de la opción --nombre=valor; si no viene, lo pide por consola. */
    private String read(ApplicationArguments args, String option, String prompt) {
        List<String> values = args.getOptionValues(option);
        if (values != null && !values.isEmpty()) return values.get(0).trim();
        try {
            System.out.print(prompt);
            String line = console.readLine();
            if (line == null) throw new IllegalStateException("No se pudo leer el dato. Usa --" + option + "=valor");
            return line.trim();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo leer el dato. Usa --" + option + "=valor");
        }
    }
}