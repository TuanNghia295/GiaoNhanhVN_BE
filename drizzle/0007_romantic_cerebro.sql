-- 1. Tạo sequence mới
CREATE SEQUENCE banks_id_seq;

-- 2. Gán sequence làm DEFAULT cho cột
ALTER TABLE banks ALTER COLUMN id SET DEFAULT nextval('banks_id_seq');

-- 3. Đảm bảo sequence khớp giá trị hiện tại
SELECT setval('banks_id_seq', (SELECT MAX(id) FROM banks));
