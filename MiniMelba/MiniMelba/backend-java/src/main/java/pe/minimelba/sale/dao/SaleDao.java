package pe.minimelba.sale.dao;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

@Repository
public class SaleDao implements SaleRepository {
    private final JdbcTemplate jdbc;
    public SaleDao(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override public long insert(String code, long sellerId, String customer, String payment, java.math.BigDecimal total) {
        KeyHolder key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO sales (transaction_code,seller_id,customer_name,payment_method,total) VALUES (?,?,?,?,?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, code); ps.setLong(2, sellerId); ps.setString(3, customer); ps.setString(4, payment); ps.setBigDecimal(5, total);
            return ps;
        }, key);
        return key.getKey().longValue();
    }

    @Override public void insertItem(long saleId, long productId, String productName, int quantity, java.math.BigDecimal price) {
        jdbc.update("INSERT INTO sale_items (sale_id,product_id,product_name,quantity,unit_price) VALUES (?,?,?,?,?)",
                saleId, productId, productName, quantity, price);
    }

    @Override public List<Map<String, Object>> findAll() {
        return jdbc.queryForList("SELECT s.id, s.transaction_code AS transaccion, s.created_at AS fecha, " +
                "u.username AS vendedor, s.customer_name AS cliente, s.payment_method AS pago, s.total " +
                "FROM sales s JOIN users u ON u.id=s.seller_id ORDER BY s.created_at DESC LIMIT 500");
    }
}
