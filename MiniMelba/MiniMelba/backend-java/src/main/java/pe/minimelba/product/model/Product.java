package pe.minimelba.product.model;

import java.math.BigDecimal;

public record Product(
        Long id,
        String code,
        String name,
        String category,
        String unit,
        BigDecimal price,
        int stock,
        String image
) {}
