package pe.minimelba.report.dao;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

@Repository
public class ReportDao implements ReportRepository {
    private final JdbcTemplate jdbc;
    public ReportDao(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override public Map<String, Object> totals(Instant since) {
        return jdbc.queryForMap("SELECT COUNT(*) AS ventas,COALESCE(SUM(total),0) AS total FROM sales WHERE created_at>=?", Timestamp.from(since));
    }

    @Override public long units(Instant since) {
        Long value = jdbc.queryForObject("SELECT COALESCE(SUM(si.quantity),0) FROM sale_items si " +
                "JOIN sales s ON s.id=si.sale_id WHERE s.created_at>=?", Long.class, Timestamp.from(since));
        return value == null ? 0 : value;
    }

    @Override public List<Map<String, Object>> topProducts(Instant since) {
        return jdbc.queryForList("SELECT si.product_id AS productId,MAX(si.product_name) AS producto," +
                "SUM(si.quantity) AS unidades,SUM(si.quantity*si.unit_price) AS monto " +
                "FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.created_at>=? " +
                "GROUP BY si.product_id ORDER BY unidades DESC,monto DESC LIMIT 10", Timestamp.from(since));
    }

    @Override public List<Map<String, Object>> bySeller(Instant since) {
        return jdbc.queryForList("SELECT u.id AS sellerId,u.name AS vendedor,u.username,COUNT(*) AS ventas,SUM(s.total) AS total " +
                "FROM sales s JOIN users u ON u.id=s.seller_id WHERE s.created_at>=? " +
                "GROUP BY u.id,u.name,u.username ORDER BY total DESC", Timestamp.from(since));
    }

    @Override public List<Map<String, Object>> byDay(Instant since) {
        return jdbc.queryForList("SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS dia,COUNT(*) AS ventas,SUM(total) AS total " +
                "FROM sales WHERE created_at>=? GROUP BY DATE(created_at) ORDER BY DATE(created_at)", Timestamp.from(since));
    }

    @Override public List<Map<String, Object>> findSales(Instant since, int limit) {
        return jdbc.queryForList("SELECT s.transaction_code AS transaccion,s.created_at AS fecha,u.name AS vendedor," +
                "s.customer_name AS cliente,s.payment_method AS pago,s.total FROM sales s " +
                "JOIN users u ON u.id=s.seller_id WHERE s.created_at>=? ORDER BY s.created_at DESC LIMIT ?", Timestamp.from(since), limit);
    }

    @Override public List<Map<String, Object>> productDetail(Instant since) {
        return jdbc.queryForList("SELECT p.code AS codigo,si.product_name AS producto,SUM(si.quantity) AS cantidad," +
                "SUM(si.quantity*si.unit_price) AS total FROM sale_items si JOIN sales s ON s.id=si.sale_id " +
                "JOIN products p ON p.id=si.product_id WHERE s.created_at>=? " +
                "GROUP BY p.id,p.code,si.product_name ORDER BY producto", Timestamp.from(since));
    }
}
