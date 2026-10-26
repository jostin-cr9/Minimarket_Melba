package com.melba.dao;

import java.math.BigDecimal;
import java.util.List;

public interface SaleDao {

    long insert(String transactionCode, long sellerId, String customerName, String paymentMethod, BigDecimal total);

    void insertItem(long saleId, long productId, String productName, int quantity, BigDecimal unitPrice);

    /** Últimas 500 ventas con el usuario del vendedor (panel admin). */
    List<Rows.SaleRow> findAll();
}