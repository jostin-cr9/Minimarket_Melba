package com.melba.dao;

import com.melba.model.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;

/** Resultados de consultas que no son tablas completas. */
public final class Rows {

    private Rows() {
    }

    public record StockSummary(long productCount, long stockUnits, long saleCount, long lowStockCount) {
    }

    public record LowStockProduct(Long id, String code, String name, String category, BigDecimal price, int stock) {
    }

    public record SaleRow(Long id, String transaccion, Instant fecha, String vendedor, String cliente,
                          String pago, BigDecimal total) {
    }

    public record OrderForUpdate(Long id, String code, String customerName, String paymentMethod,
                                 BigDecimal total, OrderStatus status) {
    }

    public record ReportTotals(long ventas, BigDecimal total) {
    }

    public record TopProduct(Long productId, String producto, long unidades, BigDecimal monto) {
    }

    public record SellerTotal(Long sellerId, String vendedor, String username, long ventas, BigDecimal total) {
    }

    public record DayTotal(String dia, long ventas, BigDecimal total) {
    }

    public record ProductDetail(String codigo, String producto, long cantidad, BigDecimal total) {
    }
}