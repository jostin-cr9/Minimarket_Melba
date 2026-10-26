package pe.minimelba.order.service;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import pe.minimelba.common.ApiException;
import pe.minimelba.order.dao.OrderRepository;
import pe.minimelba.order.controller.OrderRequest;
import pe.minimelba.product.dao.ProductDao;
import pe.minimelba.product.model.Product;
import pe.minimelba.sale.dao.SaleRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class OrderService {
    private static final Set<String> STATES=Set.of("pendiente","armado","completado","cancelado");
    private static final Map<String,Set<String>> TRANSITIONS=Map.of(
            "pendiente",Set.of("armado","completado","cancelado"),
            "armado",Set.of("pendiente","completado","cancelado"),
            "completado",Set.of(),"cancelado",Set.of());
    private final OrderRepository orders;
    private final ProductDao products;
    private final SaleRepository sales;
    private final TransactionTemplate transaction;
    public OrderService(OrderRepository orders, ProductDao products, SaleRepository sales, TransactionTemplate transaction) {
        this.orders=orders; this.products=products; this.sales=sales; this.transaction=transaction;
    }

    public Map<String,Object> create(OrderRequest input, long buyerId, String buyerName) {
        if(input==null || input.delivery()==null || !Set.of("Recojo en tienda","Delivery").contains(input.delivery()))
            throw ApiException.badRequest("Selecciona el tipo de entrega.");
        String payment=normalizePayment(input.payment());
        if(payment==null) throw ApiException.badRequest("Selecciona un método de pago válido.");
        if("Delivery".equals(input.delivery()) && (input.address()==null || input.address().isBlank() || input.address().length()>255))
            throw ApiException.badRequest("Ingresa la dirección de entrega.");
        Map<Long,Integer> quantities=normalize(input.items(),"Agrega al menos un producto.");
        return transaction.execute(status -> {
            List<LineProduct> lines=new ArrayList<>(); BigDecimal total=BigDecimal.ZERO;
            for(var entry:quantities.entrySet()) {
                Product product=products.findForSale(entry.getKey()).orElse(null);
                if(product==null) throw ApiException.conflict("Un producto del pedido ya no está disponible.");
                if(product.stock()<entry.getValue()) throw ApiException.conflict("Stock insuficiente para "+product.name()+". Quedan "+product.stock()+".");
                lines.add(new LineProduct(product,entry.getValue()));
                total=total.add(product.price().multiply(BigDecimal.valueOf(entry.getValue())));
            }
            total=total.setScale(2,RoundingMode.HALF_UP);
            long id=orders.insert(buyerId,buyerName,input.delivery(),"Delivery".equals(input.delivery())?input.address().trim():null,payment,total);
            for(LineProduct line:lines) orders.insertItem(id,line.product.id(),line.product.name(),line.product.unit(),line.quantity,line.product.price());
            return Map.of("order",Map.of("id",id,"code",String.format("PED-%04d",id),"total",total,"status","pendiente"));
        });
    }

    public List<Map<String,Object>> list(String status, Long buyerId) {
        if(status!=null && !status.isBlank() && !STATES.contains(status)) throw ApiException.badRequest("Estado no válido.");
        return orders.findAll(buyerId,status);
    }

    public Map<String,Object> changeStatus(long id,String next,long sellerId) {
        if(id<1 || next==null || !STATES.contains(next)) throw ApiException.badRequest("Datos no válidos.");
        try {
            String previous=transaction.execute(tx -> {
                Map<String,Object> order=orders.findByIdForUpdate(id);
                if(order==null) throw ApiException.notFound("No se encontró el pedido.");
                String current=String.valueOf(order.get("status"));
                   // A retry after a lost response must not require re-arming the order
                // or create a second sale. Completion is safe to acknowledge again.
                if("completado".equals(current) && "completado".equals(next)) return current;                if(!TRANSITIONS.get(current).contains(next)) throw ApiException.conflict("Un pedido "+current+" no puede pasar a "+next+".");
                Long saleId=null;
                if("completado".equals(next)) {
                    List<Map<String,Object>> items=orders.findItems(id);
                    for(Map<String,Object> item:items) {
                        long productId=((Number)item.get("productId")).longValue();
                        Product product=products.findForSale(productId).orElse(null);
                        int quantity=((Number)item.get("quantity")).intValue();
                        if(product==null || product.stock()<quantity) throw ApiException.conflict("Stock insuficiente para "+item.get("productName")+".");
                    }
                    saleId=sales.insert(String.valueOf(order.get("orderCode")),sellerId,String.valueOf(order.get("customerName")),
                            String.valueOf(order.get("paymentMethod")),(BigDecimal)order.get("total"));
                    for(Map<String,Object> item:items) {
                        long productId=((Number)item.get("productId")).longValue();
                        int quantity=((Number)item.get("quantity")).intValue();
                        BigDecimal price=(BigDecimal)item.get("unitPrice");
                        sales.insertItem(saleId,productId,String.valueOf(item.get("productName")),quantity,price);
                        if(!products.decreaseStock(productId,quantity)) throw ApiException.conflict("El stock cambió al completar el pedido.");
                    }
                }
                orders.updateStatus(id,next,sellerId,saleId);
                return current;
            });
            return Map.of("ok",true,"status",next,"previous",previous);
        } catch(DuplicateKeyException e) { throw ApiException.conflict("Este pedido ya fue registrado como venta."); }
    }

    public Map<String,Object> cancel(long id,long buyerId) {
        if(id<1) throw ApiException.badRequest("Datos no válidos.");
        if(orders.cancelPending(id,buyerId)) return Map.of("ok",true,"status","cancelado");
        String current=orders.findStatusByBuyer(id,buyerId).orElse(null);
        if(current==null) throw ApiException.notFound("No se encontró el pedido.");
        throw ApiException.conflict("Este pedido ya está "+current+" y no se puede cancelar.");
    }

    private static Map<Long,Integer> normalize(List<OrderRequest.Line> items,String emptyMessage) {
        if(items==null || items.isEmpty() || items.size()>100) throw ApiException.badRequest(emptyMessage);
        Map<Long,Integer> quantities=new LinkedHashMap<>();
        for(var item:items) {
            if(item==null || item.productId()==null || item.productId()<1 || item.quantity()==null || item.quantity()<1 || item.quantity()>10000)
                throw ApiException.badRequest("Revisa las cantidades de los productos.");
            quantities.merge(item.productId(),item.quantity(),Integer::sum);
        }
        return quantities;
    }
    private static String normalizePayment(String payment) {
        if(payment==null) return null;
        if("Yape / Plin".equals(payment)) return "Yape/Plin";
        return Set.of("Efectivo","Tarjeta","Yape/Plin").contains(payment)?payment:null;
    }
    private record LineProduct(Product product,int quantity) {}
}
