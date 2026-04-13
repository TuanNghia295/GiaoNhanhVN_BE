
UPDATE public.products
SET "category_item_id" = coi."categoryItemId"
FROM public.category_item_on_products coi
WHERE public.products.id = coi."productId";