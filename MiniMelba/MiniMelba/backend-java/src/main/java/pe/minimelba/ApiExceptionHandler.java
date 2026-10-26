package pe.minimelba.product.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import pe.minimelba.common.ApiException;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, String>> apiError(ApiException error) {
        return ResponseEntity.status(error.status()).body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<Map<String, String>> duplicateCode(DuplicateKeyException error) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "Ya existe un producto con ese código."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> unexpected(Exception error) {
        log.error("Error interno atendiendo una solicitud API", error);
        return ResponseEntity.internalServerError()
                .body(Map.of("error", "Ocurrió un error interno. Intenta nuevamente."));
    }
}