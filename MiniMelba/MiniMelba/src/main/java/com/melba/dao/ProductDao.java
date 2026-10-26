package com.melba.dao;

import com.melba.model.Product;
import java.util.List;
import java.util.Optional;

public interface ProductDao {

    List<Product> findAllActive();

    long create(Product product);

    /** Devuelve cuántas filas cambió (0 = no existe o ya estaba eliminado). */
    int update(long id, Product product);

    /** Eliminación lógica: el producto se desactiva, no se borra. */
    int deactivate(long id);

    Optional<Product> findActiveById(long id);

    /** Bloquea la fila (FOR UPDATE): usar solo dentro de una transacción. */
    Optional<Product> findActiveForUpdate(long id);

    /** Bloquea la fila y devuelve su stock (FOR UPDATE): usar solo dentro de una transacción. */
    Optional<Integer> lockStock(long id);

    void decreaseStock(long id, int quantity);

    Rows.StockSummary getSummary();

    List<Rows.LowStockProduct> findLowStock();
}