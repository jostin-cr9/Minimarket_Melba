package pe.minimelba.sale.controller;

import java.util.List;

public record SalesRequest(String transactionCode, String customerName, String paymentMethod, List<Line> items) {
    public record Line(Long productId, Integer quantity) {}
}
