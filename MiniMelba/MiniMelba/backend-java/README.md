# Minimarket Melba en Java

Backend Java para las funciones originales del minimarket. Conserva las páginas HTML/CSS/JavaScript existentes y sus rutas `/api`; Spring Boot sirve la interfaz y atiende los flujos de autenticación, inventario, pedidos, ventas, administración y reportes. El esquema de MySQL es el `schema.sql` de la raíz.

## Requisitos y configuración

- JDK 17 o superior.
- Apache Maven 3.6.3 o superior.
- MySQL con el esquema de la raíz inicializado.

El backend carga el `.env` de la raíz del repositorio con las mismas variables del servidor anterior. Si aún no tienes `.env`, copia `.env.example` a `.env` y configura el usuario y contraseña de MySQL. `.env` está ignorado por Git. La aplicación no crea ni modifica el esquema automáticamente.

Spring Boot 3.5.16 requiere Java 17 o superior y Maven 3.6.3 o superior: https://docs.spring.io/spring-boot/3.5/system-requirements.html

## Ejecutar

Desde la raíz del repositorio, inicia la aplicación Java con:

```powershell
npm start
```

El script usa Maven Wrapper, así que no necesitas agregar Maven al `PATH`. También puedes ejecutar tareas Maven desde esta carpeta:

```powershell
$env:MAVEN_USER_HOME = (Join-Path (Get-Location) 'target/maven-wrapper')
.\mvnw.cmd '-Dmaven.repo.local=target/maven-repository' test
.\mvnw.cmd '-Dmaven.repo.local=target/maven-repository' spring-boot:run
```

Abre `http://localhost:3000`. El servidor Node anterior ya no es el comando predeterminado.

## Funciones y rutas compatibles

| Función | Rutas principales |
| --- | --- |
| Sesión | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Productos | `GET /api/products`, `GET /api/products/{id}`, `POST /api/products`, `PUT /api/products/{id}`, `DELETE /api/products/{id}` |
| Pedidos | `POST /api/orders`, `GET /api/orders`, `PATCH /api/orders/{id}/status`, `PATCH /api/orders/{id}/cancel` |
| Caja | `POST /api/sales` |
| Administración | `GET /api/admin/summary`, `/api/admin/users`, `/api/admin/sales` |
| Reportes | `GET /api/admin/reports?range=day`, `GET /api/admin/reports/excel?range=day` |
| Estado | `GET /api/health` |

El inicio original está en `/`. La página adicional de ejemplo del catálogo está en `/catalogo-java`.

## Arquitectura

- **MVC:** controladores REST en `*/controller`, modelos/DTO en `*/model` o records de solicitud, vistas HTML existentes en los recursos estáticos.
- **Servicios:** `AuthService`, `OrderService`, `SaleService`, `ReportService` y `ProductServiceImpl` concentran reglas y transacciones.
- **DAO:** interfaces `ProductDao`, `UserDao`, `OrderRepository`, `SaleRepository` y `ReportRepository`; las implementaciones JDBC consultan MySQL con parámetros.
- **SOLID:** SRP separa HTTP, reglas y persistencia; los servicios dependen de interfaces (DIP); los contratos se dividen por dominio (ISP); las implementaciones intercambiables deben respetar LSP; se pueden añadir implementaciones compatibles sin reescribir reglas (OCP).
- **TDD:** hay pruebas unitarias para productos, autenticación, pedidos y ventas. Para explicar el ciclo, muestra cómo se define primero el caso de prueba, se implementa la regla y se mantiene la suite en verde.
- **Seguridad:** contraseñas BCrypt, cambio del ID de sesión al autenticar, autorización por rol, límite de intentos, validaciones, SQL parametrizado y configuración sensible fuera del código.

El diagrama editable está en [`docs/arquitectura.puml`](docs/arquitectura.puml) y la explicación para la sustentación en [`docs/solid-tdd.md`](docs/solid-tdd.md).
