package com.melba.model;

import java.math.BigDecimal;
import java.time.Instant;

/** Tabla sales. */
public record Sale(
        Long id,
        String transactionCode,
        Long sellerId,
        String customerName,
        String paymentMethod,
        BigDecimal total,
        Instant createdAt) {
}