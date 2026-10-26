package pe.minimelba.admin.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;
import pe.minimelba.common.SessionAccess;
import pe.minimelba.product.dao.ProductDao;
import pe.minimelba.sale.dao.SaleRepository;
import pe.minimelba.user.dao.UserDao;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final ProductDao products;
    private final UserDao users;
    private final SaleRepository sales;
    private final SessionAccess access;
    public AdminController(ProductDao products, UserDao users, SaleRepository sales, SessionAccess access) {
        this.products=products; this.users=users; this.sales=sales; this.access=access;
    }
    @GetMapping("/summary")
    public Map<String,Object> summary(HttpSession session) {
        access.requireRole(session,"admin");
        return Map.of("summary",products.getSummary(),"lowStock",products.findLowStock());
    }
    @GetMapping("/users")
    public Map<String,Object> users(HttpSession session) { access.requireRole(session,"admin"); return Map.of("users",users.findAll()); }
    @GetMapping("/sales")
    public Map<String,Object> sales(HttpSession session) { access.requireRole(session,"admin"); return Map.of("sales",sales.findAll()); }
}
