# Cómo explicar MVC, DAO, SOLID y TDD

## Recorrido de una venta

El navegador envía `POST /api/sales`. `SaleController` verifica sesión y rol; `SaleService` valida artículos, calcula el total y coordina la transacción; `ProductDao` bloquea y actualiza stock; `SaleRepository` registra la venta; MySQL confirma las operaciones juntas.

```text
Vista HTML/JavaScript existente
              ↓ HTTP/JSON
Controller (permisos y respuesta HTTP)
              ↓
Service (reglas de negocio)
              ↓ interfaces DAO
Implementaciones JDBC
              ↓
           MySQL
```

## Principios SOLID visibles en el módulo

- **S — Responsabilidad única:** cada controlador atiende HTTP; cada servicio aplica reglas; cada DAO realiza persistencia.
- **O — Abierto/cerrado:** los servicios dependen de interfaces DAO. Se puede agregar una implementación compatible sin cambiar las reglas del pedido o la venta.
- **L — Sustitución de Liskov:** otra implementación de `OrderRepository`, `SaleRepository` u otro contrato debe conservar el resultado esperado y poder sustituir al DAO JDBC.
- **I — Segregación de interfaces:** los contratos se separan por dominio en lugar de agrupar todas las operaciones en un DAO gigante.
- **D — Inversión de dependencias:** los servicios reciben abstracciones por constructor. `OrderService` recibe `OrderRepository`, `ProductDao` y `SaleRepository`; Spring proporciona sus implementaciones JDBC.

O, L e I se presentan aquí de forma básica, a partir del contrato de persistencia; no se agregan jerarquías ni capas ficticias solo para cumplir una lista.

## TDD y pruebas

`ProductServiceImplTest` comprueba tres comportamientos: normalizar datos antes de guardarlos, rechazar precio cero y rechazar stock negativo sin invocar al DAO.

Para demostrar el proceso TDD en Git, trabajen cada regla en ciclos pequeños:

1. Escriban una prueba para la regla y confirmen que falla.
2. Implementen el cambio mínimo para hacerla pasar.
3. Refactoricen sin romper las pruebas.
4. Hagan commits con mensajes claros que permitan seguir el avance.

Las pruebas existentes no sustituyen el historial que demuestra ese ciclo. Ejecutar `mvn test` requiere JDK y Maven.

## Sesiones y seguridad

Las contraseñas se guardan con BCrypt. El ID de sesión se renueva al autenticar; los endpoints verifican roles; se limitan los intentos de registro e inicio de sesión; las entradas se validan y las consultas SQL usan parámetros. Los datos de conexión viven en `.env`, que no se debe subir a Git.
