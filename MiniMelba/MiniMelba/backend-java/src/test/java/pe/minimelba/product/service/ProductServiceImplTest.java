package pe.minimelba.product.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pe.minimelba.product.dao.ProductDao;
import pe.minimelba.product.model.Product;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProductServiceImplTest {
    private ProductDao productDao;
    private ProductServiceImpl service;

    @BeforeEach
    void setUp() {
        productDao = mock(ProductDao.class);
        service = new ProductServiceImpl(productDao);
    }

    @Test
    void createTrimsTextAndReturnsGeneratedId() {
        when(productDao.insert(any(Product.class))).thenReturn(42L);

        Product created = service.create(new Product(null, "  A-1 ", " Leche ", " Lácteos ",
                null, new BigDecimal("4.80"), 12, " "));

        assertEquals(42L, created.id());
        assertEquals("A-1", created.code());
        assertEquals("Leche", created.name());
        assertEquals("unidad", created.unit());
        assertNull(created.image());
    }

    @Test
    void createRejectsZeroPriceWithoutWritingToDao() {
        Product invalid = new Product(null, "A-1", "Leche", "Lácteos", "unidad",
                BigDecimal.ZERO, 12, null);

        assertThrows(IllegalArgumentException.class, () -> service.create(invalid));
        verify(productDao, never()).insert(any());
    }

    @Test
    void updateRejectsNegativeStockWithoutWritingToDao() {
        Product invalid = new Product(null, "A-1", "Leche", "Lácteos", "unidad",
                new BigDecimal("4.80"), -1, null);

        assertThrows(IllegalArgumentException.class, () -> service.update(2, invalid));
        verify(productDao, never()).update(any());
    }
}
