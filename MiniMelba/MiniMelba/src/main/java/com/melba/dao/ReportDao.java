package com.melba.dao;

import java.time.Instant;
import java.util.List;

public interface ReportDao {

    Rows.ReportTotals getTotals(Instant since);

    long getUnits(Instant since);

    List<Rows.TopProduct> topProducts(Instant since);

    List<Rows.SellerTotal> bySeller(Instant since);

    List<Rows.DayTotal> byDay(Instant since);

    List<Rows.SaleRow> findSales(Instant since, int limit);

    /** Detalle por producto para la hoja "Productos" del Excel. */
    List<Rows.ProductDetail> productDetail(Instant since);
}