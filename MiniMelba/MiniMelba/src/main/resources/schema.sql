CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'comprador' CHECK (role IN ('admin','vendedor','comprador')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL,
  unit VARCHAR(40) NOT NULL DEFAULT 'unidad',
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image VARCHAR(255),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  transaction_code VARCHAR(40) NOT NULL UNIQUE,
  seller_id BIGINT NOT NULL REFERENCES users(id),
  customer_name VARCHAR(120) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  product_name VARCHAR(120) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  unit_price DECIMAL(10,2) NOT NULL
);

INSERT INTO products (id, code, name, category, unit, price, stock, image) VALUES
(1,'7750001','Leche Gloria','Lácteos','1 L',4.80,24,'img/produ/leche-gloria.webp'),
(2,'7750002','Arroz Costeño','Abarrotes','1 kg',4.20,40,'img/produ/arroz-costeno.webp'),
(3,'7750003','Aceite Primor','Abarrotes','1 L',9.50,4,'img/produ/aceite-primor.webp'),
(4,'7750004','Azúcar Rubia','Abarrotes','1 kg',3.90,18,'img/produ/azucar-rubia.webp'),
(5,'7750005','Inca Kola','Bebidas','1.5 L',7.50,3,'img/produ/inca-kola.webp'),
(6,'7750006','Pollo entero','Carnes','1 kg',11.90,12,'img/produ/pollo-entero.webp'),
(7,'7750007','Pan francés','Panadería','1 und',0.30,100,'img/produ/pan-frances.webp'),
(8,'7750008','Detergente Ariel','Limpieza','500 g',6.80,5,'img/produ/detergente-ariel.webp'),
(9,'7750009','Yogurt Gloria','Lácteos','1 L',7.50,15,'img/produ/yogurt-gloria.webp'),
(10,'7750010','Agua San Luis','Bebidas','625 ml',1.50,30,'img/produ/agua-san-luis.webp'),
(11,'7750011','Manzana','Frutas','1 kg',6.00,20,'img/produ/manzana.webp'),
(12,'7750012','Plátano de seda','Frutas','1 kg',4.50,20,'img/produ/platano-seda.webp')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('products', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM products), 1), 1), TRUE);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_code VARCHAR(40) NOT NULL UNIQUE,
  buyer_id BIGINT NOT NULL REFERENCES users(id),
  customer_name VARCHAR(120) NOT NULL,
  delivery_type VARCHAR(30) NOT NULL,
  address VARCHAR(255),
  payment_method VARCHAR(30) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','armado','completado','cancelado')),
  stock_reserved BOOLEAN NOT NULL DEFAULT FALSE,
  seller_id BIGINT REFERENCES users(id),
  sale_id BIGINT REFERENCES sales(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  product_name VARCHAR(120) NOT NULL,
  unit VARCHAR(40) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  unit_price DECIMAL(10,2) NOT NULL
);