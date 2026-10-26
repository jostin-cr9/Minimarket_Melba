package com.melba.controller;

import com.melba.model.Role;
import com.melba.security.RequireRole;
import com.melba.security.SessionUser;
import com.melba.service.SaleService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sales")
public class SaleController {

    private final SaleService service;

    public SaleController(SaleService service) {
        this.service = service;
    }

    @PostMapping
    @RequireRole(Role.VENDEDOR)
    public ResponseEntity<SaleService.CashSale> register(
            @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        SaleService.CashSale sale = service.registerCashSale(body == null ? Map.of() : body,
                SessionUser.of(request));
        return ResponseEntity.status(201).body(sale);
    }
}