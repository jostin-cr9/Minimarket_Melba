package pe.minimelba.order.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.minimelba.common.SessionAccess;
import pe.minimelba.common.SessionUser;
import pe.minimelba.order.service.OrderService;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orders;
    private final SessionAccess access;
    public OrderController(OrderService orders, SessionAccess access) { this.orders=orders; this.access=access; }
    public record StatusBody(String status) {}
    @PostMapping
    public ResponseEntity<Map<String,Object>> create(@RequestBody OrderRequest input,HttpSession session) {
        SessionUser user=access.requireRole(session,"comprador");
        return ResponseEntity.status(201).body(orders.create(input,user.id(),user.name()));
    }
    @GetMapping
    public Map<String,Object> list(@RequestParam(required=false) String status,HttpSession session) {
        SessionUser user=access.requireUser(session);
        return Map.of("orders",orders.list(status,"comprador".equals(user.role())?user.id():null));
    }
    @PatchMapping("/{id}/status")
    public Map<String,Object> change(@PathVariable long id,@RequestBody StatusBody body,HttpSession session) {
        SessionUser seller=access.requireRole(session,"vendedor","admin");
        Map<String,Object> result=orders.changeStatus(id,body.status(),seller.id());
        return Map.of("ok",true,"status",result.get("status"));
    }
    @PatchMapping("/{id}/cancel")
    public Map<String,Object> cancel(@PathVariable long id,HttpSession session) {
        SessionUser buyer=access.requireRole(session,"comprador"); return orders.cancel(id,buyer.id());
    }
}
