package com.melba.model;

import java.math.BigDecimal;

/** Tabla products (campos tal como los devolvía /api/products). */
public record Product(
        Long id,
        String code,
        String name,
        String category,
        String unit,
        BigDecimal price,
        int stock,
        String image) {
}