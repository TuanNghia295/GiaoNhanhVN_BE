-- Create the database
CREATE DATABASE nestjs_boilerplate;

-- Grant all privileges to the user on the database
GRANT ALL PRIVILEGES ON DATABASE nestjs_boilerplate TO root;

Select  * from stores where name ilike '%MoMo Quán%';
SELECT  * FROM users WHERE id = 5457
SELECT * FROM products WHERE store_id = 3183
DELETE  FROM orders ;

DELETE FROM extras_to_order_details;
DELETE FROM vouchers_on_orders;

DELETE FROM locations
WHERE deliver_id = 46
  AND ctid NOT IN (
    SELECT MIN(ctid)
    FROM locations
    WHERE deliver_id = 46
);
SELECT  * from stores where area_id = 84;

-- Connect to the database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION Postgis

INSERT INTO stores (name, location)
VALUES ('Shop Out 1', ST_SetSRID(ST_MakePoint(106.572315, 10.933212), 4326)),
       ('Shop Out 2', ST_SetSRID(ST_MakePoint(106.503215, 10.934512), 4326)),
       ('Shop Out 3', ST_SetSRID(ST_MakePoint(106.700215, 11.003412), 4326)),
       ('Shop Out 4', ST_SetSRID(ST_MakePoint(106.710115, 11.042012), 4326)),
       ('Shop Out 5', ST_SetSRID(ST_MakePoint(106.609215, 11.013412), 4326)),
       ('Shop Out 6', ST_SetSRID(ST_MakePoint(106.578215, 10.989312), 4326)),
       ('Shop Out 7', ST_SetSRID(ST_MakePoint(106.621115, 10.972312), 4326)),
       ('Shop Out 8', ST_SetSRID(ST_MakePoint(106.695215, 11.024512), 4326)),
       ('Shop Out 9', ST_SetSRID(ST_MakePoint(106.689215, 10.956312), 4326)),
       ('Shop Out 10', ST_SetSRID(ST_MakePoint(106.722215, 10.993412), 4326)),
       ('Shop Out 11', ST_SetSRID(ST_MakePoint(106.620000, 11.010000), 4326)),
       ('Shop Out 12', ST_SetSRID(ST_MakePoint(106.640000, 10.971000), 4326)),
       ('Shop Out 13', ST_SetSRID(ST_MakePoint(106.675000, 11.001000), 4326)),
       ('Shop Out 14', ST_SetSRID(ST_MakePoint(106.651000, 11.002000), 4326)),
       ('Shop Out 15', ST_SetSRID(ST_MakePoint(106.610000, 10.991000), 4326)),
       ('Shop Out 16', ST_SetSRID(ST_MakePoint(106.685000, 10.963000), 4326)),
       ('Shop Out 17', ST_SetSRID(ST_MakePoint(106.673000, 11.015000), 4326)),
       ('Shop Out 18', ST_SetSRID(ST_MakePoint(106.707000, 10.995000), 4326)),
       ('Shop Out 19', ST_SetSRID(ST_MakePoint(106.665000, 10.980000), 4326)),
       ('Shop Out 20', ST_SetSRID(ST_MakePoint(106.703000, 11.011000), 4326)),
       ('Shop Out 21', ST_SetSRID(ST_MakePoint(106.688000, 10.987000), 4326)),
       ('Shop Out 22', ST_SetSRID(ST_MakePoint(106.678000, 11.017000), 4326)),
       ('Shop Out 23', ST_SetSRID(ST_MakePoint(106.620000, 11.003000), 4326)),
       ('Shop Out 24', ST_SetSRID(ST_MakePoint(106.681000, 11.026000), 4326)),
       ('Shop Out 25', ST_SetSRID(ST_MakePoint(106.654000, 10.975000), 4326));

SELECT *
from store_menus
where id = 4655

SELECT *
FROM products
WHERE products.store_id = 802
  AND products.category_item_id = 8

SELECT ST_Distance(
               ST_SetSRID(ST_MakePoint(105.44848235900008, 9.236780593000049), 4326)::geography,
               ST_SetSRID(ST_MakePoint(105.571814, 9.6771418), 4326)::geography
       ) / 1000 AS distance_km;

SELECT store_rate
FROM ratings
WHERE store_id = 2;


SELECT TO_CHAR("open_time", 'HH24:MI:SS')  AS openTimeFormatted,
       TO_CHAR("close_time", 'HH24:MI:SS') AS closeTimeFormatted
FROM stores
WHERE id = 14;



