package com.melba.service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Conversiones de datos del cuerpo JSON que imitan las validaciones de Node. */
final class RequestParsing {

    private RequestParsing() {
    }

    /** Equivale a Number(valor); devuelve null si el resultado sería NaN. */
    static BigDecimal toNumber(Object value) {
        if (value instanceof Number n) {
            try {
                return new BigDecimal(n.toString());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (value instanceof String s) {
            String text = s.strip();
            if (text.isEmpty()) return BigDecimal.ZERO;
            try {
                return new BigDecimal(text);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    /** Número entero exacto, o null (equivale a Number.isInteger(Number(valor))). */
    static Long toInteger(Object value) {
        BigDecimal number = toNumber(value);
        if (number == null) return null;
        try {
            return number.longValueExact();
        } catch (ArithmeticException e) {
            return null;
        }
    }

    /** Agrupa los ítems {productId, quantity} sumando repetidos. Devuelve null si algún dato es inválido. */
    static Map<Long, Integer> normalizeItems(List<?> items) {
        Map<Long, Integer> normalized = new LinkedHashMap<>();
        for (Object item : items) {
            if (!(item instanceof Map<?, ?> map)) return null;
            Long productId = toInteger(map.get("productId"));
            Long quantity = toInteger(map.get("quantity"));
            if (productId == null || productId < 1 || quantity == null || quantity < 1 || quantity > 10000) {
                return null;
            }
            normalized.merge(productId, quantity.intValue(), Integer::sum);
        }
        return normalized;
    }
}