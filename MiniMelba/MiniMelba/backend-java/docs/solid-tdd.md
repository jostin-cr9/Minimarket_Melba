# Cómo explicar MVC, DAO, SOLID y TDD

## Recorrido de una operación

Al guardar un producto, el navegador envía `POST /api/products`. `ProductController` recibe la solicitud; `ProductServiceImpl` valida y normaliza los datos; `ProductDao` define el contrato de persistencia; `JdbcProductDao` ejecuta SQL parametrizado en MySQL. La respuesta vuelve como JSON.

```text
Vista (products.html + products.js)
              ↓ HTTP/JSON
ProductController (MVC: Controller)
              ↓
ProductServiceImpl (reglas de aplicación)
              ↓ ProductDao (contrato)
JdbcProductDao (DAO concreto)
              ↓
           MySQL
```

## Principios SOLID visibles en el módulo

- **S — Responsabilidad única:** el controlador atiende HTTP; el servicio valida las reglas del catálogo; el DAO consulta y actualiza MySQL.
- **O — Abierto/cerrado:** el servicio depende de `ProductDao`. Se puede añadir otra implementación de persistencia sin cambiar el controlador, siempre que respete el contrato. En este módulo aún no se incluye esa segunda implementación.
- **L — Sustitución de Liskov:** una implementación alternativa de `ProductDao` debe poder sustituir a `JdbcProductDao` y conservar el comportamiento esperado de listar, insertar, actualizar y desactivar.
- **I — Segregación de interfaces:** el módulo usa un contrato pequeño, dedicado a operaciones de productos; los consumidores no dependen de métodos de otras áreas como usuarios o reportes.
- **D — Inversión de dependencias:** `ProductServiceImpl` recibe `ProductDao` por constructor. Depende de la abstracción; Spring provee la implementación JDBC.

O, L e I se presentan aquí de forma básica, a partir del contrato de persistencia; no se agregan jerarquías ni capas ficticias solo para cumplir una lista.

## TDD y pruebas

`ProductServiceImplTest` comprueba tres comportamientos: normalizar datos antes de guardarlos, rechazar precio cero y rechazar stock negativo. Los errores de validación deben ocurrir antes de invocar al DAO.

Para demostrar el proceso TDD en Git, trabajen cada regla en ciclos pequeños:

1. Escriban una prueba para la regla y confirmen que falla.
2. Implementen el cambio mínimo para hacerla pasar.
3. Refactoricen sin romper las pruebas.
4. Hagan commits con mensajes claros que permitan seguir el avance.

Las pruebas existentes no sustituyen el historial que demuestra ese ciclo. Ejecutar `mvn test` requiere JDK y Maven.

## Seguridad y límites actuales

Las consultas usan parámetros en lugar de concatenar valores del usuario; los datos de conexión se configuran por entorno; el servicio valida campos y la eliminación del producto es lógica. Este avance todavía no agrega autenticación/autorización Java ni migra usuarios, pedidos, ventas y reportes. No se debe exponer este módulo públicamente como sistema terminado.
