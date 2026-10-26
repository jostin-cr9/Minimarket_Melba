# Minimarket Melba - avance Java

Este módulo agrega una implementación Java del catálogo de productos. El proyecto original se conserva mientras se migra por partes.

## Requisitos

- JDK 17 o superior.
- Apache Maven 3.6.3 o superior.
- MySQL con la base `minimelba` creada usando el `schema.sql` de la raíz del repositorio.

Spring Boot 3.5.16 requiere Java 17 o superior y Maven 3.6.3 o superior. Referencia: https://docs.spring.io/spring-boot/3.5/system-requirements.html

## Configuración

Define las variables de entorno para conectar a MySQL. Los valores por defecto son para desarrollo local:

```powershell
$env:DB_URL = "jdbc:mysql://127.0.0.1:3306/minimelba?useUnicode=true&characterEncoding=utf8&serverTimezone=UTC"
$env:DB_USER = "root"
$env:DB_PASSWORD = ""
```

No guardes contraseñas reales en Git. La aplicación usa el `schema.sql` existente; no crea ni modifica el esquema automáticamente.

## Ejecutar y probar

Desde esta carpeta:

```powershell
mvn spring-boot:run
mvn test
```

La aplicación se inicia en `http://localhost:8080`. La interfaz de catálogo está en `/` y consume estos endpoints:

| Método | Ruta | Acción |
| --- | --- | --- |
| GET | `/api/products` | Listar productos activos |
| GET | `/api/products/{id}` | Consultar un producto activo |
| POST | `/api/products` | Crear producto |
| PUT | `/api/products/{id}` | Actualizar producto |
| DELETE | `/api/products/{id}` | Desactivar producto |

Ejemplo de cuerpo JSON para crear o actualizar:

```json
{
  "code": "7750099",
  "name": "Leche",
  "category": "Lácteos",
  "unit": "1 L",
  "price": 4.8,
  "stock": 24,
  "image": null
}
```

## Dónde se ve cada concepto

- **MVC:** `product/controller` traduce solicitudes HTTP y responde JSON; `product/model` representa el producto. La interfaz existente está en las páginas HTML/JS del proyecto original.
- **Servicio:** `product/service` concentra validaciones y reglas de la operación.
- **DAO:** `product/dao/ProductDao` define las operaciones de persistencia y `JdbcProductDao` las implementa con consultas parametrizadas.
- **SRP:** controlador, servicio y DAO tienen responsabilidades distintas.
- **DIP:** `ProductServiceImpl` depende de la interfaz `ProductDao`; Spring inyecta `JdbcProductDao`.
- **TDD/pruebas:** `ProductServiceImplTest` verifica normalización y validaciones usando un DAO simulado. Para evidenciar el ciclo TDD del curso, hagan commits pequeños empezando por una prueba que falle, luego el código mínimo y finalmente la refactorización.

La explicación para la sustentación está en [`docs/solid-tdd.md`](docs/solid-tdd.md) y el diagrama editable en [`docs/arquitectura.puml`](docs/arquitectura.puml).

## Alcance del avance

Este módulo cubre el catálogo y sus operaciones CRUD en Java. Todavía no migra autenticación, pedidos, ventas ni reportes desde Node.js. Por ello debe presentarse como un avance parcial, no como conversión completa del sistema ni como prueba automática de haber alcanzado el 30% de todas las funcionalidades: ese porcentaje depende de la lista oficial de requisitos del proyecto. La rúbrica también pide integrar y documentar Git/GitHub, hacer avances versionados, y preparar una presentación oral; esos pasos se completan en el repositorio y en el informe del curso.
