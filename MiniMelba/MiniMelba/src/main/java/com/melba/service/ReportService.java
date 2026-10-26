package com.melba.service;

import com.melba.dao.ReportDao;
import com.melba.dao.Rows;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ReportService {

    /** Periodos válidos y su etiqueta. */
    public static final Map<String, String> RANGES = new LinkedHashMap<>();

    static {
        RANGES.put("day", "Hoy");
        RANGES.put("week", "Últimos 7 días");
        RANGES.put("month", "Últimos 30 días");
        RANGES.put("year", "Último año");
        RANGES.put("5years", "Últimos 5 años");
    }

    public record Summary(long ventas, long unidades, BigDecimal total) {
    }

    public record Report(
            String range,
            String label,
            Instant since,
            Summary resumen,
            List<Rows.TopProduct> productos,
            List<Rows.SellerTotal> vendedores,
            List<Rows.DayTotal> porDia,
            List<Rows.SaleRow> ventas) {
    }

    private final ReportDao reportDao;

    public ReportService(ReportDao reportDao) {
        this.reportDao = reportDao;
    }

    public boolean isValidRange(String range) {
        return RANGES.containsKey(range);
    }

    public Report buildReport(String range) {
        Instant since = since(range);

        Rows.ReportTotals totals = reportDao.getTotals(since);
        long units = reportDao.getUnits(since);

        List<Rows.TopProduct> products = reportDao.topProducts(since).stream()
                .map(p -> new Rows.TopProduct(p.productId(), p.producto(), p.unidades(), money(p.monto())))
                .toList();
        List<Rows.SellerTotal> sellers = reportDao.bySeller(since).stream()
                .map(v -> new Rows.SellerTotal(v.sellerId(), v.vendedor(), v.username(), v.ventas(), money(v.total())))
                .toList();
        List<Rows.DayTotal> days = reportDao.byDay(since).stream()
                .map(d -> new Rows.DayTotal(d.dia(), d.ventas(), money(d.total())))
                .toList();
        List<Rows.SaleRow> sales = reportDao.findSales(since, 200);

        return new Report(range, RANGES.get(range), since,
                new Summary(totals.ventas(), units, money(totals.total())),
                products, sellers, days, sales);
    }

    /** Detalle por producto para la hoja "Productos" del Excel. */
    public List<Rows.ProductDetail> productDetail(Instant since) {
        return reportDao.productDetail(since);
    }

    /** Ventas del periodo (el Excel pide hasta 5000). */
    public List<Rows.SaleRow> sales(Instant since, int limit) {
        return reportDao.findSales(since, limit);
    }

    private static BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, RoundingMode.HALF_UP);
    }

    /** Inicio del periodo, igual que reportSince() de Node (hora local del servidor). */
    private static Instant since(String range) {
        ZonedDateTime now = ZonedDateTime.now();
        ZonedDateTime start = switch (range) {
            case "day" -> now.toLocalDate().atStartOfDay(now.getZone());
            case "week" -> now.minusDays(7);
            case "month" -> now.minusDays(30);
            case "year" -> now.minusYears(1);
            default -> now.minusYears(5);
        };
        return start.toInstant();
    }
}