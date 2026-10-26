package com.melba.controller;

import com.melba.model.Order;
import com.melba.model.OrderStatus;
import com.melba.model.Role;
import com.melba.security.RequireAuth;
import com.melba.security.RequireRole;
import com.melba.security.SessionUser;
import com.melba.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @PostMapping
    @RequireRole(Role.COMPRADOR)
    public ResponseEntity<Map<String, Object>> create(
            @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        SessionUser buyer = SessionUser.of(request);
        OrderService.CreatedOrder created = service.create(body == null ? Map.of() : body, buyer);

        Map<String, Object> order = new LinkedHashMap<>();
        order.put("id", created.id());
        order.put("code", created.code());
        order.put("total", created.total());
        order.put("status", created.status());
        return ResponseEntity.status(201).body(Map.of("order", order));
    }

    @GetMapping
    @RequireAuth
    public Map<String, List<Order>> list(
            @RequestParam(required = false) String status, HttpServletRequest request) {
        return Map.of("orders", service.list(SessionUser.of(request), status));
    }

    @PatchMapping("/{id}/status")
    @RequireRole({Role.VENDEDOR, Role.ADMIN})
    public Map<String, Object> changeStatus(@PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        Object status = body == null ? null : body.get("status");
        OrderStatus result = service.changeStatus(id, status, SessionUser.of(request));
        return Map.of("ok", true, "status", result);
    }

    @PatchMapping("/{id}/cancel")
    @RequireRole(Role.COMPRADOR)
    public Map<String, Object> cancel(@PathVariable String id, HttpServletRequest request) {
        service.cancel(id, SessionUser.of(request));
        return Map.of("ok", true, "status", OrderStatus.CANCELADO);
    }
}