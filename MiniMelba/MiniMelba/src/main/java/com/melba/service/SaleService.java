package com.melba.service;

import com.melba.dao.ProductDao;
import com.melba.dao.Rows;
import com.melba.dao.SaleDao;
import com.melba.dao.TransactionRunner;
import com.melba.exception.ApiException;
import com.melba.model.Product;
import com.melba.security.SessionUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class SaleService {

    private static final Logger log = LoggerFactory.getLogger(SaleService.class);
    private static final Set<String> PAYMENTS = Set.of("Efectivo", "Tarjeta", "Yape/Plin");

    /** Respuesta de POST /api/sales. */
    public record CashSale(long saleId, BigDecimal total) {
    }

    private record Line(Product product, int quantity) {
    }

    private final SaleDao saleDao;
    private final ProductDao productDao;
    private final TransactionRunner tx;

    public SaleService(SaleDao saleDao, ProductDao productDao, TransactionRunner tx) {
        this.saleDao = saleDao;
        this.productDao = productDao;
        this.tx = tx;
    }

    /** Últimas ventas para el panel admin. */
    public List<Rows.SaleRow> findAll() {
        return saleDao.findAll();
    }

    /** Venta presencial desde la caja: valida, descuenta stock y registra todo en una transacción. */
    public CashSale registerCashSale(Map<String, Object> body, SessionUser seller) {
        Object code = body.get("transactionCode");
        Object items = body.get("items");
        Object payment = body.get("paymentMethod");
        if (!(code instanceof String transactionCode)
                || !(items instanceof List<?> itemList)
                || itemList.isEmpty() || itemList.size() > 100
                || !(payment instanceof String paymentMethod) || !PAYMENTS.contains(paymentMethod)) {
            throw new ApiException(400, "Datos de venta incompletos o incorrectos.");
        }

        Map<Long, Integer> normalized = RequestParsing.normalizeItems(itemList);
        if (normalized == null) {
            throw new ApiException(400, "Revisa las cantidades de productos.");
        }

        Object customer = body.get("customerName");
        String customerName = isFalsy(customer) ? "Cliente genérico" : String.valueOf(customer);
        if (customerName.length() > 120) customerName = customerName.substring(0, 120);
        String finalCustomerName = customerName;

        CashSale sale;
        try {
            sale = tx.execute(() -> {
                BigDecimal total = BigDecimal.ZERO;
                List<Line> lines = new ArrayList<>();
                for (Map.Entry<Long, Integer> entry : normalized.entrySet()) {
                    Product product = productDao.findActiveForUpdate(entry.getKey()).orElse(null);
                    if (product == null || product.stock() < entry.getValue()) {
                        throw new ApiException(409, "Stock insuficiente para "
                                + (product != null ? product.name() : "un producto") + ".");
                    }
                    total = total.add(product.price().multiply(BigDecimal.valueOf(entry.getValue())));
                    lines.add(new Line(product, entry.getValue()));
                }
                total = total.setScale(2, RoundingMode.HALF_UP);

                long saleId = saleDao.insert(transactionCode, seller.id(), finalCustomerName, paymentMethod, total);
                for (Line line : lines) {
                    Product p = line.product();
                    saleDao.insertItem(saleId, p.id(), p.name(), line.quantity(), p.price());
                    productDao.decreaseStock(p.id(), line.quantity());
                }
                return new CashSale(saleId, total);
            });
        } catch (DuplicateKeyException e) {
            throw new ApiException(409, "El código de transacción ya existe. Intenta completar nuevamente.");
        }

        log.info("Venta registrada en caja saleId={} transactionCode={} seller={} total={}",
                sale.saleId(), transactionCode, seller.username(), sale.total());
        return sale;
    }

    /** Equivale a los valores "falsy" de JavaScript usados en `customerName || 'Cliente genérico'`. */
    private static boolean isFalsy(Object value) {
        return value == null
                || (value instanceof String s && s.isEmpty())
                || Boolean.FALSE.equals(value)
                || (value instanceof Number n && n.doubleValue() == 0);
    }
}