-- Update existing products and drafts that have no explicit ends_at
-- This sets their validity to 10 days from now, ensuring they show up in the active list
-- and have a countdown timer.

UPDATE public.products 
SET ends_at = now() + interval '10 days'
WHERE ends_at IS NULL;

UPDATE public.draft_products 
SET ends_at = now() + interval '10 days'
WHERE ends_at IS NULL;
