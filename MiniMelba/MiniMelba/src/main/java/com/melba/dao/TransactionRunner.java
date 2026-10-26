package com.melba.dao;

import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Ejecuta un bloque dentro de una transacción.
 * Si el bloque lanza una excepción, se deshace todo (rollback); si termina bien, se confirma (commit).
 */
@Component
public class TransactionRunner {

    private final TransactionTemplate template;

    public TransactionRunner(PlatformTransactionManager transactionManager) {
        this.template = new TransactionTemplate(transactionManager);
    }

    public <T> T execute(Supplier<T> work) {
        return template.execute(status -> work.get());
    }
}