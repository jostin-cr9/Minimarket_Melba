package pe.minimelba.order.dao;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface OrderRepository {
    long insert(long buyerId, String customer, String delivery, String address, String payment, BigDecimal total);
    void insertItem(long orderId, long productId, String productName, String unit, int quantity, BigDecimal price);
    List<Map<String,Object>> findAll(Long buyerId, String status);
    Map<String,Object> findByIdForUpdate(long id);
    List<Map<String,Object>> findItems(long orderId);
    void updateStatus(long id, String status, long sellerId, Long saleId);
    boolean cancelPending(long id, long buyerId);
    Optional<String> findStatusByBuyer(long id, long buyerId);
}
