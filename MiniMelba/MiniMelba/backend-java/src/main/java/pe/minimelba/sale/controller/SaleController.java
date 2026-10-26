package pe.minimelba.sale.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.minimelba.common.SessionAccess;
import pe.minimelba.common.SessionUser;
import pe.minimelba.sale.service.SaleService;
import java.util.Map;

@RestController
@RequestMapping("/api/sales")
public class SaleController {
    private final SaleService sales;
    private final SessionAccess access;
    public SaleController(SaleService sales, SessionAccess access) { this.sales=sales; this.access=access; }
    @PostMapping
    public ResponseEntity<Map<String,Object>> create(@RequestBody SalesRequest request, HttpSession session) {
        SessionUser user=access.requireRole(session,"vendedor");
        return ResponseEntity.status(201).body(sales.create(request,user.id()));
    }
}
