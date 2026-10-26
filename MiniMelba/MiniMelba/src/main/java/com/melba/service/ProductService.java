package com.melba.service;

import com.melba.dao.ProductDao;
import com.melba.dao.Rows;
import com.melba.exception.ApiException;
import com.melba.model.Product;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);
    private static final String INVALID = "Completa correctamente los datos del producto.";
    private static final String DUPLICATE = "Ya existe un producto con ese código.";
    private static final String NOT_FOUND = "No se encontró el producto.";

    /** Respuesta de /api/admin/summary. */
    public record AdminSummary(Rows.StockSummary summary, List<Rows.LowStockProduct> lowStock) {
    }

    private final ProductDao productDao;

    public ProductService(ProductDao productDao) {
        this.productDao = productDao;
    }

    public List<Product> findAllActive() {
        return productDao.findAllActive();
    }

    public AdminSummary summary() {
        return new AdminSummary(productDao.getSummary(), productDao.findLowStock());
    }

    /** Devuelve el producto creado: el id más los datos tal como llegaron. */
    public Map<String, Object> create(Map<String, Object> body, String username) {
        Product clean = validateAndClean(body);
        long id;
        try {
            id = productDao.create(clean);
        } catch (DuplicateKeyException e) {
            throw new ApiException(409, DUPLICATE);
        }
        log.info("Producto creado productId={} code={} by={}", id, clean.code(), username);

        Map<String, Object> product = new LinkedHashMap<>();
        product.put("id", id);
        product.putAll(body);
        return product;
    }

    public void update(String idText, Map<String, Object> body, String username) {
        Product clean = validateAndClean(body);
        long id = parseId(idText);
        int changed;
        try {
            changed = productDao.update(id, clean);
        } catch (DuplicateKeyException e) {
            throw new ApiException(409, DUPLICATE);
        }
        if (changed == 0) throw new ApiException(404, NOT_FOUND);
        log.info("Producto editado productId={} by={}", id, username);
    }

    /** Eliminación lógica: el producto solo se desactiva. */
    public void delete(String idText, String username) {
        long id = parseId(idText);
        if (productDao.deactivate(id) == 0) throw new ApiException(404, NOT_FOUND);
        log.info("Producto eliminado productId={} by={}", id, username);
    }

    private static Product validateAndClean(Map<String, Object> body) {
        String code = text(body.get("code"));
        String name = text(body.get("name"));
        String category = text(body.get("category"));
        BigDecimal price = RequestParsing.toNumber(body.get("price"));
        Long stock = RequestParsing.toInteger(body.get("stock"));

        if (code == null || code.isBlank() || code.length() > 30
                || name == null || name.isBlank() || name.length() > 120
                || category == null || category.isBlank() || category.length() > 60
                || price == null || price.signum() <= 0
                || stock == null || stock < 0 || stock > Integer.MAX_VALUE) {
            throw new ApiException(400, INVALID);
        }

        String unit = body.containsKey("unit") ? String.valueOf(body.get("unit")) : "unidad";
        if (unit.length() > 40) unit = unit.substring(0, 40);
        String image = body.get("image") instanceof String s && !s.isEmpty() ? s : null;

        return new Product(null, code.strip(), name.strip(), category.strip(), unit, price, stock.intValue(), image);
    }

    private static String text(Object value) {
        return value instanceof String s ? s : null;
    }

    /** Un id que no es número nunca coincide con un producto (resulta en 404, como en Node). */
    private static long parseId(String idText) {
        try {
            return Long.parseLong(idText.strip());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}