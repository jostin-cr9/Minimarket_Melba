package com.melba.controller;

import com.melba.dao.Rows;
import com.melba.model.Role;
import com.melba.model.User;
import com.melba.security.RequireRole;
import com.melba.service.ProductService;
import com.melba.service.SaleService;
import com.melba.service.UserService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequireRole(Role.ADMIN)
public class AdminController {

    private final ProductService productService;
    private final UserService userService;
    private final SaleService saleService;

    public AdminController(ProductService productService, UserService userService, SaleService saleService) {
        this.productService = productService;
        this.userService = userService;
        this.saleService = saleService;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        ProductService.AdminSummary data = productService.summary();
        return Map.of("summary", data.summary(), "lowStock", data.lowStock());
    }

    @GetMapping("/users")
    public Map<String, List<User>> users() {
        return Map.of("users", userService.findAll());
    }

    @GetMapping("/sales")
    public Map<String, List<Rows.SaleRow>> sales() {
        return Map.of("sales", saleService.findAll());
    }
}