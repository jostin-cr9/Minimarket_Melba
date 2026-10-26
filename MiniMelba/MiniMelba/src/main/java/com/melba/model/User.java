package com.melba.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;

/** Tabla users. El hash de la clave nunca se envía en el JSON. */
public record User(
        Long id,
        String name,
        String username,
        @JsonIgnore String passwordHash,
        Role role,
        boolean active,
        Instant createdAt) {
}