package com.melba.model;

import com.fasterxml.jackson.annotation.JsonValue;

public enum OrderStatus {
    PENDIENTE("pendiente"),
    ARMADO("armado"),
    COMPLETADO("completado"),
    CANCELADO("cancelado");

    private final String value;

    OrderStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    /** Devuelve null si el texto no corresponde a ningún estado. */
    public static OrderStatus fromValue(String value) {
        for (OrderStatus s : values()) {
            if (s.value.equals(value)) return s;
        }
        return null;
    }
}