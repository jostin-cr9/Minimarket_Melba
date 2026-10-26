package com.melba.dao.jdbc;

import com.melba.dao.Rows;
import com.melba.dao.SaleDao;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcSaleDao implements SaleDao {

    private final JdbcTemplate jdbc;

    public JdbcSaleDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public long insert(String transactionCode, long sellerId, String customerName, String paymentMethod, BigDecimal total) {
        return JdbcHelper.insertReturningId(jdbc,
                "INSERT INTO sales (transaction_code, seller_id, customer_name, payment_method, total) VALUES (?, ?, ?, ?, ?)",
                transactionCode, sellerId, customerName, paymentMethod, total);
    }

    @Override
    public void insertItem(long saleId, long productId, String productName, int quantity, BigDecimal unitPrice) {
        jdbc.update(
                "INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
                saleId, productId, productName, quantity, unitPrice);
    }

    @Override
    public List<Rows.SaleRow> findAll() {
        return jdbc.query("""
                SELECT s.id, s.transaction_code AS transaccion, s.created_at AS fecha,
                       u.username AS vendedor, s.customer_name AS cliente, s.payment_method AS pago, s.total
                FROM sales s JOIN users u ON u.id = s.seller_id
                ORDER BY s.created_at DESC LIMIT 500
                """,
                (rs, i) -> new Rows.SaleRow(
                        rs.getLong("id"),
                        rs.getString("transaccion"),
                        JdbcHelper.instant(rs.getTimestamp("fecha")),
                        rs.getString("vendedor"),
                        rs.getString("cliente"),
                        rs.getString("pago"),
                        rs.getBigDecimal("total")));
    }
}