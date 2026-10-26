package com.melba.model;

import java.math.BigDecimal;

/** Tabla sale_items. */
public record SaleItem(
        Long id,
        Long saleId,
        Long productId,
        String productName,
        int quantity,
        BigDecimal unitPrice) {
}