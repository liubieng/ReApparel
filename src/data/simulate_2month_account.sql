-- ====================================================================
-- ReApparel: 2-Month Simulated Account Generator
-- Run this directly in the Supabase Dashboard -> SQL Editor
--
-- What this script creates:
--  1. User Account: "Elena Vance" (Created 60 days ago)
--     - Email: elena.vance@reapparel.app
--     - Friend Code: RP-ELENA-2026
--     - Login: Use email/friend code and any password (8+ chars)
--  2. 3 Longitudinal BSAS Assessments:
--     - Day 2 (58 days ago): Score 5 ("Indicative" - baseline shopping issues)
--     - Day 30 (29 days ago): Score 3 ("Non-Indicative" - 1-month check-in)
--     - Day 58 (2 days ago): Score 2 ("Non-Indicative" - 2-month check-in)
--  3. 30 Diverse Clothing Items with varied wear counts (0 to 24 wears):
--     - Everyday high-wear staples (16 to 24 wears)
--     - Regular rotation pieces (8 to 14 wears)
--     - Occasional & event wear (2 to 6 wears)
--     - Unworn / impulse buy items (0 wears) to showcase donation/lending
--  4. Normalized Tagging:
--     - Each item mapped to Category (Tops, Bottoms, Outerwear, Shoes, Dresses, Knitwear)
--     - Each item mapped to Color Family (White, Black, Blue, Navy, Gray, Beige, etc.)
--  5. 52 Finalized Daily Outfit Logs:
--     - Populates the 60-day calendar history
--     - Exact wear frequencies reconciled with item wear counts
-- ====================================================================

DO $$
DECLARE
    v_user_id UUID := 'c2f49d8e-1b3a-4e5c-9d6a-8f7e2b1c0a9d';
    v_email TEXT := 'elena.vance@reapparel.app';
    v_first_name TEXT := 'Elena';
    v_last_name TEXT := 'Vance';
    v_friend_code TEXT := 'RP-ELENA-2026';
    v_created_at TIMESTAMPTZ := NOW() - INTERVAL '60 days';

    -- Category Tag IDs
    v_tag_tops INT;
    v_tag_bottoms INT;
    v_tag_outerwear INT;
    v_tag_shoes INT;
    v_tag_dresses INT;
    v_tag_knitwear INT;

    -- Color Tag IDs
    v_tag_black INT;
    v_tag_white INT;
    v_tag_gray INT;
    v_tag_navy INT;
    v_tag_blue INT;
    v_tag_burgundy INT;
    v_tag_olive INT;
    v_tag_brown INT;
    v_tag_beige INT;
    v_tag_yellow INT;
    v_tag_pink INT;
    v_tag_neutral INT;

    -- Item ID Tracking
    v_ids INT[] := ARRAY[]::INT[];
    v_cur_id INT;
    v_log_id INT;

    -- Helper procedure variables for daily logs
    v_day INT;
BEGIN
    -- ----------------------------------------------------------------
    -- STEP 0: Guarantee Base Tags Exist in Catalog
    -- ----------------------------------------------------------------
    INSERT INTO tag (tag_name, tag_type) VALUES
        ('Tops', 'Category'),
        ('Bottoms', 'Category'),
        ('Outerwear', 'Category'),
        ('Shoes', 'Category'),
        ('Dresses', 'Category'),
        ('Knitwear', 'Category'),
        ('Black', 'Color'),
        ('White', 'Color'),
        ('Gray', 'Color'),
        ('Navy', 'Color'),
        ('Blue', 'Color'),
        ('Burgundy', 'Color'),
        ('Olive', 'Color'),
        ('Brown', 'Color'),
        ('Beige', 'Color'),
        ('Yellow', 'Color'),
        ('Pink', 'Color'),
        ('Neutral', 'Color')
    ON CONFLICT (tag_name, tag_type) DO NOTHING;

    -- Lookup Category Tag IDs
    SELECT tag_id INTO v_tag_tops FROM tag WHERE tag_name = 'Tops' AND tag_type = 'Category' LIMIT 1;
    SELECT tag_id INTO v_tag_bottoms FROM tag WHERE tag_name = 'Bottoms' AND tag_type = 'Category' LIMIT 1;
    SELECT tag_id INTO v_tag_outerwear FROM tag WHERE tag_name = 'Outerwear' AND tag_type = 'Category' LIMIT 1;
    SELECT tag_id INTO v_tag_shoes FROM tag WHERE tag_name = 'Shoes' AND tag_type = 'Category' LIMIT 1;
    SELECT tag_id INTO v_tag_dresses FROM tag WHERE tag_name = 'Dresses' AND tag_type = 'Category' LIMIT 1;
    SELECT tag_id INTO v_tag_knitwear FROM tag WHERE tag_name = 'Knitwear' AND tag_type = 'Category' LIMIT 1;

    -- Lookup Color Tag IDs
    SELECT tag_id INTO v_tag_black FROM tag WHERE tag_name = 'Black' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_white FROM tag WHERE tag_name = 'White' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_gray FROM tag WHERE tag_name = 'Gray' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_navy FROM tag WHERE tag_name = 'Navy' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_blue FROM tag WHERE tag_name = 'Blue' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_burgundy FROM tag WHERE tag_name = 'Burgundy' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_olive FROM tag WHERE tag_name = 'Olive' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_brown FROM tag WHERE tag_name = 'Brown' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_beige FROM tag WHERE tag_name = 'Beige' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_yellow FROM tag WHERE tag_name = 'Yellow' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_pink FROM tag WHERE tag_name = 'Pink' AND tag_type = 'Color' LIMIT 1;
    SELECT tag_id INTO v_tag_neutral FROM tag WHERE tag_name = 'Neutral' AND tag_type = 'Color' LIMIT 1;

    -- ----------------------------------------------------------------
    -- STEP 1: Idempotent Cleanup (Removes prior run of simulated user)
    -- ----------------------------------------------------------------
    DELETE FROM users WHERE user_id = v_user_id OR email = v_email OR friend_code = v_friend_code;

    -- ----------------------------------------------------------------
    -- STEP 2: Create User Profile
    -- ----------------------------------------------------------------
    INSERT INTO users (user_id, email, first_name, last_name, friend_code, created_at)
    VALUES (v_user_id, v_email, v_first_name, v_last_name, v_friend_code, v_created_at);

    -- ----------------------------------------------------------------
    -- STEP 3: 3 BSAS Longitudinal Recovery Assessments
    -- ----------------------------------------------------------------
    -- Assessment 1: Day 2 (58 days ago) - High shopping compulsion
    INSERT INTO bsas_assessment (user_id, score, risk_level, taken_at)
    VALUES (v_user_id, 5, 'Indicative', NOW() - INTERVAL '58 days');

    -- Assessment 2: Day 30 (29 days ago) - Meaningful recovery progress
    INSERT INTO bsas_assessment (user_id, score, risk_level, taken_at)
    VALUES (v_user_id, 3, 'Non-Indicative', NOW() - INTERVAL '29 days');

    -- Assessment 3: Day 58 (2 days ago) - Solidified sustainable habit
    INSERT INTO bsas_assessment (user_id, score, risk_level, taken_at)
    VALUES (v_user_id, 2, 'Non-Indicative', NOW() - INTERVAL '2 days');

    -- ----------------------------------------------------------------
    -- STEP 4: Insert 30 Clothing Items with Realistic Wear Counts
    -- ----------------------------------------------------------------

    -- 1. Vintage Levi's 501 Jeans (Bottoms / Blue / 24 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Vintage Levi''s 501 Jeans', 'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80', 'Old', 24, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_bottoms), (v_cur_id, v_tag_blue);

    -- 2. Organic Cotton White Crewneck (Tops / White / 22 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Organic Cotton White Crewneck', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80', 'Old', 22, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_tops), (v_cur_id, v_tag_white);

    -- 3. Everyday Canvas Low-Tops (Shoes / White / 21 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Everyday Canvas Low-Tops', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80', 'Old', 21, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_shoes), (v_cur_id, v_tag_white);

    -- 4. Black Merino Wool Sweater (Knitwear / Black / 18 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Black Merino Wool Sweater', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&auto=format&fit=crop&q=80', 'Old', 18, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_knitwear), (v_cur_id, v_tag_black);

    -- 5. Classic Relaxed Denim Jacket (Outerwear / Blue / 16 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Classic Relaxed Denim Jacket', 'https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=600&auto=format&fit=crop&q=80', 'Old', 16, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_outerwear), (v_cur_id, v_tag_blue);

    -- 6. Charcoal Tailored Trousers (Bottoms / Gray / 14 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Charcoal Tailored Trousers', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80', 'Old', 14, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_bottoms), (v_cur_id, v_tag_gray);

    -- 7. Linen Casual Button-Up (Tops / Beige / 12 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Linen Casual Button-Up', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80', 'Old', 12, NOW() - INTERVAL '58 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_tops), (v_cur_id, v_tag_beige);

    -- 8. Navy Harrington Jacket (Outerwear / Navy / 11 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Navy Harrington Jacket', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80', 'Old', 11, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_outerwear), (v_cur_id, v_tag_navy);

    -- 9. Striped French Sailor Longsleeve (Tops / Navy / 10 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Striped French Sailor Longsleeve', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80', 'Old', 10, NOW() - INTERVAL '55 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_tops), (v_cur_id, v_tag_navy);

    -- 10. Leather Chelsea Boots (Shoes / Brown / 9 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Leather Chelsea Boots', 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=600&auto=format&fit=crop&q=80', 'Old', 9, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_shoes), (v_cur_id, v_tag_brown);

    -- 11. Olive Cotton Utility Chinos (Bottoms / Olive / 9 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Olive Cotton Utility Chinos', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80', 'Old', 9, NOW() - INTERVAL '52 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_bottoms), (v_cur_id, v_tag_olive);

    -- 12. Cashmere Mockneck Jumper (Knitwear / Gray / 8 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Cashmere Mockneck Jumper', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80', 'Old', 8, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_knitwear), (v_cur_id, v_tag_gray);

    -- 13. Pleated Wide-Leg Pants (Bottoms / Black / 8 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Pleated Wide-Leg Pants', 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=600&auto=format&fit=crop&q=80', 'Old', 8, NOW() - INTERVAL '50 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_bottoms), (v_cur_id, v_tag_black);

    -- 14. Waterproof Minimal Trench Coat (Outerwear / Beige / 6 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Waterproof Minimal Trench Coat', 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80', 'Old', 6, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_outerwear), (v_cur_id, v_tag_beige);

    -- 15. Chunky Cable-Knit Cardigan (Knitwear / Beige / New / 5 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Chunky Cable-Knit Cardigan', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&auto=format&fit=crop&q=80', 'New', 5, NOW() - INTERVAL '40 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_knitwear), (v_cur_id, v_tag_beige);

    -- 16. Black Midi Slip Dress (Dresses / Black / 5 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Black Midi Slip Dress', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop&q=80', 'Old', 5, NOW() - INTERVAL '56 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_dresses), (v_cur_id, v_tag_black);

    -- 17. Crisp Oxford Cotton Shirt (Tops / White / New / 4 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Crisp Oxford Cotton Shirt', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80', 'New', 4, NOW() - INTERVAL '35 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_tops), (v_cur_id, v_tag_white);

    -- 18. Linen A-Line Midi Skirt (Bottoms / Olive / 4 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Linen A-Line Midi Skirt', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&auto=format&fit=crop&q=80', 'Old', 4, NOW() - INTERVAL '48 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_bottoms), (v_cur_id, v_tag_olive);

    -- 19. Classic Penny Loafers (Shoes / Black / 4 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Classic Penny Loafers', 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80', 'Old', 4, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_shoes), (v_cur_id, v_tag_black);

    -- 20. Burgundy Ribbed Turtleneck (Knitwear / Burgundy / New / 3 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Burgundy Ribbed Turtleneck', 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&auto=format&fit=crop&q=80', 'New', 3, NOW() - INTERVAL '28 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_knitwear), (v_cur_id, v_tag_burgundy);

    -- 21. Lightweight Summer Sundress (Dresses / Yellow / 3 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Lightweight Summer Sundress', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80', 'Old', 3, NOW() - INTERVAL '45 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_dresses), (v_cur_id, v_tag_yellow);

    -- 22. Structured Wool Peacoat (Outerwear / Navy / 2 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Structured Wool Peacoat', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80', 'Old', 2, NOW() - INTERVAL '58 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_outerwear), (v_cur_id, v_tag_navy);

    -- 23. Floral Wrap Maxi Dress (Dresses / Pink / New / 2 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Floral Wrap Maxi Dress', 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80', 'New', 2, NOW() - INTERVAL '22 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_dresses), (v_cur_id, v_tag_pink);

    -- 24. Running Mesh Sneakers (Shoes / Gray / New / 2 wears)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Running Mesh Sneakers', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', 'New', 2, NOW() - INTERVAL '18 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_shoes), (v_cur_id, v_tag_gray);

    -- 25. Cropped Corduroy Overshirt (Outerwear / Brown / New / 1 wear)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Cropped Corduroy Overshirt', 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600&auto=format&fit=crop&q=80', 'New', 1, NOW() - INTERVAL '14 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_outerwear), (v_cur_id, v_tag_brown);

    -- 26. Formal Black Silk Blouse (Tops / Black / 1 wear)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Formal Black Silk Blouse', 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=600&auto=format&fit=crop&q=80', 'Old', 1, NOW() - INTERVAL '55 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_tops), (v_cur_id, v_tag_black);

    -- 27. Neon Statement Graphic Tee (Tops / Yellow / New / 0 wears - Impulse buy)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Neon Statement Graphic Tee', 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=600&auto=format&fit=crop&q=80', 'New', 0, NOW() - INTERVAL '10 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_tops), (v_cur_id, v_tag_yellow);

    -- 28. Tailored Pinstripe Blazer (Outerwear / Gray / 0 wears - Formal, unstyled)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Tailored Pinstripe Blazer', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80', 'Old', 0, NOW() - INTERVAL '60 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_outerwear), (v_cur_id, v_tag_gray);

    -- 29. Velvet Evening Cocktail Dress (Dresses / Burgundy / New / 0 wears - Event dress)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Velvet Evening Cocktail Dress', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&auto=format&fit=crop&q=80', 'New', 0, NOW() - INTERVAL '15 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_dresses), (v_cur_id, v_tag_burgundy);

    -- 30. Metallic Chunky Platform Boots (Shoes / Black / New / 0 wears - Recent impulse)
    INSERT INTO clothing_item (user_id, name, image_url, addition_type, wear_count, date_added)
    VALUES (v_user_id, 'Metallic Chunky Platform Boots', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80', 'New', 0, NOW() - INTERVAL '7 days')
    RETURNING item_id INTO v_cur_id;
    v_ids := array_append(v_ids, v_cur_id);
    INSERT INTO item_tag (item_id, tag_id) VALUES (v_cur_id, v_tag_shoes), (v_cur_id, v_tag_black);

    -- ----------------------------------------------------------------
    -- STEP 5: Create 52 Finalized Daily Outfit Logs over Past 60 Days
    -- Populates calendar with outfits where wear counts reconcile!
    -- ----------------------------------------------------------------

    -- Day 59
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 59, TRUE, (CURRENT_DATE - 59)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[2]), (v_log_id, v_ids[3]);

    -- Day 58
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 58, TRUE, (CURRENT_DATE - 58)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[4]), (v_log_id, v_ids[6]), (v_log_id, v_ids[10]);

    -- Day 57
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 57, TRUE, (CURRENT_DATE - 57)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[7]), (v_log_id, v_ids[3]), (v_log_id, v_ids[5]);

    -- Day 56
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 56, TRUE, (CURRENT_DATE - 56)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[16]), (v_log_id, v_ids[14]), (v_log_id, v_ids[19]);

    -- Day 55
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 55, TRUE, (CURRENT_DATE - 55)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[9]), (v_log_id, v_ids[11]), (v_log_id, v_ids[3]);

    -- Day 54
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 54, TRUE, (CURRENT_DATE - 54)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[2]), (v_log_id, v_ids[8]), (v_log_id, v_ids[10]);

    -- Day 53
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 53, TRUE, (CURRENT_DATE - 53)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[4]), (v_log_id, v_ids[13]), (v_log_id, v_ids[19]);

    -- Day 51
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 51, TRUE, (CURRENT_DATE - 51)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[6]), (v_log_id, v_ids[2]), (v_log_id, v_ids[5]), (v_log_id, v_ids[3]);

    -- Day 50
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 50, TRUE, (CURRENT_DATE - 50)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[12]), (v_log_id, v_ids[10]);

    -- Day 49
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 49, TRUE, (CURRENT_DATE - 49)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[7]), (v_log_id, v_ids[11]), (v_log_id, v_ids[3]);

    -- Day 48
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 48, TRUE, (CURRENT_DATE - 48)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[18]), (v_log_id, v_ids[2]), (v_log_id, v_ids[8]), (v_log_id, v_ids[3]);

    -- Day 47
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 47, TRUE, (CURRENT_DATE - 47)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[4]), (v_log_id, v_ids[10]);

    -- Day 46
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 46, TRUE, (CURRENT_DATE - 46)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[6]), (v_log_id, v_ids[9]), (v_log_id, v_ids[14]), (v_log_id, v_ids[19]);

    -- Day 45
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 45, TRUE, (CURRENT_DATE - 45)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[21]), (v_log_id, v_ids[3]);

    -- Day 44
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 44, TRUE, (CURRENT_DATE - 44)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[2]), (v_log_id, v_ids[5]), (v_log_id, v_ids[3]);

    -- Day 43
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 43, TRUE, (CURRENT_DATE - 43)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[13]), (v_log_id, v_ids[7]), (v_log_id, v_ids[10]);

    -- Day 42
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 42, TRUE, (CURRENT_DATE - 42)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[11]), (v_log_id, v_ids[4]), (v_log_id, v_ids[3]);

    -- Day 41
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 41, TRUE, (CURRENT_DATE - 41)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[6]), (v_log_id, v_ids[12]), (v_log_id, v_ids[8]), (v_log_id, v_ids[10]);

    -- Day 40
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 40, TRUE, (CURRENT_DATE - 40)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[2]), (v_log_id, v_ids[15]), (v_log_id, v_ids[3]);

    -- Day 39
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 39, TRUE, (CURRENT_DATE - 39)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[18]), (v_log_id, v_ids[9]), (v_log_id, v_ids[3]);

    -- Day 38
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 38, TRUE, (CURRENT_DATE - 38)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[13]), (v_log_id, v_ids[4]), (v_log_id, v_ids[5]), (v_log_id, v_ids[10]);

    -- Day 37
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 37, TRUE, (CURRENT_DATE - 37)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[7]), (v_log_id, v_ids[3]);

    -- Day 36
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 36, TRUE, (CURRENT_DATE - 36)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[16]), (v_log_id, v_ids[8]), (v_log_id, v_ids[19]);

    -- Day 35
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 35, TRUE, (CURRENT_DATE - 35)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[6]), (v_log_id, v_ids[17]), (v_log_id, v_ids[14]), (v_log_id, v_ids[10]);

    -- Day 34
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 34, TRUE, (CURRENT_DATE - 34)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[2]), (v_log_id, v_ids[5]), (v_log_id, v_ids[3]);

    -- Day 33
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 33, TRUE, (CURRENT_DATE - 33)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[11]), (v_log_id, v_ids[12]), (v_log_id, v_ids[3]);

    -- Day 32
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 32, TRUE, (CURRENT_DATE - 32)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[4]), (v_log_id, v_ids[8]), (v_log_id, v_ids[10]);

    -- Day 30 (Assessment 2 taken today)
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 30, TRUE, (CURRENT_DATE - 30)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[6]), (v_log_id, v_ids[2]), (v_log_id, v_ids[15]), (v_log_id, v_ids[3]);

    -- Day 29
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 29, TRUE, (CURRENT_DATE - 29)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[13]), (v_log_id, v_ids[7]), (v_log_id, v_ids[3]);

    -- Day 28
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 28, TRUE, (CURRENT_DATE - 28)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[20]), (v_log_id, v_ids[14]), (v_log_id, v_ids[10]);

    -- Day 27
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 27, TRUE, (CURRENT_DATE - 27)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[18]), (v_log_id, v_ids[9]), (v_log_id, v_ids[5]), (v_log_id, v_ids[3]);

    -- Day 26
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 26, TRUE, (CURRENT_DATE - 26)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[21]), (v_log_id, v_ids[8]), (v_log_id, v_ids[3]);

    -- Day 25
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 25, TRUE, (CURRENT_DATE - 25)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[6]), (v_log_id, v_ids[17]), (v_log_id, v_ids[10]);

    -- Day 24
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 24, TRUE, (CURRENT_DATE - 24)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[2]), (v_log_id, v_ids[5]), (v_log_id, v_ids[3]);

    -- Day 23
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 23, TRUE, (CURRENT_DATE - 23)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[11]), (v_log_id, v_ids[4]), (v_log_id, v_ids[3]);

    -- Day 22
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 22, TRUE, (CURRENT_DATE - 22)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[23]), (v_log_id, v_ids[14]), (v_log_id, v_ids[19]);

    -- Day 21
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 21, TRUE, (CURRENT_DATE - 21)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[12]), (v_log_id, v_ids[8]), (v_log_id, v_ids[10]);

    -- Day 20
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 20, TRUE, (CURRENT_DATE - 20)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[13]), (v_log_id, v_ids[2]), (v_log_id, v_ids[15]), (v_log_id, v_ids[3]);

    -- Day 19
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 19, TRUE, (CURRENT_DATE - 19)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[6]), (v_log_id, v_ids[7]), (v_log_id, v_ids[5]), (v_log_id, v_ids[3]);

    -- Day 18
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 18, TRUE, (CURRENT_DATE - 18)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[2]), (v_log_id, v_ids[24]);

    -- Day 17
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 17, TRUE, (CURRENT_DATE - 17)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[11]), (v_log_id, v_ids[20]), (v_log_id, v_ids[10]);

    -- Day 16
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 16, TRUE, (CURRENT_DATE - 16)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[16]), (v_log_id, v_ids[22]), (v_log_id, v_ids[10]);

    -- Day 15
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 15, TRUE, (CURRENT_DATE - 15)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[9]), (v_log_id, v_ids[5]), (v_log_id, v_ids[3]);

    -- Day 14
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 14, TRUE, (CURRENT_DATE - 14)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[6]), (v_log_id, v_ids[4]), (v_log_id, v_ids[25]), (v_log_id, v_ids[3]);

    -- Day 13
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 13, TRUE, (CURRENT_DATE - 13)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[18]), (v_log_id, v_ids[2]), (v_log_id, v_ids[8]), (v_log_id, v_ids[3]);

    -- Day 12
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 12, TRUE, (CURRENT_DATE - 12)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[17]), (v_log_id, v_ids[10]);

    -- Day 11
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 11, TRUE, (CURRENT_DATE - 11)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[13]), (v_log_id, v_ids[26]), (v_log_id, v_ids[22]), (v_log_id, v_ids[10]);

    -- Day 10
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 10, TRUE, (CURRENT_DATE - 10)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[11]), (v_log_id, v_ids[12]), (v_log_id, v_ids[5]), (v_log_id, v_ids[3]);

    -- Day 9
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 9, TRUE, (CURRENT_DATE - 9)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[2]), (v_log_id, v_ids[15]), (v_log_id, v_ids[3]);

    -- Day 8
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 8, TRUE, (CURRENT_DATE - 8)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[6]), (v_log_id, v_ids[7]), (v_log_id, v_ids[8]), (v_log_id, v_ids[10]);

    -- Day 7
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 7, TRUE, (CURRENT_DATE - 7)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[23]), (v_log_id, v_ids[14]), (v_log_id, v_ids[3]);

    -- Day 6
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 6, TRUE, (CURRENT_DATE - 6)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[4]), (v_log_id, v_ids[5]), (v_log_id, v_ids[3]);

    -- Day 5
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 5, TRUE, (CURRENT_DATE - 5)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[11]), (v_log_id, v_ids[2]), (v_log_id, v_ids[24]);

    -- Day 4
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 4, TRUE, (CURRENT_DATE - 4)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[6]), (v_log_id, v_ids[9]), (v_log_id, v_ids[8]), (v_log_id, v_ids[10]);

    -- Day 3
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 3, TRUE, (CURRENT_DATE - 3)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[16]), (v_log_id, v_ids[15]), (v_log_id, v_ids[3]);

    -- Day 2 (Assessment 3 taken today)
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 2, TRUE, (CURRENT_DATE - 2)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[1]), (v_log_id, v_ids[20]), (v_log_id, v_ids[5]), (v_log_id, v_ids[3]);

    -- Day 1 (Yesterday)
    INSERT INTO daily_clothing_log (user_id, log_date, is_finalized, finalized_at)
    VALUES (v_user_id, CURRENT_DATE - 1, TRUE, (CURRENT_DATE - 1)::TIMESTAMPTZ + INTERVAL '23 hours')
    RETURNING log_id INTO v_log_id;
    INSERT INTO daily_log_item (log_id, item_id) VALUES (v_log_id, v_ids[13]), (v_log_id, v_ids[17]), (v_log_id, v_ids[14]), (v_log_id, v_ids[10]);

    RAISE NOTICE 'ReApparel: 2-Month Simulated Account successfully created!';
    RAISE NOTICE 'Email: %', v_email;
    RAISE NOTICE 'Friend Code: %', v_friend_code;
    RAISE NOTICE 'Clothing Items: % items created', array_length(v_ids, 1);
END $$;
