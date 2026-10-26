package pe.minimelba.order.controller;

import java.util.List;

public record OrderRequest(String delivery, String address, String payment, List<Line> items) {
    public record Line(Long productId, Integer quantity) {}
}
