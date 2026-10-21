CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','vendedor','comprador') NOT NULL DEFAULT 'comprador',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL,
  unit VARCHAR(40) NOT NULL DEFAULT 'unidad',
  price DECIMAL(10,2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  image VARCHAR(255) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  transaction_code VARCHAR(40) NOT NULL UNIQUE,
  seller_id BIGINT UNSIGNED NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_seller FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sale_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id),
  CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT IGNORE INTO products (id, code, name, category, unit, price, stock, image) VALUES
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
(12,'7750012','Plátano de seda','Frutas','1 kg',4.50,20,'img/produ/platano-seda.webp');
