ALTER TABLE ratings ADD COLUMN order_id_int integer;

-- Bước 2: Copy dữ liệu (nếu có thể ép kiểu)
UPDATE ratings SET order_id_int = order_id::integer;

-- Bước 3: Xóa cột cũ và đổi tên
ALTER TABLE ratings DROP COLUMN order_id;
ALTER TABLE ratings RENAME COLUMN order_id_int TO order_id;

ALTER TABLE ratings
    ALTER COLUMN user_id SET DATA TYPE integer USING user_id::integer,
    ALTER COLUMN store_id SET DATA TYPE integer USING store_id::integer,
    ALTER COLUMN deliver_id SET DATA TYPE integer USING deliver_id::integer;