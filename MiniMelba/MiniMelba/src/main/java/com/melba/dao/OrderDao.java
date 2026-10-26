package com.melba.dao;

import com.melba.model.Order;
import com.melba.model.OrderItem;
import com.melba.model.OrderStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface OrderDao {

    /** Crea el pedido y le asigna su código PED-0001. Devuelve el id. */
    long insert(long buyerId, String customerName, String delivery, String address,
                String paymentMethod, BigDecimal total);

    void insertItem(long orderId, long productId, String productName, String unit,
                    int quantity, BigDecimal unitPrice);

    /** buyerId: solo los pedidos de ese comprador (null = todos). status: solo ese estado (null = todos). */
    List<Order> findAll(Long buyerId, OrderStatus status);

    /** Bloquea el pedido (FOR UPDATE): usar solo dentro de una transacción. */
    Optional<Rows.OrderForUpdate> findByIdForUpdate(long id);

    List<OrderItem> findItems(long orderId);

    void updateStatus(long id, OrderStatus status, long sellerId, Long saleId);

    /** Solo cancela si es de ese comprador y sigue pendiente. */
    boolean cancelPending(long id, long buyerId);

    Optional<OrderStatus> findStatusByBuyer(long id, long buyerId);
}