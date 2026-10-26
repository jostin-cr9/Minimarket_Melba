package com.melba.model;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {
    ADMIN("admin"),
    VENDEDOR("vendedor"),
    COMPRADOR("comprador");

    private final String value;

    Role(String value) {
        this.value = value;
    }

    /** Valor tal como se guarda en MySQL y se envía en el JSON. */
    @JsonValue
    public String getValue() {
        return value;
    }

    /** Devuelve null si el texto no corresponde a ningún rol. */
    public static Role fromValue(String value) {
        for (Role r : values()) {
            if (r.value.equals(value)) return r;
        }
        return null;
    }
}