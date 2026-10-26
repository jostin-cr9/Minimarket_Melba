package pe.minimelba.product.dao;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import pe.minimelba.product.model.Product;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcProductDao implements ProductDao {
    private static final RowMapper<Product> ROW_MAPPER = (rs, rowNum) -> new Product(
            rs.getLong("id"), rs.getString("code"), rs.getString("name"),
            rs.getString("category"), rs.getString("unit"), rs.getBigDecimal("price"),
            rs.getInt("stock"), rs.getString("image"));

    private final JdbcTemplate jdbc;

    public JdbcProductDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<Product> findAllActive() {
        return jdbc.query("SELECT id, code, name, category, unit, price, stock, image " +
                "FROM products WHERE active = TRUE ORDER BY name", ROW_MAPPER);
    }

    @Override
    public Optional<Product> findActiveById(long id) {
        return jdbc.query("SELECT id, code, name, category, unit, price, stock, image " +
                        "FROM products WHERE id = ? AND active = TRUE", ROW_MAPPER, id)
                .stream().findFirst();
    }

    @Override
    public long insert(Product product) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO products (code, name, category, unit, price, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            setProduct(statement, product);
            return statement;
        }, keys);
        Number id = keys.getKey();
        if (id == null) throw new IllegalStateException("MySQL no devolvió el ID del producto creado.");
        return id.longValue();
    }

    @Override
    public boolean update(Product product) {
        return jdbc.update("UPDATE products SET code=?, name=?, category=?, unit=?, price=?, stock=?, image=? " +
                        "WHERE id=? AND active=TRUE",
                product.code(), product.name(), product.category(), product.unit(), product.price(),
                product.stock(), product.image(), product.id()) == 1;
    }

    @Override
    public boolean deactivate(long id) {
        return jdbc.update("UPDATE products SET active=FALSE WHERE id=? AND active=TRUE", id) == 1;
    }

    private static void setProduct(PreparedStatement statement, Product product) throws java.sql.SQLException {
        statement.setString(1, product.code());
        statement.setString(2, product.name());
        statement.setString(3, product.category());
        statement.setString(4, product.unit());
        statement.setBigDecimal(5, product.price());
        statement.setInt(6, product.stock());
        statement.setString(7, product.image());
    }
}
