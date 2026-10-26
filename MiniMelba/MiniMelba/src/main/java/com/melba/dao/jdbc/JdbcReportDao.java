package com.melba.dao.jdbc;

import com.melba.dao.ReportDao;
import com.melba.dao.Rows;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcReportDao implements ReportDao {

    private final JdbcTemplate jdbc;

    public JdbcReportDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static Timestamp ts(Instant since) {
        return Timestamp.from(since);
    }

    @Override
    public Rows.ReportTotals getTotals(Instant since) {
        return jdbc.queryForObject(
                "SELECT COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS total FROM sales WHERE created_at >= ?",
                (rs, i) -> new Rows.ReportTotals(rs.getLong("ventas"), rs.getBigDecimal("total")),
                ts(since));
    }

    @Override
    public long getUnits(Instant since) {
        Long units = jdbc.queryForObject(
                "SELECT COALESCE(SUM(si.quantity), 0) AS unidades FROM sale_items si "
                        + "JOIN sales s ON s.id = si.sale_id WHERE s.created_at >= ?",
                Long.class, ts(since));
        return units == null ? 0 : units;
    }

    @Override
    public List<Rows.TopProduct> topProducts(Instant since) {
        return jdbc.query("""
                SELECT si.product_id AS productId, MAX(si.product_name) AS producto,
                       SUM(si.quantity) AS unidades, SUM(si.quantity * si.unit_price) AS monto
                FROM sale_items si JOIN sales s ON s.id = si.sale_id
                WHERE s.created_at >= ?
                GROUP BY si.product_id
                ORDER BY unidades DESC, monto DESC LIMIT 10
                """,
                (rs, i) -> new Rows.TopProduct(
                        rs.getLong("productId"),
                        rs.getString("producto"),
                        rs.getLong("unidades"),
                        rs.getBigDecimal("monto")),
                ts(since));
    }

    @Override
    public List<Rows.SellerTotal> bySeller(Instant since) {
        return jdbc.query("""
                SELECT u.id AS sellerId, u.name AS vendedor, u.username, COUNT(*) AS ventas, SUM(s.total) AS total
                FROM sales s JOIN users u ON u.id = s.seller_id
                WHERE s.created_at >= ?
                GROUP BY u.id, u.name, u.username
                ORDER BY total DESC
                """,
                (rs, i) -> new Rows.SellerTotal(
                        rs.getLong("sellerId"),
                        rs.getString("vendedor"),
                        rs.getString("username"),
                        rs.getLong("ventas"),
                        rs.getBigDecimal("total")),
                ts(since));
    }

    @Override
    public List<Rows.DayTotal> byDay(Instant since) {
        return jdbc.query("""
                SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS dia, COUNT(*) AS ventas, SUM(total) AS total
                FROM sales WHERE created_at >= ?
                GROUP BY dia ORDER BY dia
                """,
                (rs, i) -> new Rows.DayTotal(
                        rs.getString("dia"),
                        rs.getLong("ventas"),
                        rs.getBigDecimal("total")),
                ts(since));
    }

    @Override
    public List<Rows.SaleRow> findSales(Instant since, int limit) {
        int max = limit > 0 ? limit : 200; // el límite es un entero ya validado, no texto del usuario
        return jdbc.query("""
                SELECT s.id, s.transaction_code AS transaccion, s.created_at AS fecha, u.username AS vendedor,
                       s.customer_name AS cliente, s.payment_method AS pago, s.total
                FROM sales s JOIN users u ON u.id = s.seller_id
                WHERE s.created_at >= ?
                ORDER BY s.created_at DESC LIMIT\s""" + max,
                (rs, i) -> new Rows.SaleRow(
                        rs.getLong("id"),
                        rs.getString("transaccion"),
                        JdbcHelper.instant(rs.getTimestamp("fecha")),
                        rs.getString("vendedor"),
                        rs.getString("cliente"),
                        rs.getString("pago"),
                        rs.getBigDecimal("total")),
                ts(since));
    }

    @Override
    public List<Rows.ProductDetail> productDetail(Instant since) {
        return jdbc.query("""
                SELECT p.code AS codigo, MAX(si.product_name) AS producto,
                       SUM(si.quantity) AS cantidad, SUM(si.quantity * si.unit_price) AS total
                FROM sale_items si
                JOIN sales s ON s.id = si.sale_id
                JOIN products p ON p.id = si.product_id
                WHERE s.created_at >= ?
                GROUP BY si.product_id, p.code
                ORDER BY cantidad DESC, total DESC
                """,
                (rs, i) -> new Rows.ProductDetail(
                        rs.getString("codigo"),
                        rs.getString("producto"),
                        rs.getLong("cantidad"),
                        rs.getBigDecimal("total")),
                ts(since));
    }
}
