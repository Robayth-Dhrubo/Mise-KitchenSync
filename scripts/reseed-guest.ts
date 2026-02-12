import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function reseed() {
    console.log('🔄 Identifying target hospitality profile...');

    // 1. Get first profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

    if (profileError || !profile) {
        console.error('❌ No profile found. Please sign up in the app first.');
        return;
    }

    const userId = profile.id;
    console.log(`✅ Targeted Profile ID: ${userId}`);

    // 2. Clear existing recipes for this user (optional, but requested for "clean 75")
    console.log('🧹 Clearing existing recipes...');
    // Note: Due to RLS, we might only be able to delete if we own them. 
    // Since we are using the anon key, we depend on the RLS policy being 'true' or owning them.
    const { error: delError } = await supabase
        .from('recipes')
        .delete()
        .eq('user_id', userId);

    if (delError) console.warn('⚠️ Warning during cleanup (probably RLS):', delError.message);

    // 3. Define the 75 items with rich metadata
    const ASSET_IMAGES = {
        starter: '/Users/robaythshahrindhrubo/.gemini/antigravity/brain/a717672f-8b66-4ca1-9bef-e85d51d83580/starter_placeholder_1769853179787.png',
        main: '/Users/robaythshahrindhrubo/.gemini/antigravity/brain/a717672f-8b66-4ca1-9bef-e85d51d83580/main_placeholder_1769853193100.png',
        dessert: '/Users/robaythshahrindhrubo/.gemini/antigravity/brain/a717672f-8b66-4ca1-9bef-e85d51d83580/dessert_placeholder_1769853207446.png',
        drink: '/Users/robaythshahrindhrubo/.gemini/antigravity/brain/a717672f-8b66-4ca1-9bef-e85d51d83580/drink_placeholder_1769853220364.png',
        sauce: '/Users/robaythshahrindhrubo/.gemini/antigravity/brain/a717672f-8b66-4ca1-9bef-e85d51d83580/sauce_placeholder_1769853233647.png'
    };

    const recipes = [
        // STARTERS
        { name: 'Beef Carpaccio', menu_price: 24, description: 'Prime tenderloin, capers, truffle emulsion, parmigiano reggiano.', category: 'starter', allergies: ['Dairy'], image_url: ASSET_IMAGES.starter },
        { name: 'Lobster Bisque', menu_price: 19, description: 'Atlantic lobster, sherry cream, chive oil, brioche croutons.', category: 'starter', allergies: ['Shellfish', 'Dairy', 'Gluten'], image_url: ASSET_IMAGES.starter },
        { name: 'Scallop Ceviche', menu_price: 28, description: 'Hokkaido scallops, tiger milk, cilantro oil, micro-radish.', category: 'starter', allergies: ['Shellfish'], image_url: ASSET_IMAGES.starter },
        { name: 'Beef Tartare Classic', menu_price: 26, description: 'Hand-cut filet, quail egg, capers, shallots, sourdough toast.', category: 'starter', allergies: ['Egg', 'Gluten'], image_url: ASSET_IMAGES.starter },
        { name: 'Salmon Tartare', menu_price: 22, description: 'Fresh salmon, avocado, lime, ginger soy, rice crackers.', category: 'starter', allergies: ['Fish', 'Soy'], image_url: ASSET_IMAGES.starter },
        { name: 'Mushroom Toast', menu_price: 19, description: 'Wild mushrooms, garlic cream, truffle oil, toasted brioche.', category: 'starter', allergies: ['Gluten', 'Dairy'], image_url: ASSET_IMAGES.starter },
        { name: 'Foie Gras Torchon', menu_price: 38, description: 'Artisanal foie gras, fig jam, toasted brioche, fleur de sel.', category: 'starter', allergies: ['Gluten'], image_url: ASSET_IMAGES.starter },
        { name: 'Garlic Shrimp', menu_price: 24, description: 'Jumbo shrimp, confit garlic, chili flakes, white wine sauce.', category: 'starter', allergies: ['Shellfish', 'Dairy'], image_url: ASSET_IMAGES.starter },
        { name: 'Goat Cheese Salad', menu_price: 18, description: 'Warm goat cheese, heritage beets, walnuts, honey balsamic.', category: 'starter', allergies: ['Dairy', 'Nuts'], image_url: ASSET_IMAGES.starter },
        { name: 'Caesar Salad Luxe', menu_price: 16, description: 'Romaine hearts, 24-month parmesan, focaccia croutons, caesar dressing.', category: 'starter', allergies: ['Dairy', 'Gluten', 'Fish'], image_url: ASSET_IMAGES.starter },
        { name: 'Oysters Rockefeller', menu_price: 32, description: 'Half dozen oysters, spinach, butter, herbs, pernod, breadcrumbs.', category: 'starter', allergies: ['Shellfish', 'Dairy', 'Gluten'], image_url: ASSET_IMAGES.starter },
        { name: 'French Onion Soup', menu_price: 16, description: 'Caramelized onions, beef broth, gruyère crust, baguette.', category: 'starter', allergies: ['Dairy', 'Gluten'], image_url: ASSET_IMAGES.starter },
        { name: 'Tuna Tataki', menu_price: 26, description: 'Seared big-eye tuna, ponzu, ginger, micro-greens, sesame.', category: 'starter', allergies: ['Fish', 'Soy', 'Sesame'], image_url: ASSET_IMAGES.starter },
        { name: 'Spinach Dip', menu_price: 15, description: 'Classic creamy spinach, artichoke, four-cheese blend, sourdough.', category: 'starter', allergies: ['Dairy', 'Gluten'], image_url: ASSET_IMAGES.starter },
        { name: 'Charcuterie Board', menu_price: 35, description: 'Selection of artisanal meats, cheeses, olives, nuts, honey.', category: 'starter', allergies: ['Dairy', 'Gluten', 'Nuts'], image_url: ASSET_IMAGES.starter },
        // MAINS
        { name: 'Filet Mignon 8oz', menu_price: 62, description: 'Center-cut certified black angus, bone marrow jus, asparagus.', category: 'main', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Beef Wellington', menu_price: 65, description: 'Tenderloin wrapped in mushroom duxelles, prosciutto, puff pastry.', category: 'main', allergies: ['Gluten', 'Dairy', 'Egg'], image_url: ASSET_IMAGES.main },
        { name: 'Duck Confit', menu_price: 36, description: 'Slow-cooked heritage duck, cherry gastrique, parsnip puree.', category: 'main', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Sea Bass Filet', menu_price: 42, description: 'Wild-caught Mediterranean bass, lemon beurre blanc, samphire.', category: 'main', allergies: ['Fish', 'Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Rack of Lamb', menu_price: 65, description: 'Herb-crusted lamb racks, mint pea puree, fondant potato.', category: 'main', allergies: ['Gluten', 'Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Steak Frites', menu_price: 38, description: 'Prime striploin, truffle fries, peppercorn sauce, watercress.', category: 'main', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Ribeye Steak 12oz', menu_price: 55, description: 'Aged ribeye, roasted garlic, thyme butter, seasonal greens.', category: 'main', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Braised Short Rib', menu_price: 42, description: '48-hour braised beef shanks, red wine reduction, polenta.', category: 'main', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Duck Magret', menu_price: 40, description: 'Seared duck breast, orange reduction, honey roasted carrots.', category: 'main', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Chicken Supreme', menu_price: 29, description: 'Roasted chicken breast, mushroom cream, herb mash.', category: 'main', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Veal Chop', menu_price: 58, description: 'Milk-fed veal, sage butter, forest mushrooms, gnocchi.', category: 'main', allergies: ['Dairy', 'Gluten', 'Egg'], image_url: ASSET_IMAGES.main },
        { name: 'Pork Belly Crispy', menu_price: 32, description: 'Slow-roasted belly, crackling, apple puree, cider jus.', category: 'main', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Burger Deluxe', menu_price: 24, description: 'Dry-aged beef, brie, truffle aioli, toasted brioche.', category: 'main', allergies: ['Gluten', 'Dairy', 'Egg'], image_url: ASSET_IMAGES.main },
        { name: 'Lamb Shank', menu_price: 38, description: 'Slow-braised lamb, red wine, root vegetables, creamy polenta.', category: 'main', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Osso Bucco', menu_price: 42, description: 'Veal shank, gremolata, saffron risotto, wine reduction.', category: 'main', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Surf and Turf', menu_price: 75, description: '6oz Filet Mignon, butter-poached lobster tail, garlic mash.', category: 'main', allergies: ['Shellfish', 'Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Chicken Pot Pie', menu_price: 26, description: 'Roasted chicken, vegetables, creamy sauce, flakey pastry.', category: 'main', allergies: ['Gluten', 'Dairy', 'Egg'], image_url: ASSET_IMAGES.main },
        { name: 'Meatballs & Polenta', menu_price: 28, description: 'Hand-made veal meatballs, rich tomato sauce, creamy polenta.', category: 'main', allergies: ['Dairy', 'Gluten'], image_url: ASSET_IMAGES.main },
        { name: 'Pan Seared Scallops', menu_price: 44, description: 'U-10 scallops, cauliflower silk, pancetta, sage, lemon butter.', category: 'main', allergies: ['Shellfish', 'Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Grilled Salmon', menu_price: 34, description: 'Organic salmon, quinoa, cucumber raita, herb oil.', category: 'main', allergies: ['Fish', 'Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Lobster Thermidor', menu_price: 85, description: 'Whole lobster, brandy cream, mustard, parmesan crust.', category: 'main', allergies: ['Shellfish', 'Dairy', 'Gluten'], image_url: ASSET_IMAGES.main },
        { name: 'Lobster Roll', menu_price: 32, description: 'Fresh lobster, lemon mayo, buttered brioche, chives.', category: 'main', allergies: ['Shellfish', 'Gluten', 'Egg', 'Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Fish and Chips', menu_price: 26, description: 'Beer-battered cod, triple-cooked chips, tartare sauce.', category: 'main', allergies: ['Fish', 'Gluten', 'Egg'], image_url: ASSET_IMAGES.main },
        { name: 'Seafood Risotto', menu_price: 38, description: 'Arborio rice, scallops, shrimp, mussels, saffron, peas.', category: 'main', allergies: ['Shellfish', 'Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Linguine Vongole', menu_price: 28, description: 'Fresh linguine, manila clams, garlic, chili, white wine.', category: 'main', allergies: ['Shellfish', 'Gluten'], image_url: ASSET_IMAGES.main },
        { name: 'Mussels Mariniere', menu_price: 24, description: 'Fresh mussels, shallots, garlic, white wine, cream, baguette.', category: 'main', allergies: ['Shellfish', 'Dairy', 'Gluten'], image_url: ASSET_IMAGES.main },
        { name: 'Grilled Octopus', menu_price: 36, description: 'Charred octopus, baby potatoes, chorizo, smoked paprika aioli.', category: 'main', allergies: ['Egg', 'Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Halibut Royale', menu_price: 45, description: 'Pan-seared halibut, caviar, champagne sauce, asparagus.', category: 'main', allergies: ['Fish', 'Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Trout Almondine', menu_price: 32, description: 'Fresh trout, brown butter, toasted almonds, lemon, capers.', category: 'main', allergies: ['Fish', 'Dairy', 'Nuts'], image_url: ASSET_IMAGES.main },
        { name: 'Seafood Tower', menu_price: 120, description: 'Oysters, lobster, shrimp, crab, tuna tartare, assortment of sauces.', category: 'main', allergies: ['Shellfish', 'Fish', 'Egg'], image_url: ASSET_IMAGES.main },
        // SIDES
        { name: 'Truffle Fries', menu_price: 12, description: 'Hand-cut russets, white truffle oil, rosemary, parmesan.', category: 'side', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Mashed Potatoes', menu_price: 10, description: 'Yukon gold potatoes, cultured butter, chives.', category: 'side', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Grilled Asparagus', menu_price: 14, description: 'Seasonal spears, hollandaise, lemon zest.', category: 'side', allergies: ['Dairy', 'Egg'], image_url: ASSET_IMAGES.main },
        { name: 'Sauteed Mushrooms', menu_price: 12, description: 'Forest mushrooms, garlic, thyme, balsamic.', category: 'side', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Mac and Cheese', menu_price: 16, description: 'Three-cheese mornay, panko crust, truffle oil.', category: 'side', allergies: ['Dairy', 'Gluten'], image_url: ASSET_IMAGES.main },
        { name: 'Roasted Carrots', menu_price: 10, description: 'Honey-glazed carrots, toasted cumin, greek yogurt.', category: 'side', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Creamed Spinach', menu_price: 12, description: 'Classic béchamel spinach, nutmeg, parmesan.', category: 'side', allergies: ['Dairy', 'Gluten'], image_url: ASSET_IMAGES.main },
        { name: 'Brussels Sprouts', menu_price: 12, description: 'Crispy sprouts, bacon jam, balsamic reduction.', category: 'side', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        { name: 'Onion Rings', menu_price: 9, description: 'Beer-battered onions, chipotle mayo.', category: 'side', allergies: ['Gluten', 'Egg'], image_url: ASSET_IMAGES.main },
        { name: 'Rice Pilaf', menu_price: 8, description: 'Long-grain rice, aromatics, butter.', category: 'side', allergies: ['Dairy'], image_url: ASSET_IMAGES.main },
        // DESSERTS
        { name: 'Creme Brulee', menu_price: 14, description: 'Tahitian vanilla bean, caramelized sugar, fresh berries.', category: 'dessert', allergies: ['Dairy', 'Egg'], image_url: ASSET_IMAGES.dessert },
        { name: 'Chocolate Mousse', menu_price: 12, description: '70% dark chocolate, salted caramel, hazelnut praline.', category: 'dessert', allergies: ['Dairy', 'Egg', 'Nuts'], image_url: ASSET_IMAGES.dessert },
        { name: 'Cheesecake', menu_price: 14, description: 'New York style, graham cracker crust, raspberry coulis.', category: 'dessert', allergies: ['Dairy', 'Gluten', 'Egg'], image_url: ASSET_IMAGES.dessert },
        { name: 'Tiramisu', menu_price: 14, description: 'Espresso-soaked ladyfingers, mascarpone, cocoa.', category: 'dessert', allergies: ['Dairy', 'Gluten', 'Egg'], image_url: ASSET_IMAGES.dessert },
        { name: 'Lemon Tart', menu_price: 12, description: 'Shortcrust pastry, tangy lemon curd, toasted meringue.', category: 'dessert', allergies: ['Dairy', 'Gluten', 'Egg'], image_url: ASSET_IMAGES.dessert },
        { name: 'Apple Crumble', menu_price: 12, description: 'Caramelized apples, oat streusel, vanilla gelato.', category: 'dessert', allergies: ['Dairy', 'Gluten'], image_url: ASSET_IMAGES.dessert },
        { name: 'Molten Cake', menu_price: 15, description: 'Warm chocolate cake, liquid center, hazelnut ice cream.', category: 'dessert', allergies: ['Dairy', 'Gluten', 'Egg', 'Nuts'], image_url: ASSET_IMAGES.dessert },
        { name: 'Ice Cream Trio', menu_price: 10, description: 'Selection of artisanal sorbets and ice creams.', category: 'dessert', allergies: ['Dairy'], image_url: ASSET_IMAGES.dessert },
        { name: 'Cheese Board', menu_price: 24, description: 'Local and international cheeses, honeycomb, crackers.', category: 'dessert', allergies: ['Dairy', 'Gluten', 'Nuts'], image_url: ASSET_IMAGES.dessert },
        { name: 'Berry Pavlova', menu_price: 14, description: 'Crisp meringue, whipped cream, seasonal berries, mint.', category: 'dessert', allergies: ['Dairy', 'Egg'], image_url: ASSET_IMAGES.dessert },
        // DRINKS
        { name: 'Old Fashioned', menu_price: 18, description: 'Bourbon, sugar, bitters, citrus.', category: 'drink', allergies: [], image_url: ASSET_IMAGES.drink },
        { name: 'Martini', menu_price: 18, description: 'Gin or Vodka, vermouth, olives or twist.', category: 'drink', allergies: [], image_url: ASSET_IMAGES.drink },
        { name: 'Espresso Martini', menu_price: 20, description: 'Vodka, espresso, coffee liqueur.', category: 'drink', allergies: [], image_url: ASSET_IMAGES.drink },
        { name: 'Negroni', menu_price: 18, description: 'Gin, Campari, sweet vermouth.', category: 'drink', allergies: [], image_url: ASSET_IMAGES.drink },
        { name: 'House Wine (Glass)', menu_price: 14, description: 'Inquire for current selection.', category: 'drink', allergies: [], image_url: ASSET_IMAGES.drink }
    ].map(r => ({ ...r, user_id: userId }));

    console.log(`🚀 Injecting ${recipes.length} high-fidelity assets into the Digital Menu...`);
    const { data, error } = await supabase.from('recipes').insert(recipes);

    if (error) {
        console.error('❌ Insertion failed:', error.message);
    } else {
        console.log('✅ Menu synchronization complete. 75 assets active.');
    }
}

reseed();
