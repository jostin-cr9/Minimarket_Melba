package com.melba.service;

import com.melba.dao.OrderDao;
import com.melba.dao.ProductDao;
import com.melba.dao.Rows;
import com.melba.dao.SaleDao;
import com.melba.dao.TransactionRunner;
import com.melba.exception.ApiException;
import com.melba.model.Order;
import com.melba.model.OrderItem;
import com.melba.model.OrderStatus;
import com.melba.model.Product;
import com.melba.model.Role;
import com.melba.security.SessionUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private static final Map<String, String> PAYMENTS = Map.of(
            "Efectivo", "Efectivo",
            "Tarjeta", "Tarjeta",
            "Yape/Plin", "Yape/Plin",
            "Yape / Plin", "Yape/Plin");
    private static final Set<String> DELIVERY_TYPES = Set.of("Recojo en tienda", "Delivery");

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.of(
            OrderStatus.PENDIENTE, EnumSet.of(OrderStatus.ARMADO, OrderStatus.COMPLETADO, OrderStatus.CANCELADO),
            OrderStatus.ARMADO, EnumSet.of(OrderStatus.PENDIENTE, OrderStatus.COMPLETADO, OrderStatus.CANCELADO),
            OrderStatus.COMPLETADO, EnumSet.noneOf(OrderStatus.class),
            OrderStatus.CANCELADO, EnumSet.noneOf(OrderStatus.class));

    private static final String INVALID_DATA = "Datos no válidos.";
    private static final String NOT_FOUND = "No se encontró el pedido.";

    /** Datos del pedido recién creado (respuesta de POST /api/orders). */
    public record CreatedOrder(long id, String code, BigDecimal total, OrderStatus status) {
    }

    private record Line(Product product, int quantity) {
    }

    private final OrderDao orderDao;
    private final ProductDao productDao;
    private final SaleDao saleDao;
    private final TransactionRunner tx;

    public OrderService(OrderDao orderDao, ProductDao productDao, SaleDao saleDao, TransactionRunner tx) {
        this.orderDao = orderDao;
        this.productDao = productDao;
        this.saleDao = saleDao;
        this.tx = tx;
    }

    /** El comprador envía su pedido. */
    public CreatedOrder create(Map<String, Object> body, SessionUser buyer) {
        String delivery = body.get("delivery") instanceof String d && DELIVERY_TYPES.contains(d) ? d : null;
        if (delivery == null) throw new ApiException(400, "Selecciona el tipo de entrega.");

        String paymentMethod = body.get("payment") instanceof String p ? PAYMENTS.get(p) : null;
        if (paymentMethod == null) throw new ApiException(400, "Selecciona un método de pago válido.");

        boolean isDelivery = delivery.equals("Delivery");
        String address = body.get("address") instanceof String a ? a : null;
        if (isDelivery && (address == null || address.isBlank() || address.length() > 255)) {
            throw new ApiException(400, "Ingresa la dirección de entrega.");
        }

        if (!(body.get("items") instanceof List<?> items) || items.isEmpty() || items.size() > 100) {
            throw new ApiException(400, "Agrega al menos un producto.");
        }
        Map<Long, Integer> normalized = RequestParsing.normalizeItems(items);
        if (normalized == null) throw new ApiException(400, "Revisa las cantidades de los productos.");

        String savedAddress = isDelivery ? address.strip() : null;

        CreatedOrder created = tx.execute(() -> {
            BigDecimal total = BigDecimal.ZERO;
            List<Line> lines = new ArrayList<>();
            for (Map.Entry<Long, Integer> entry : normalized.entrySet()) {
                Product product = productDao.findActiveById(entry.getKey())
                        .orElseThrow(() -> new ApiException(409, "Un producto del pedido ya no está disponible."));
                if (product.stock() < entry.getValue()) {
                    throw new ApiException(409, "Stock insuficiente para " + product.name()
                            + ". Quedan " + product.stock() + ".");
                }
                total = total.add(product.price().multiply(BigDecimal.valueOf(entry.getValue())));
                lines.add(new Line(product, entry.getValue()));
            }
            total = total.setScale(2, RoundingMode.HALF_UP);

            long orderId = orderDao.insert(buyer.id(), buyer.name(), delivery, savedAddress, paymentMethod, total);
            for (Line line : lines) {
                Product p = line.product();
                orderDao.insertItem(orderId, p.id(), p.name(), p.unit(), line.quantity(), p.price());
            }
            return new CreatedOrder(orderId, String.format(Locale.ROOT, "PED-%04d", orderId), total,
                    OrderStatus.PENDIENTE);
        });

        log.info("Pedido creado orderId={} buyer={} total={}", created.id(), buyer.username(), created.total());
        return created;
    }

    /** El comprador solo ve los suyos; vendedor y admin ven todos. */
    public List<Order> list(SessionUser user, String status) {
        OrderStatus filter = null;
        if (status != null && !status.isEmpty()) {
            filter = OrderStatus.fromValue(status);
            if (filter == null) throw new ApiException(400, "Estado no válido.");
        }
        Long buyerId = user.role() == Role.COMPRADOR ? user.id() : null;
        return orderDao.findAll(buyerId, filter);
    }

    /** El personal cambia el estado; al completar se registra la venta y se descuenta el stock. */
    public OrderStatus changeStatus(String idText, Object statusValue, SessionUser staff) {
        Long id = RequestParsing.toInteger(idText);
        OrderStatus target = statusValue instanceof String s ? OrderStatus.fromValue(s) : null;
        if (id == null || id < 1 || target == null) throw new ApiException(400, INVALID_DATA);
        long orderId = id;

        OrderStatus previous;
        try {
            previous = tx.execute(() -> {
                Rows.OrderForUpdate order = orderDao.findByIdForUpdate(orderId)
                        .orElseThrow(() -> new ApiException(404, NOT_FOUND));
                if (!TRANSITIONS.get(order.status()).contains(target)) {
                    throw new ApiException(409, "Un pedido " + order.status().getValue()
                            + " no puede pasar a " + target.getValue() + ".");
                }

                Long saleId = null;
                if (target == OrderStatus.COMPLETADO) {
                    List<OrderItem> items = orderDao.findItems(orderId);
                    for (OrderItem item : items) {
                        Optional<Integer> stock = productDao.lockStock(item.productId());
                        if (stock.isEmpty() || stock.get() < item.quantity()) {
                            throw new ApiException(409, "Stock insuficiente para " + item.name() + ".");
                        }
                    }
                    saleId = saleDao.insert(order.code(), staff.id(), order.customerName(),
                            order.paymentMethod(), order.total());
                    for (OrderItem item : items) {
                        saleDao.insertItem(saleId, item.productId(), item.name(), item.quantity(), item.price());
                        productDao.decreaseStock(item.productId(), item.quantity());
                    }
                }
                orderDao.updateStatus(orderId, target, staff.id(), saleId);
                return order.status();
            });
        } catch (DuplicateKeyException e) {
            throw new ApiException(409, "Este pedido ya fue registrado como venta.");
        }

        log.info("Cambio de estado de pedido orderId={} from={} to={} by={}",
                orderId, previous.getValue(), target.getValue(), staff.username());
        return target;
    }

    /** El comprador cancela SU pedido, solo si sigue pendiente. */
    public void cancel(String idText, SessionUser buyer) {
        Long id = RequestParsing.toInteger(idText);
        if (id == null || id < 1) throw new ApiException(400, INVALID_DATA);

        if (orderDao.cancelPending(id, buyer.id())) {
            log.info("Pedido cancelado por el cliente orderId={} buyer={}", id, buyer.username());
            return;
        }
        OrderStatus current = orderDao.findStatusByBuyer(id, buyer.id())
                .orElseThrow(() -> new ApiException(404, NOT_FOUND));
        throw new ApiException(409, "Este pedido ya está " + current.getValue() + " y no se puede cancelar.");
    }
}