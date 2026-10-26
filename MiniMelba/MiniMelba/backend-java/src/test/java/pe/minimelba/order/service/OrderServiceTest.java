package pe.minimelba.order.service;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionTemplate;
import pe.minimelba.common.ApiException;
import pe.minimelba.order.dao.OrderRepository;
import pe.minimelba.product.dao.ProductDao;
import pe.minimelba.sale.dao.SaleRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrderServiceTest {
    @Test
    void listRejectsUnknownStatusBeforeQueryingDao() {
        OrderRepository orders=mock(OrderRepository.class);
        OrderService service=new OrderService(orders,mock(ProductDao.class),mock(SaleRepository.class),mock(TransactionTemplate.class));
        ApiException error=assertThrows(ApiException.class,()->service.list("desconocido",null));
        assertEquals(400,error.status());
        verifyNoInteractions(orders);
    }
}
