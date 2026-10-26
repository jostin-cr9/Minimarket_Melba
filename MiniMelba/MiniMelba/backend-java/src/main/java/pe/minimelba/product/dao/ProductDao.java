package pe.minimelba.product.dao;

import pe.minimelba.product.model.Product;

import java.util.List;
import java.util.Optional;

public interface ProductDao {
    List<Product> findAllActive();
    Optional<Product> findActiveById(long id);
    long insert(Product product);
    boolean update(Product product);
    boolean deactivate(long id);
}
