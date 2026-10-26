package com.melba.controller;

import com.melba.model.Product;
import com.melba.model.Role;
import com.melba.security.RequireAuth;
import com.melba.security.RequireRole;
import com.melba.security.SessionUser;
import com.melba.service.ProductService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping
    @RequireAuth
    public Map<String, List<Product>> list() {
        return Map.of("products", service.findAllActive());
    }

    @PostMapping
    @RequireRole(Role.ADMIN)
    public ResponseEntity<Map<String, Object>> create(
            @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        SessionUser user = SessionUser.of(request);
        Map<String, Object> product = service.create(body == null ? Map.of() : body, user.username());
        return ResponseEntity.status(201).body(Map.of("product", product));
    }

    @PutMapping("/{id}")
    @RequireRole(Role.ADMIN)
    public Map<String, Boolean> update(@PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        SessionUser user = SessionUser.of(request);
        service.update(id, body == null ? Map.of() : body, user.username());
        return Map.of("ok", true);
    }

    @DeleteMapping("/{id}")
    @RequireRole(Role.ADMIN)
    public ResponseEntity<Void> delete(@PathVariable String id, HttpServletRequest request) {
        SessionUser user = SessionUser.of(request);
        service.delete(id, user.username());
        return ResponseEntity.noContent().build();
    }
}