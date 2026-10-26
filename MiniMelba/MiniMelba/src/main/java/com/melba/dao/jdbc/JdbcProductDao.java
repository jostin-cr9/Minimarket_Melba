package com.melba.dao.jdbc;

import com.melba.dao.ProductDao;
import com.melba.dao.Rows;
import com.melba.model.Product;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcProductDao implements ProductDao {

    private static final String SELECT_ACTIVE_BY_ID =
            "SELECT id, code, name, category, unit, price, stock, image FROM products WHERE id=? AND active=TRUE";

    private static final RowMapper<Product> PRODUCT_MAPPER = (rs, i) -> new Product(
            rs.getLong("id"),
            rs.getString("code"),
            rs.getString("name"),
            rs.getString("category"),
            rs.getString("unit"),
            rs.getBigDecimal("price"),
            rs.getInt("stock"),
            rs.getString("image"));

    private final JdbcTemplate jdbc;

    public JdbcProductDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<Product> findAllActive() {
        return jdbc.query(
                "SELECT id, code, name, category, unit, price, stock, image FROM products WHERE active = TRUE ORDER BY name",
                PRODUCT_MAPPER);
    }

    @Override
    public long create(Product p) {
        return JdbcHelper.insertReturningId(jdbc,
                "INSERT INTO products (code, name, category, unit, price, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?)",
                p.code(), p.name(), p.category(), p.unit(), p.price(), p.stock(), p.image());
    }

    @Override
    public int update(long id, Product p) {
        return jdbc.update(
                "UPDATE products SET code=?, name=?, category=?, unit=?, price=?, stock=?, image=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=TRUE",
                p.code(), p.name(), p.category(), p.unit(), p.price(), p.stock(), p.image(), id);
    }

    @Override
    public int deactivate(long id) {
        return jdbc.update("UPDATE products SET active=FALSE, updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=TRUE", id);
    }

    @Override
    public Optional<Product> findActiveById(long id) {
        return jdbc.query(SELECT_ACTIVE_BY_ID, PRODUCT_MAPPER, id).stream().findFirst();
    }

    @Override
    public Optional<Product> findActiveForUpdate(long id) {
        return jdbc.query(SELECT_ACTIVE_BY_ID + " FOR UPDATE", PRODUCT_MAPPER, id).stream().findFirst();
    }

    @Override
    public Optional<Integer> lockStock(long id) {
        return jdbc.queryForList("SELECT stock FROM products WHERE id=? FOR UPDATE", Integer.class, id)
                .stream().findFirst();
    }

    @Override
    public void decreaseStock(long id, int quantity) {
        jdbc.update("UPDATE products SET stock = stock - ?, updated_at=CURRENT_TIMESTAMP WHERE id = ?", quantity, id);
    }

    @Override
    public Rows.StockSummary getSummary() {
        return jdbc.queryForObject("""
                SELECT
                  (SELECT COUNT(*) FROM products WHERE active=TRUE) AS productCount,
                  (SELECT COALESCE(SUM(stock),0) FROM products WHERE active=TRUE) AS stockUnits,
                  (SELECT COUNT(*) FROM sales) AS saleCount,
                  (SELECT COUNT(*) FROM products WHERE active=TRUE AND stock<=5) AS lowStockCount
                """,
                (rs, i) -> new Rows.StockSummary(
                        rs.getLong("productCount"),
                        rs.getLong("stockUnits"),
                        rs.getLong("saleCount"),
                        rs.getLong("lowStockCount")));
    }

    @Override
    public List<Rows.LowStockProduct> findLowStock() {
        return jdbc.query(
                "SELECT id, code, name, category, price, stock FROM products WHERE active=TRUE AND stock<=5 ORDER BY stock, name",
                (rs, i) -> new Rows.LowStockProduct(
                        rs.getLong("id"),
                        rs.getString("code"),
                        rs.getString("name"),
                        rs.getString("category"),
                        rs.getBigDecimal("price"),
                        rs.getInt("stock")));
    }
}
