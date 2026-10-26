package pe.minimelba.product.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ProductPageController {
    @GetMapping("/")
    public String productsPage() {
        return "products";
    }
}
