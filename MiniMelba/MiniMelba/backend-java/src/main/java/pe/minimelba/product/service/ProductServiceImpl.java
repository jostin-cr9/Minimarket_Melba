package pe.minimelba.product.service;

import org.springframework.stereotype.Service;
import pe.minimelba.product.dao.ProductDao;
import pe.minimelba.product.model.Product;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class ProductServiceImpl implements ProductService {
    private final ProductDao productDao;

    public ProductServiceImpl(ProductDao productDao) {
        this.productDao = productDao;
    }

    @Override
    public List<Product> findAll() {
        return productDao.findAllActive();
    }

    @Override
    public Optional<Product> findById(long id) {
        if (id < 1) throw new IllegalArgumentException("El ID debe ser positivo.");
        return productDao.findActiveById(id);
    }

    @Override
    public Product create(Product input) {
        Product clean = validateAndClean(input);
        long id = productDao.insert(clean);
        return new Product(id, clean.code(), clean.name(), clean.category(), clean.unit(),
                clean.price(), clean.stock(), clean.image());
    }

    @Override
    public boolean update(long id, Product input) {
        if (id < 1) throw new IllegalArgumentException("El ID debe ser positivo.");
        Product clean = validateAndClean(input);
        Product updated = new Product(id, clean.code(), clean.name(), clean.category(), clean.unit(),
                clean.price(), clean.stock(), clean.image());
        return productDao.update(updated);
    }

    @Override
    public boolean deactivate(long id) {
        if (id < 1) throw new IllegalArgumentException("El ID debe ser positivo.");
        return productDao.deactivate(id);
    }

    private Product validateAndClean(Product input) {
        if (input == null || blank(input.code()) || input.code().length() > 30 ||
                blank(input.name()) || input.name().length() > 120 ||
                blank(input.category()) || input.category().length() > 60 ||
                input.price() == null || input.price().compareTo(BigDecimal.ZERO) <= 0 || input.stock() < 0) {
            throw new IllegalArgumentException("Revisa el código, nombre, categoría, precio y stock del producto.");
        }
        String unit = blank(input.unit()) ? "unidad" : input.unit().trim();
        String image = blank(input.image()) ? null : input.image().trim();
        return new Product(null, input.code().trim(), input.name().trim(), input.category().trim(),
                unit.length() > 40 ? unit.substring(0, 40) : unit, input.price(), input.stock(), image);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
