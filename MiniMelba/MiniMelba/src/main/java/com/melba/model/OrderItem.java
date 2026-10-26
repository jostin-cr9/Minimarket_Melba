package com.melba.model;

import java.math.BigDecimal;

/** Ítem de pedido (campos tal como los devolvía /api/orders). */
public record OrderItem(
        Long orderId,
        Long productId,
        String name,
        String unit,
        int quantity,
        BigDecimal price) {
}