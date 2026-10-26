package pe.minimelba.report.service;

import org.springframework.stereotype.Service;
import pe.minimelba.report.dao.ReportRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;

@Service
public class ReportService {
    public static final Map<String, String> RANGES = Map.of("day", "Hoy", "week", "Últimos 7 días",
            "month", "Últimos 30 días", "year", "Último año", "5years", "Últimos 5 años");
    private final ReportRepository dao;
    public ReportService(ReportRepository dao) { this.dao = dao; }

    public Instant since(String range) {
        ZonedDateTime now = ZonedDateTime.now();
        return switch (range) {
            case "day" -> now.toLocalDate().atStartOfDay(now.getZone()).toInstant();
            case "week" -> now.minusDays(7).toInstant();
            case "month" -> now.minusDays(30).toInstant();
            case "year" -> now.minusYears(1).toInstant();
            case "5years" -> now.minusYears(5).toInstant();
            default -> throw new IllegalArgumentException("Periodo no válido. Usa: day, week, month, year o 5years.");
        };
    }

    public Map<String, Object> build(String range) {
        if (!RANGES.containsKey(range)) throw new IllegalArgumentException("Periodo no válido. Usa: day, week, month, year o 5years.");
        Instant from = since(range);
        Map<String,Object> totals = dao.totals(from);
        List<Map<String,Object>> products = dao.topProducts(from).stream().map(this::normalizeProduct).toList();
        List<Map<String,Object>> sellers = dao.bySeller(from).stream().map(this::normalizeSeller).toList();
        List<Map<String,Object>> days = dao.byDay(from).stream().map(this::normalizeDay).toList();
        Map<String,Object> result = new LinkedHashMap<>();
        result.put("range", range); result.put("label", RANGES.get(range)); result.put("since", from.toString());
        result.put("resumen", Map.of("ventas", number(totals.get("ventas")), "unidades", dao.units(from), "total", money(totals.get("total"))));
        result.put("productos", products); result.put("vendedores", sellers); result.put("porDia", days);
        result.put("ventas", dao.findSales(from, 200)); return result;
    }

    public Instant reportSince(String range) { if (!RANGES.containsKey(range)) throw new IllegalArgumentException("Periodo no válido. Usa: day, week, month, year o 5years."); return since(range); }
    public List<Map<String,Object>> productDetail(Instant since) { return dao.productDetail(since); }
    public List<Map<String,Object>> sales(Instant since, int limit) { return dao.findSales(since, limit); }
    public static BigDecimal money(Object value) { return new BigDecimal(String.valueOf(value)).setScale(2, RoundingMode.HALF_UP); }
    private static long number(Object v) { return ((Number)v).longValue(); }
    private Map<String,Object> normalizeProduct(Map<String,Object> p) { p.put("unidades", number(p.get("unidades"))); p.put("monto", money(p.get("monto"))); return p; }
    private Map<String,Object> normalizeSeller(Map<String,Object> p) { p.put("ventas", number(p.get("ventas"))); p.put("total", money(p.get("total"))); return p; }
    private Map<String,Object> normalizeDay(Map<String,Object> p) { p.put("ventas", number(p.get("ventas"))); p.put("total", money(p.get("total"))); return p; }
}
