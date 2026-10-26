package pe.minimelba.sale.dao;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface SaleRepository {
    long insert(String code, long sellerId, String customer, String payment, BigDecimal total);
    void insertItem(long saleId, long productId, String productName, int quantity, BigDecimal price);
    List<Map<String,Object>> findAll();
}
