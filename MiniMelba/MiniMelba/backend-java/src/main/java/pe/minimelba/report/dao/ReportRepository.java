package pe.minimelba.report.dao;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public interface ReportRepository {
    Map<String,Object> totals(Instant since);
    long units(Instant since);
    List<Map<String,Object>> topProducts(Instant since);
    List<Map<String,Object>> bySeller(Instant since);
    List<Map<String,Object>> byDay(Instant since);
    List<Map<String,Object>> findSales(Instant since, int limit);
    List<Map<String,Object>> productDetail(Instant since);
}
