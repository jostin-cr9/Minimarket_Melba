package pe.minimelba.product.service;

import pe.minimelba.product.model.Product;

import java.util.List;
import java.util.Optional;

public interface ProductService {
    List<Product> findAll();
    Optional<Product> findById(long id);
    Product create(Product product);
    boolean update(long id, Product product);
    boolean deactivate(long id);
}
