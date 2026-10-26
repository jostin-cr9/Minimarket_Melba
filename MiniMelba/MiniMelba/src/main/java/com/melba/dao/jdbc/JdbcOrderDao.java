package com.melba.dao.jdbc;

import com.melba.dao.OrderDao;
import com.melba.dao.Rows;
import com.melba.model.Order;
import com.melba.model.OrderItem;
import com.melba.model.OrderStatus;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcOrderDao implements OrderDao {

    private static final RowMapper<OrderItem> ITEM_MAPPER = (rs, i) -> new OrderItem(
            rs.getLong("orderId"),
            rs.getLong("productId"),
            rs.getString("name"),
            rs.getString("unit"),
            rs.getInt("quantity"),
            rs.getBigDecimal("price"));

    private final JdbcTemplate jdbc;

    public JdbcOrderDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public long insert(long buyerId, String customerName, String delivery, String address,
                       String paymentMethod, BigDecimal total) {
        long id = JdbcHelper.insertReturningId(jdbc,
                "INSERT INTO orders (order_code, buyer_id, customer_name, delivery_type, address, payment_method, total) VALUES (?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(), buyerId, customerName, delivery, address, paymentMethod, total);
        jdbc.update("UPDATE orders SET order_code = 'PED-' || LPAD(id::text, 4, '0'), updated_at=CURRENT_TIMESTAMP WHERE id = ?", id);
        return id;
    }

    @Override
    public void insertItem(long orderId, long productId, String productName, String unit,
                           int quantity, BigDecimal unitPrice) {
        jdbc.update(
                "INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)",
                orderId, productId, productName, unit, quantity, unitPrice);
    }

    @Override
    public List<Order> findAll(Long buyerId, OrderStatus status) {
        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        if (buyerId != null) {
            conditions.add("buyer_id = ?");
            params.add(buyerId);
        }
        if (status != null) {
            conditions.add("status = ?");
            params.add(status.getValue());
        }
        String where = conditions.isEmpty() ? "" : "WHERE " + String.join(" AND ", conditions);

        List<Order> orders = jdbc.query(
                "SELECT id, order_code, customer_name, delivery_type, address, payment_method, total, status, created_at "
                        + "FROM orders " + where + " ORDER BY created_at DESC LIMIT 200",
                (rs, i) -> new Order(
                        rs.getLong("id"),
                        rs.getString("order_code"),
                        rs.getString("customer_name"),
                        rs.getString("delivery_type"),
                        rs.getString("address"),
                        rs.getString("payment_method"),
                        rs.getBigDecimal("total"),
                        OrderStatus.fromValue(rs.getString("status")),
                        JdbcHelper.instant(rs.getTimestamp("created_at")),
                        List.of()),
                params.toArray());
        return attachItems(orders);
    }

    /** Carga los ítems de todos los pedidos con una sola consulta. */
    private List<Order> attachItems(List<Order> orders) {
        if (orders.isEmpty()) return orders;

        String placeholders = orders.stream().map(o -> "?").collect(Collectors.joining(","));
        List<OrderItem> items = jdbc.query(
                "SELECT order_id AS orderId, product_id AS productId, product_name AS name, unit, quantity, unit_price AS price "
                        + "FROM order_items WHERE order_id IN (" + placeholders + ")",
                ITEM_MAPPER,
                orders.stream().map(Order::id).toArray());

        Map<Long, List<OrderItem>> byOrder = new HashMap<>();
        for (OrderItem item : items) {
            byOrder.computeIfAbsent(item.orderId(), k -> new ArrayList<>()).add(item);
        }
        return orders.stream()
                .map(o -> o.withItems(byOrder.getOrDefault(o.id(), Collections.emptyList())))
                .toList();
    }

    @Override
    public Optional<Rows.OrderForUpdate> findByIdForUpdate(long id) {
        return jdbc.query(
                "SELECT id, order_code, customer_name, payment_method, total, status FROM orders WHERE id=? FOR UPDATE",
                (rs, i) -> new Rows.OrderForUpdate(
                        rs.getLong("id"),
                        rs.getString("order_code"),
                        rs.getString("customer_name"),
                        rs.getString("payment_method"),
                        rs.getBigDecimal("total"),
                        OrderStatus.fromValue(rs.getString("status"))),
                id).stream().findFirst();
    }

    @Override
    public List<OrderItem> findItems(long orderId) {
        return jdbc.query(
                "SELECT order_id AS orderId, product_id AS productId, product_name AS name, unit, quantity, unit_price AS price "
                        + "FROM order_items WHERE order_id=?",
                ITEM_MAPPER, orderId);
    }

    @Override
    public void updateStatus(long id, OrderStatus status, long sellerId, Long saleId) {
        jdbc.update("UPDATE orders SET status=?, seller_id=?, sale_id=COALESCE(?, sale_id), updated_at=CURRENT_TIMESTAMP WHERE id=?",
                status.getValue(), sellerId, saleId, id);
    }

    @Override
    public boolean cancelPending(long id, long buyerId) {
        return jdbc.update(
                "UPDATE orders SET status = 'cancelado', updated_at=CURRENT_TIMESTAMP WHERE id = ? AND buyer_id = ? AND status = 'pendiente'",
                id, buyerId) == 1;
    }

    @Override
    public Optional<OrderStatus> findStatusByBuyer(long id, long buyerId) {
        return jdbc.queryForList("SELECT status FROM orders WHERE id = ? AND buyer_id = ?", String.class, id, buyerId)
                .stream().findFirst().map(OrderStatus::fromValue);
    }
}
