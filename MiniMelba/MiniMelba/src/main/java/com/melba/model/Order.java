package com.melba.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Pedido (campos tal como los devolvía /api/orders). */
public record Order(
        Long id,
        String code,
        String customer,
        String delivery,
        String address,
        String payment,
        BigDecimal total,
        OrderStatus status,
        Instant createdAt,
        List<OrderItem> items) {

    /** Copia del pedido con sus ítems cargados. */
    public Order withItems(List<OrderItem> newItems) {
        return new Order(id, code, customer, delivery, address, payment, total, status, createdAt, newItems);
    }
}