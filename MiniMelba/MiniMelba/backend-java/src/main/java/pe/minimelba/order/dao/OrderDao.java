package pe.minimelba.order.dao;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.*;
import java.util.stream.Collectors;

@Repository
public class OrderDao implements OrderRepository {
    private final JdbcTemplate jdbc;
    public OrderDao(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override public long insert(long buyerId, String customer, String delivery, String address, String payment, java.math.BigDecimal total) {
        KeyHolder key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("INSERT INTO orders " +
                    "(order_code,buyer_id,customer_name,delivery_type,address,payment_method,total) VALUES (?,?,?,?,?,?,?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, UUID.randomUUID().toString()); ps.setLong(2, buyerId); ps.setString(3, customer);
            ps.setString(4, delivery); ps.setString(5, address); ps.setString(6, payment); ps.setBigDecimal(7, total);
            return ps;
        }, key);
        long id = key.getKey().longValue();
        jdbc.update("UPDATE orders SET order_code=CONCAT('PED-',LPAD(id,4,'0')) WHERE id=?", id);
        return id;
    }

    @Override public void insertItem(long orderId, long productId, String productName, String unit, int quantity, java.math.BigDecimal price) {
        jdbc.update("INSERT INTO order_items (order_id,product_id,product_name,unit,quantity,unit_price) VALUES (?,?,?,?,?,?)",
                orderId, productId, productName, unit, quantity, price);
    }

    @Override public List<Map<String, Object>> findAll(Long buyerId, String status) {
        StringBuilder sql = new StringBuilder("SELECT id,order_code AS code,customer_name AS customer,delivery_type AS delivery," +
                "address,payment_method AS payment,total,status,created_at AS createdAt FROM orders WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (buyerId != null) { sql.append(" AND buyer_id=?"); args.add(buyerId); }
        if (status != null && !status.isBlank()) { sql.append(" AND status=?"); args.add(status); }
        sql.append(" ORDER BY created_at DESC LIMIT 200");
        List<Map<String, Object>> orders = jdbc.queryForList(sql.toString(), args.toArray());
        if (orders.isEmpty()) return orders;
        String marks = orders.stream().map(o -> "?").collect(Collectors.joining(","));
        Object[] ids = orders.stream().map(o -> o.get("id")).toArray();
        List<Map<String, Object>> items = jdbc.queryForList("SELECT order_id AS orderId,product_id AS productId, " +
                "product_name AS name,unit,quantity,unit_price AS price FROM order_items WHERE order_id IN (" + marks + ")", ids);
        Map<Object, List<Map<String, Object>>> grouped = items.stream().collect(Collectors.groupingBy(i -> i.get("orderId")));
        orders.forEach(o -> o.put("items", grouped.getOrDefault(o.get("id"), List.of())));
        return orders;
    }

    @Override public Map<String, Object> findByIdForUpdate(long id) {
        return jdbc.query("SELECT id,order_code AS orderCode,customer_name AS customerName,payment_method AS paymentMethod," +
                        "total,status FROM orders WHERE id=? FOR UPDATE", rs -> rs.next() ? mapRow(rs) : null, id);
    }

    private Map<String, Object> mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Map<String,Object> row = new HashMap<>();
        row.put("id", rs.getLong("id")); row.put("orderCode", rs.getString("orderCode"));
        row.put("customerName", rs.getString("customerName")); row.put("paymentMethod", rs.getString("paymentMethod"));
        row.put("total", rs.getBigDecimal("total")); row.put("status", rs.getString("status")); return row;
    }

    @Override public List<Map<String, Object>> findItems(long orderId) {
        return jdbc.queryForList("SELECT product_id AS productId,product_name AS productName,unit,quantity,unit_price AS unitPrice " +
                "FROM order_items WHERE order_id=?", orderId);
    }

    @Override public void updateStatus(long id, String status, long sellerId, Long saleId) {
        jdbc.update("UPDATE orders SET status=?,seller_id=?,sale_id=COALESCE(?,sale_id) WHERE id=?", status, sellerId, saleId, id);
    }

    @Override public boolean cancelPending(long id, long buyerId) {
        return jdbc.update("UPDATE orders SET status='cancelado' WHERE id=? AND buyer_id=? AND status='pendiente'", id, buyerId) == 1;
    }

    @Override public Optional<String> findStatusByBuyer(long id, long buyerId) {
        return jdbc.query("SELECT status FROM orders WHERE id=? AND buyer_id=?", rs -> rs.next() ? Optional.of(rs.getString(1)) : Optional.empty(), id, buyerId);
    }
}
