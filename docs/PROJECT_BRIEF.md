# Design and Development of a Professional Marketplace for Artworks and Handcrafted Products

## 1. Your Role and Mission

Act as a professional Senior UI/UX Designer, Creative Director, and Full-Stack Developer. The name of my project is **Risheh (ریشه)**.

Your mission is to design and develop a modern, creative, visually stunning, and fully functional e-commerce platform for buying and selling artworks and handcrafted products.

The platform should provide a dedicated space for artists, artisans, collectors, and buyers to discover unique artworks, learn the stories behind each piece, purchase directly from artists, and sell their own products.

**The most important principle: I do not want a generic, repetitive template, a simple landing page, or a design that only looks good in a static preview. I want a cohesive, distinctive, modern, professional, and scalable digital product.**

Before starting, inspect the existing project structure, technologies, and available files. If an existing project is present, do not change its architecture or technology stack without a valid reason, and preserve its existing functionality.

## 2. Visual Identity and Art Direction

The design should combine three distinct experiences:

- A sophisticated, contemporary art gallery.
- An authentic marketplace for artists and handcrafted products.
- A modern online store with a professional shopping experience.

The overall atmosphere should feel natural, warm, authentic, calming, creative, and subtly luxurious while remaining contemporary. The design should highlight the artistic quality and value of the products rather than distract users with excessive decoration.

### Suggested Color Palette

Use a carefully selected, harmonious color palette:

- Warm cream and ivory for light backgrounds.
- Deep forest green for the primary brand identity and selected interactive elements.
- Soft terracotta and brick tones for artistic accents.
- Muted gold and earthy tones for subtle, limited details.
- Natural colors inspired by wood, stone, linen, and soil to establish authenticity.

For Dark Mode, create an independent, cohesive palette using charcoal or very dark green backgrounds. Do not simply invert the colors of Light Mode.

Colors should complement product photography while maintaining sufficient contrast, accessibility, and readability.

### Typography

Typography is one of the most important aspects of the design. Use high-quality, readable fonts appropriate for both Persian and English.

Consider Vazirmatn or Estedad for Persian and Manrope or Inter for English. For artistic headlines, introduce a suitable display font when it complements the visual identity.

Adjust font sizes, weights, line heights, and letter spacing for each language. Headlines should have a distinctive personality, while long-form content must remain comfortable to read.

### Composition and Design Style

Use editorial layouts, flexible grids, intentional whitespace, asymmetrical compositions, and large-scale artwork photography.

Introduce controlled variation across different sections to establish visual rhythm. Avoid making every section look like a collection of identical cards.

Incorporate subtle references to Iranian art and traditional craftsmanship, including Persian motifs, arabesques, geometric patterns, tilework, and handcrafted textures. These elements should contribute to the brand identity rather than become repetitive or overwhelming decorations.

Avoid generic e-commerce templates, unnecessary gradients, repetitive card layouts across every section, and excessive visual effects.

## 3. Photography and Artwork Presentation

Images are central to the entire shopping experience.

- Use high-quality, realistic, visually appealing images that match the specific type of artwork.
- Give every product its own relevant imagery. Never use unrelated or unnecessarily duplicated images.
- Clearly showcase textures, materials, craftsmanship, and fine details.
- Provide multiple product images and detailed zoom functionality on product pages.
- Combine clean product photography against simple backgrounds with lifestyle and contextual photography.
- Use appropriate storytelling imagery for artist profiles, behind-the-scenes craftsmanship, and artistic narratives.
- Maintain consistent image ratios, cropping, and presentation without cutting off important product details.
- Optimize images for fast loading and mobile performance.

If real project images are not yet available, use suitable, properly licensed placeholder images and establish a clear structure for replacing them with authentic product photography.

## 4. Complete Persian and English Support

The website must fully support both Persian and English.

- Persian must use right-to-left (RTL) layouts, while English must use left-to-right (LTR) layouts.
- Language switching must apply to every page, form, menu, filter, message, dashboard, and interactive component.
- Icon directions, spacing, component order, and button placement must adapt appropriately to the selected language.
- Store translations in dedicated localization files or a structured translation system. Do not scatter hardcoded Persian and English text throughout the codebase.
- Preserve the selected language when navigating between pages or reloading the website.
- Format dates, numbers, and prices according to the selected language and locale settings.
- Ensure that no placeholder text or untranslated sections remain in the final release.

## 5. Dark Mode and Light Mode

Implement a complete, professional theme-switching system.

- Allow users to switch between Light Mode and Dark Mode.
- Define appropriate colors for backgrounds, cards, forms, menus, modals, shadows, hover states, and focus states in both themes.
- Give Dark Mode its own sophisticated visual identity rather than making it a simple darkened version of Light Mode.
- Persist the user's theme preference across subsequent visits.
- Ensure that text and artwork images remain clear and visible in both themes.

## 6. Design and Implement Every Page

Design and implement all the following pages and connect them through functional routing.

### Public Pages and Artwork Discovery

1. **Homepage:** A professional header, creative hero section, intelligent search, artwork categories, featured products, new arrivals, curated collections, artist spotlights, and stories behind the artworks.

2. **Marketplace Page:** A product grid with search, practical filters, sorting, and pagination or infinite scrolling.

3. **Dedicated Category Pages:** Including paintings, wall art, calligraphy, pottery and ceramics, carpets and kilims, wooden products, handmade jewelry, textiles, and other manageable categories.

4. **Product Details Page:** An image gallery, price, stock availability, materials, dimensions, crafting techniques, artwork story, artist information, customer reviews, shipping information, related products, add-to-cart functionality, and wishlist functionality.

5. **Artist Profile Pages:** Artist photography, biography, artistic style, experience, collections, and direct access to the artist's products.

6. **Collections and Featured Artwork Pages:** Curated collections organized by style, technique, occasion, or theme.

7. **Advanced Search and Discovery Pages:** Advanced search functionality and personalized artwork discovery based on user preferences.

8. **Brand Story and Editorial Pages:** About Us, platform mission, art magazine or blog, and articles related to art and traditional craftsmanship.

### Customer and Shopping Pages

9. **Authentication Pages:** Registration, login, password recovery, and account verification.

10. **Customer Profile:** Personal information, addresses, orders, purchase history, wishlists, and submitted reviews.

11. **Shopping Cart:** Product quantity adjustments, item removal, price calculations, and stock validation.

12. **Multi-Step Checkout:** Shipping information, payment method selection, order review, and final confirmation.

13. **Payment Results and Order Details:** Payment status, order details, and order tracking.

### Seller and Administration Pages

14. **Artist/Seller Dashboard:** Dashboard overview, product management, order management, inventory, sales information, and storefront profile.

15. **Product Creation and Editing Forms:** Image uploads, category selection, pricing, artwork specifications, descriptions, stock quantities, and publication status.

16. **Administrative Dashboard:** User, artist, product, category, order, and content management, including submitted artwork review.

17. **Support and Information Pages:** Help center, FAQs, Contact Us, Terms and Conditions, Privacy Policy, shipping policies, returns, and customer support.

18. **Additional States and Error Pages:** 404 pages, empty states, no search results, loading screens, server errors, validation errors, and connection failures.

Headers, footers, and shared components should remain consistent across the website, but individual pages must not all share the same layout. Galleries, shopping experiences, editorial pages, and dashboards each require their own appropriate visual language.

## 7. Artificial Intelligence Capabilities

AI must provide genuine value to users and become a meaningful part of the core experience rather than just a decorative icon labeled "AI."

Implement the following capabilities:

### Intelligent Artwork Search

Allow users to search using natural language. For example:

- "A calming painting with natural colors for my living room."
- "A handmade gift within a limited budget."

The system should interpret the request and display relevant products based on their actual attributes and available data.

### Personalized Product Recommendations

Create a recommendation system based on selected preferences, wishlists, and available shopping behavior.

Explain why each product is recommended. When insufficient user data is available, display relevant general recommendations instead of pretending to have personalized insights.

### Customer Review Analysis

Use Natural Language Processing (NLP) to summarize genuine customer reviews and identify recurring topics such as craftsmanship, packaging quality, and how closely a product matches its photographs.

Summaries must be derived from existing reviews and must never replace access to the original customer feedback.

### Intelligent Assistant for Artists

Create a tool that helps sellers write product descriptions, select relevant tags, and improve product presentation using the actual information they provide about their artwork.

Sellers must review and approve all generated content before publication.

AI capabilities must connect to a clearly defined technical service or integration layer. If an API key or required external service is unavailable, implement a clear integration structure, transparent error handling, and an explicitly labeled demo mode.

Never present fabricated responses as genuine AI-generated analysis.

## 8. Make the Website Fully Functional

All important interactions must work. Decorative buttons and links without destinations are unacceptable.

- Use a database and APIs to manage products, users, categories, orders, reviews, and sellers.
- Implement registration, login, session management, form validation, and authorization controls.
- Ensure search, filtering, sorting, wishlists, shopping cart operations, and checkout have real, testable behavior.
- Implement product creation, editing, and deletion in seller and administrative dashboards.
- Validate product prices and inventory when orders are placed.
- Never expose sensitive information, API keys, or confidential configuration in client-side code.
- Integrate payments through a legitimate payment gateway. If gateway credentials or access are unavailable, clearly label the implementation as a test or demo mode and never claim that a simulated transaction represents a real successful payment.
- Use sample data for testing, but keep it distinguishable from genuine production data.

## 9. Animations, Scrolling, and Interactions

The website should feel polished, responsive, and alive as users navigate through it.

Use subtle, purposeful animations, including:

- Gradual section reveals as content enters the viewport.
- Refined hover effects and controlled image zoom.
- Smooth page transitions and menu animations.
- Clear visual feedback when adding products to the cart or wishlist.
- Skeleton loading states while data is being fetched.
- Limited, subtle motion in the hero section and selected decorative elements.

Avoid heavy animations and effects that compromise performance, accessibility, or readability. Smooth scrolling and motion effects must respect the user's system-level reduced-motion preferences.

## 10. Responsive Design

Design every page for desktop computers, laptops, tablets, and mobile phones.

- Adapt layouts intentionally to different screen sizes.
- Transform desktop navigation into an appropriate mobile navigation experience.
- Optimize product grids, image galleries, filters, forms, tables, and dashboards for smaller screens.
- Eliminate unwanted horizontal scrolling, clipped text, and inaccessible buttons.
- Ensure touch interactions and clickable areas are appropriately sized.
- Maintain acceptable performance on slower devices and weaker internet connections.

## 11. Design System and Final Quality

Create a cohesive, reusable Design System that includes:

- Colors, typography, spacing, and sizing scales.
- Buttons, forms, inputs, and selectors.
- Product cards, artist cards, and collection cards.
- Headers, footers, navigation menus, and breadcrumbs.
- Modals, notifications, badges, and loading states.
- Hover, focus, disabled, success, and error states.

Use reusable components and maintain a clean, readable codebase. Follow accessibility best practices, including keyboard navigation, image alternative text, sufficient color contrast, and semantic page structure.

Also implement page titles, SEO metadata, readable URLs, and appropriate page structures for search engine indexing.

## 12. Project Execution Workflow

Do not limit the work to presenting ideas, wireframes, or a homepage design.

First, define the page architecture, component structure, and visual identity. Then implement the complete design and development of all pages within the existing project.

Finally, test the main user journeys:

- Discovering and searching for products.
- Viewing product details.
- Adding items to the shopping cart.
- Completing an order.
- Managing products as a seller.
- Switching between Persian and English.
- Switching between Light Mode and Dark Mode.
- Using the AI-powered features.

Do not leave incomplete pages, broken links, missing images, console errors, or unusable features. If any functionality depends on an external service or configuration, document the dependency and explain how to configure it.

**Success Criteria:** A distinctive art marketplace with a recognizable visual identity, high-quality photography, professional design across all pages, complete Persian and English support, Dark Mode and Light Mode, functional e-commerce capabilities, and meaningful AI-powered features.

The final product must be cohesive and polished enough to be clearly recognizable as a dedicated artistic brand—not a generic online store template.