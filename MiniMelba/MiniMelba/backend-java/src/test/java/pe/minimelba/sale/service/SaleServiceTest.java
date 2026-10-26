package pe.minimelba.sale.service;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionTemplate;
import pe.minimelba.common.ApiException;
import pe.minimelba.product.dao.ProductDao;
import pe.minimelba.sale.dao.SaleRepository;
import pe.minimelba.sale.controller.SalesRequest;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SaleServiceTest {
    @Test
    void createRejectsInvalidPaymentBeforeTransaction() {
        TransactionTemplate transaction=mock(TransactionTemplate.class);
        SaleService service=new SaleService(mock(ProductDao.class),mock(SaleRepository.class),transaction);
        SalesRequest input=new SalesRequest("TX-1","Cliente","Cheque",java.util.List.of(new SalesRequest.Line(1L,1)));
        ApiException error=assertThrows(ApiException.class,()->service.create(input,7));
        assertEquals(400,error.status());
        verifyNoInteractions(transaction);
    }
}
