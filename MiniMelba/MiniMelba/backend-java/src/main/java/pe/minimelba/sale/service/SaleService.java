package pe.minimelba.sale.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import pe.minimelba.common.ApiException;
import pe.minimelba.product.dao.ProductDao;
import pe.minimelba.product.model.Product;
import pe.minimelba.sale.dao.SaleRepository;
import pe.minimelba.sale.controller.SalesRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class SaleService {
    private static final Set<String> PAYMENTS = Set.of("Efectivo", "Tarjeta", "Yape/Plin");
    private final ProductDao products;
    private final SaleRepository sales;
    private final TransactionTemplate transaction;
    public SaleService(ProductDao products, SaleRepository sales, TransactionTemplate transaction) {
        this.products=products; this.sales=sales; this.transaction=transaction;
    }
    public Map<String,Object> create(SalesRequest input, long sellerId) {
        if (input == null || input.transactionCode() == null || input.transactionCode().isBlank() || input.transactionCode().length()>40 ||
                input.items()==null || input.items().isEmpty() || input.items().size()>100 || input.paymentMethod()==null || !PAYMENTS.contains(input.paymentMethod())) {
            throw ApiException.badRequest("Datos de venta incompletos o incorrectos.");
        }
        Map<Long,Integer> quantities = new LinkedHashMap<>();
        input.items().forEach(item -> {
            if (item==null || item.productId()==null || item.productId()<1 || item.quantity()==null || item.quantity()<1 || item.quantity()>10000)
                throw ApiException.badRequest("Revisa las cantidades de productos.");
            quantities.merge(item.productId(),item.quantity(),Integer::sum);
        });
        try {
            return transaction.execute(status -> {
                List<Map.Entry<Product,Integer>> lines = new ArrayList<>();
                BigDecimal total=BigDecimal.ZERO;
                for (var entry : quantities.entrySet()) {
                    Product product=products.findForSale(entry.getKey()).orElse(null);
                    if (product==null || product.stock()<entry.getValue()) throw ApiException.conflict("Stock insuficiente para "+(product==null?"un producto":product.name())+".");
                    lines.add(Map.entry(product,entry.getValue()));
                    total=total.add(product.price().multiply(BigDecimal.valueOf(entry.getValue())));
                }
                total=total.setScale(2,RoundingMode.HALF_UP);
                String customer=input.customerName()==null || input.customerName().isBlank()?"Cliente genérico":input.customerName().substring(0,Math.min(120,input.customerName().length()));
                long saleId=sales.insert(input.transactionCode(),sellerId,customer,input.paymentMethod(),total);
                for (var line : lines) {
                    Product product=line.getKey(); int quantity=line.getValue();
                    sales.insertItem(saleId,product.id(),product.name(),quantity,product.price());
                    if (!products.decreaseStock(product.id(),quantity)) throw ApiException.conflict("El stock cambió durante el registro de la venta.");
                }
                return Map.of("saleId",saleId,"total",total);
            });
        } catch (DuplicateKeyException e) { throw ApiException.conflict("El código de transacción ya existe. Intenta completar nuevamente."); }
    }
}
