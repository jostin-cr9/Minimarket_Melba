package pe.minimelba.product.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.minimelba.product.model.Product;
import pe.minimelba.product.service.ProductService;
import pe.minimelba.common.SessionAccess;
import pe.minimelba.common.SessionUser;
import jakarta.servlet.http.HttpSession;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService productService;
    private final SessionAccess access;

    public ProductController(ProductService productService, SessionAccess access) {
        this.productService = productService;
        this.access = access;
    }

    @GetMapping
    public java.util.Map<String, List<Product>> findAll(HttpSession session) {
        access.requireUser(session);
        return java.util.Map.of("products", productService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> findById(@PathVariable long id, HttpSession session) {
        access.requireUser(session);
        return productService.findById(id).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Product> create(@RequestBody Product product, HttpSession session) {
        access.requireRole(session,"admin");
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(product));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> update(@PathVariable long id, @RequestBody Product product, HttpSession session) {
        access.requireRole(session,"admin");
        return productService.update(id, product) ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable long id, HttpSession session) {
        access.requireRole(session,"admin");
        return productService.deactivate(id) ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
