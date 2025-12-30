# i18n Audit - Hardcoded User-Facing Strings

This audit identifies all user-facing hardcoded strings that are NOT using next-intl translations.

**Audit Date**: 2024  
**Scope**: `src/**` (components, sections, pages) and `app/**`  
**Exclusions**: classNames, ids, test strings, console logs (aria-label included if visible to user)

---

## Summary

- **Total Files with Hardcoded Strings**: 18
- **Total Hardcoded Strings Found**: 80+

---

## Findings by File

### `src/ui/components/navigation/Header.tsx`

1. **Line 132**: `alt="Tenerife Activity"`
   - **Type**: Image alt text (user-facing via screen readers)
   - **Suggested Key**: `common.siteName` (already exists in translations)

2. **Line 161**: `aria-label="Search"`
   - **Type**: Accessibility label (user-facing via screen readers)
   - **Suggested Key**: `common.search` (already exists in translations)

3. **Line 190**: `aria-label="Search"`
   - **Type**: Accessibility label (user-facing via screen readers)
   - **Suggested Key**: `common.search` (already exists in translations)

4. **Line 216**: `aria-label="Toggle menu"`
   - **Type**: Accessibility label (user-facing via screen readers)
   - **Suggested Key**: `nav.toggleMenu`

---

### `src/ui/components/navigation/Breadcrumb.tsx`

1. **Line 15**: `aria-label="Breadcrumb"`
   - **Type**: Accessibility label (user-facing via screen readers)
   - **Suggested Key**: `common.breadcrumb`

---

### `src/ui/components/search/HeaderSearch.client.tsx`

1. **Line 137**: `aria-label="Search"`
   - **Type**: Accessibility label (user-facing via screen readers)
   - **Suggested Key**: `common.search` (already exists in translations)

2. **Line 156**: `aria-label="Search input"`
   - **Type**: Accessibility label (user-facing via screen readers)
   - **Suggested Key**: `common.searchInput`

---

### `src/app/[locale]/search/SearchPageClient.tsx`

1. **Line 172**: `"Search for experiences, activities, or locations in Tenerife."`
   - **Type**: Empty state description
   - **Suggested Key**: `search.emptyStateDescription`

2. **Lines 313-314**: `{filteredAndSorted.length} experience{filteredAndSorted.length !== 1 ? 's' : ''} found`
   - **Type**: Results count with pluralization
   - **Suggested Key**: `search.resultsCount` (with plural support)

3. **Line 272**: `{filteredAndSorted.length} experience{filteredAndSorted.length !== 1 ? 's' : ''} found`
   - **Type**: Results count with pluralization (in VibePageClient)
   - **Suggested Key**: `search.resultsCount` (with plural support)

4. **Line 339**: `"Teide"`
   - **Type**: Search suggestion chip
   - **Suggested Key**: `search.suggestions.teide`

5. **Line 342**: `"Boat"`
   - **Type**: Search suggestion chip
   - **Suggested Key**: `search.suggestions.boat`

6. **Line 345**: `"Siam Park"`
   - **Type**: Search suggestion chip
   - **Suggested Key**: `search.suggestions.siamPark`

---

### `src/ui/components/experience/ExperienceCard.tsx`

1. **Lines 138, 218**: `"From"`
   - **Type**: Price label
   - **Suggested Key**: `experience.priceFrom`

2. **Lines 144, 224**: `"View experience"`
   - **Type**: Button text / CTA
   - **Suggested Key**: `experience.viewExperience`

---

### `src/ui/components/experience/ExperienceHero.tsx`

1. **Line 62**: `"({experience.reviewCount} reviews)"`
   - **Type**: Review count with pluralization
   - **Suggested Key**: `experience.reviewsCount` (with plural support)

2. **Line 70**: `"Pickup available"`
   - **Type**: Feature indicator text
   - **Suggested Key**: `experience.pickupAvailable`

---

### `src/ui/components/get-inspired/GetInspiredQuiz.client.tsx`

1. **Line 101**: `"Who are you travelling with?"`
   - **Type**: Quiz question
   - **Note**: Already exists in translations as `getInspired.quiz.questions.group`, but this component uses hardcoded version

2. **Line 102**: `['Solo', 'Couple', 'Family', 'Friends', 'Group (6+)']`
   - **Type**: Quiz options
   - **Note**: Options exist in translations but component doesn't use them

3. **Line 106**: `"What kind of experience are you looking for?"`
   - **Type**: Quiz question
   - **Suggested Key**: `getInspired.quiz.questions.vibe` (already exists, but not used)

4. **Line 108**: `['Chill & Relax', 'Adventure & Nature', 'Fun & Entertainment', 'Luxury & VIP', 'Culture & Shows']`
   - **Type**: Quiz options
   - **Note**: Some exist in translations but values don't match exactly

5. **Line 117**: `"How active do you want it to be?"`
   - **Type**: Quiz question
   - **Suggested Key**: `getInspired.quiz.questions.intensity` (already exists, but not used)

6. **Line 118**: `['Very relaxed', 'Balanced', 'Very active']`
   - **Type**: Quiz options
   - **Suggested Key**: `getInspired.quiz.options.intensity.*` (already exists, but not used)

7. **Line 122**: `"How much time do you have?"`
   - **Type**: Quiz question
   - **Suggested Key**: `getInspired.quiz.questions.time` (already exists, but not used)

8. **Line 123**: `['1–2 hours', 'Half day', 'Full day', 'Several days']`
   - **Type**: Quiz options
   - **Note**: Some exist in translations but values don't match exactly

9. **Line 127**: `"What's your budget per person?"`
   - **Type**: Quiz question
   - **Suggested Key**: `getInspired.quiz.questions.budget` (already exists, but not used)

10. **Line 128**: `['€ Budget', '€€ Comfortable', '€€€ Premium / VIP']`
    - **Type**: Quiz options
    - **Note**: Exists in translations but format differs

11. **Line 132**: `"What matters most to you?"`
    - **Type**: Quiz question
    - **Suggested Key**: `getInspired.quiz.questions.priority` (new key needed)

12. **Line 133**: `['Incredible views', 'Unique experience', 'Comfort & ease', 'Adrenaline', 'Instagram moments']`
    - **Type**: Quiz options
    - **Suggested Key**: `getInspired.quiz.options.priority.*` (new keys needed)

13. **Line 190**: `"Loading quiz..."`
    - **Type**: Loading state text
    - **Suggested Key**: `getInspired.quiz.loading`

14. **Line 210**: `"Experience"`
    - **Type**: Fallback text for recommendation card title
    - **Suggested Key**: `getInspired.quiz.results.experienceFallback`

15. **Line 213**: `"No description available"`
    - **Type**: Fallback text for recommendation card description
    - **Suggested Key**: `getInspired.quiz.results.noDescription`

16. **Line 231**: `"View experience"`
    - **Type**: Button text in recommendation card
    - **Suggested Key**: `experience.viewExperience` (already suggested above)

17. **Line 265**: `"We found inspiration for you!"` / `"Your perfect Tenerife experiences"`
    - **Type**: Results header title (conditional)
    - **Suggested Key**: `getInspired.quiz.results.title` / `getInspired.quiz.results.titleFallback`

18. **Line 268**: `"Here are some popular experiences you will love."` / `"Based on your preferences, here are our recommendations"`
    - **Type**: Results header subtitle (conditional)
    - **Suggested Key**: `getInspired.quiz.results.subtitle` / `getInspired.quiz.results.subtitleFallback`

19. **Line 289**: `"Take Quiz Again"`
    - **Type**: Button text
    - **Suggested Key**: `getInspired.quiz.buttons.takeQuizAgain` (already exists, but not used)

20. **Line 303**: `"Step {currentStep} of {totalSteps}"`
    - **Type**: Progress indicator
    - **Suggested Key**: `getInspired.quiz.progress` (already exists as `getInspired.quiz.step` and `getInspired.quiz.of`, but format differs)

21. **Line 337**: `"No options available"`
    - **Type**: Error/fallback text
    - **Suggested Key**: `getInspired.quiz.noOptions`

22. **Line 349**: `"Back"`
    - **Type**: Button text
    - **Suggested Key**: `getInspired.quiz.buttons.back` (already exists, but not used)

23. **Line 363**: `"See Results"` / `"Next"`
    - **Type**: Button text (conditional)
    - **Suggested Key**: `getInspired.quiz.buttons.seeResults` / `getInspired.quiz.buttons.next` (already exist, but not used)

24. **Line 369**: `"Unable to load question. Please refresh the page."`
    - **Type**: Error message
    - **Suggested Key**: `getInspired.quiz.error`

**Note**: This component appears to be a standalone implementation that doesn't use the existing `getInspired.quiz` translations. It should be refactored to use the translation keys.

---

### `src/ui/components/shared/ExploreVibesButton.tsx`

1. **Line 15**: `"Explore Vibes"`
   - **Type**: Button text / CTA
   - **Suggested Key**: `home.exploreVibes`

---

### `src/app/[locale]/out/booking/BookingRedirectClient.tsx`

1. **Line 106**: `"Experience:"`
   - **Type**: Label in booking summary
   - **Suggested Key**: `booking.summary.experience`

2. **Line 111**: `"Location:"`
   - **Type**: Label in booking summary
   - **Suggested Key**: `booking.summary.location`

3. **Line 117**: `"Duration:"`
   - **Type**: Label in booking summary
   - **Suggested Key**: `booking.summary.duration`

4. **Line 126**: `"You will be redirected to our partner's secure booking platform in {countdown} seconds."`
   - **Type**: Countdown message with variable
   - **Suggested Key**: `booking.countdownMessage` (with countdown variable)

5. **Line 138**: `"Continue to Booking"`
   - **Type**: Button text / CTA
   - **Suggested Key**: `booking.continueToBooking`

---

### `src/ui/sections/PartnersSection.tsx`

1. **Line 28**: `"Turn your accommodation into a revenue stream"`
   - **Type**: Section heading
   - **Suggested Key**: `partners.section.title`

2. **Line 31**: `"Your guests already book excursions. Now you earn from it — automatically."`
   - **Type**: Section subtitle
   - **Suggested Key**: `partners.section.subtitle`

3. **Line 15**: `"10% commission on every activity booked"`
   - **Type**: Benefit item
   - **Suggested Key**: `partners.section.benefits.commission`

4. **Line 16**: `"100% legal, tracked & paid monthly"`
   - **Type**: Benefit item
   - **Suggested Key**: `partners.section.benefits.legal`

5. **Line 17**: `"Zero work — we handle bookings, payments & support"`
   - **Type**: Benefit item
   - **Suggested Key**: `partners.section.benefits.zeroWork`

6. **Line 18**: `"Increase your listing value & stand out instantly"`
   - **Type**: Benefit item
   - **Suggested Key**: `partners.section.benefits.value`

7. **Line 52**: `"No cost. No commitment. No risk."`
   - **Type**: Trust indicator text
   - **Suggested Key**: `partners.section.trust`

8. **Line 55**: `"Become a partner"`
   - **Type**: Button text / CTA
   - **Suggested Key**: `partners.section.cta`

---

### `src/app/[locale]/partners/page.tsx`

1. **Line 11**: `"Partner with Tenerife Activity | Accommodation Partnerships"`
   - **Type**: Metadata title
   - **Suggested Key**: `partners.metadata.title`

2. **Line 12**: `"Join our accommodation partner program. Earn 10% commission on every activity booked. No investment, no subscription. Fully managed by our excursion partner."`
   - **Type**: Metadata description
   - **Suggested Key**: `partners.metadata.description`

3. **Line 31**: `"Partner with Tenerife Activity"`
   - **Type**: Page heading
   - **Suggested Key**: `partners.title` (already exists, but not used - check if value matches)

4. **Line 34**: `"Enhance your guest experience and generate additional revenue through our curated excursion program."`
   - **Type**: Page subtitle
   - **Suggested Key**: `partners.subtitle` (already exists, but not used - check if value matches)

5. **Line 47**: `"How It Works"`
   - **Type**: Section heading
   - **Suggested Key**: `partners.howItWorks.title`

6. **Line 51**: `"Our partnership model is designed to be simple and straightforward. We handle all aspects of the excursion business, while you focus on providing exceptional accommodation services to your guests."`
   - **Type**: Section paragraph
   - **Suggested Key**: `partners.howItWorks.paragraph1`

7. **Line 54**: `"When guests book activities through your accommodation, you earn a commission on every booking. There are no upfront costs, no subscription fees, and no ongoing management responsibilities on your part."`
   - **Type**: Section paragraph
   - **Suggested Key**: `partners.howItWorks.paragraph2`

8. **Line 68**: `"Why It Benefits Accommodations"`
   - **Type**: Section heading
   - **Suggested Key**: `partners.benefits.title`

9. **Line 72**: `"Offering curated excursions enhances your accommodation's value proposition and provides guests with a seamless way to discover and book experiences during their stay."`
   - **Type**: Section paragraph
   - **Suggested Key**: `partners.benefits.paragraph1`

10. **Line 75**: `"By partnering with us, you differentiate your property from competitors, increase guest satisfaction, and create an additional revenue stream without increasing your operational overhead."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.benefits.paragraph2`

11. **Line 78**: `"Your guests benefit from access to carefully selected, high-quality activities, while you benefit from a professional partnership that requires no time or resources to manage."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.benefits.paragraph3`

12. **Line 92**: `"What Partners Earn"`
    - **Type**: Section heading
    - **Suggested Key**: `partners.earnings.title`

13. **Line 96**: `"Partners earn a 10% commission on every activity booked through the partnership program."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.earnings.paragraph1`

14. **Line 99**: `"Commissions are calculated on the total booking value and paid monthly via bank transfer. You receive detailed monthly statements that clearly show all bookings, commissions earned, and payment details."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.earnings.paragraph2`

15. **Line 102**: `"There are no minimum booking requirements, no hidden fees, and no charges for using our platform. You only receive money—you never pay anything to participate."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.earnings.paragraph3`

16. **Line 116**: `"What You Don't Have to Manage"`
    - **Type**: Section heading
    - **Suggested Key**: `partners.management.title`

17. **Line 120**: `"We handle all operational aspects of the excursion program, so you don't have to."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.management.paragraph1`

18. **Line 125**: `"Activity selection, curation, and quality control"`
    - **Type**: Management item
    - **Suggested Key**: `partners.management.items.selection`

19. **Line 129**: `"Booking management and customer service"`
    - **Type**: Management item
    - **Suggested Key**: `partners.management.items.booking`

20. **Line 133**: `"Payment processing and financial administration"`
    - **Type**: Management item
    - **Suggested Key**: `partners.management.items.payment`

21. **Line 137**: `"Supplier relationships and contract management"`
    - **Type**: Management item
    - **Suggested Key**: `partners.management.items.suppliers`

22. **Line 141**: `"Marketing materials and promotional content"`
    - **Type**: Management item
    - **Suggested Key**: `partners.management.items.marketing`

23. **Line 145**: `"Technology platform and booking systems"`
    - **Type**: Management item
    - **Suggested Key**: `partners.management.items.technology`

24. **Line 149**: `"Your role is simply to make the program available to your guests. Everything else is handled by our experienced excursion partner."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.management.paragraph2`

25. **Line 163**: `"Legal & Professional Framework"`
    - **Type**: Section heading
    - **Suggested Key**: `partners.legal.title`

26. **Line 167**: `"All partnerships are governed by clear, professional agreements that define roles, responsibilities, and commission structures."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.legal.paragraph1`

27. **Line 170**: `"Our excursion partner is fully licensed and insured, ensuring compliance with all relevant tourism regulations and consumer protection requirements."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.legal.paragraph2`

28. **Line 173**: `"Partners receive comprehensive documentation, including partnership terms, commission schedules, payment procedures, and support contact information. All financial transactions are transparent and documented."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.legal.paragraph3`

29. **Line 176**: `"The partnership is non-exclusive, meaning you can continue working with other excursion providers if you choose. There are no long-term commitments or penalties for ending the partnership."`
    - **Type**: Section paragraph
    - **Suggested Key**: `partners.legal.paragraph4`

30. **Line 190**: `"Ready to enhance your accommodation offering and generate additional revenue?"`
    - **Type**: CTA section text
    - **Suggested Key**: `partners.cta.question`

31. **Line 193**: `"Apply as a partner"`
    - **Type**: Button text / CTA
    - **Suggested Key**: `partners.cta.button`

32. **Line 196**: `"Partnership application form coming soon. Please contact us directly for more information."`
    - **Type**: Disclaimer text
    - **Suggested Key**: `partners.cta.disclaimer`

---

### `src/ui/components/recommendations/RecommendationsCarousel.client.tsx`

1. **Line 119**: `"Must See"`
   - **Type**: Section heading
   - **Suggested Key**: `home.mustSee` or `common.mustSee` (already exists, but not used)

2. **Lines 14-33**: All subtitle values in `ROW1_ITEMS` and `ROW2_ITEMS` arrays (e.g., `'Relaxation'`, `'Zoo'`, `'Show'`, `'Theme Park'`, etc.)
   - **Type**: Experience category/subtitle labels
   - **Note**: These appear to be static data, but if they're user-facing, they should be translatable
   - **Suggested Key**: Consider if these need translation keys or if they're just display labels

---

### `src/app/[locale]/experience/[slug]/page.tsx`

1. **Line 26**: `"Experience not found | Tenerife Activity"`
   - **Type**: Metadata title for not-found case
   - **Suggested Key**: `experience.metadata.notFoundTitle`

2. **Line 32**: `"Book ${experience.title} in Tenerife"`
   - **Type**: Metadata description template
   - **Suggested Key**: `experience.metadata.descriptionTemplate` (with variable support)

---

### `src/app/[locale]/vibe/[slug]/page.tsx`

1. **Line 23**: `"Vibe not found | Tenerife Activity"`
   - **Type**: Metadata title for not-found case
   - **Suggested Key**: `vibe.metadata.notFoundTitle`

2. **Line 32**: `"Discover ${translatedTitle.toLowerCase()} experiences in Tenerife"`
   - **Type**: Metadata description template
   - **Suggested Key**: `vibe.metadata.descriptionTemplate` (with variable support)

---

### `src/app/[locale]/not-found.tsx`

1. **Line 9**: `"404 - Page Not Found"`
   - **Type**: Page heading
   - **Suggested Key**: `notFound.page.title` (already exists, but this file doesn't use translations)

2. **Line 12**: `"The page you're looking for doesn't exist."`
   - **Type**: Page description
   - **Suggested Key**: `notFound.page.description` (already exists, but this file doesn't use translations)

3. **Line 17**: `"Go to Home"`
   - **Type**: Button text
   - **Suggested Key**: `notFound.page.goToHome` (already exists, but this file doesn't use translations)

**Note**: This file appears to be a non-localized version. The localized version at `src/app/not-found.tsx` correctly uses translations.

---

## Summary by Category

### Accessibility Labels (aria-label, alt text)
- **Count**: 7 strings
- **Files**: Header.tsx, Breadcrumb.tsx, HeaderSearch.client.tsx
- **Priority**: High (affects screen reader users)

### Navigation & CTAs
- **Count**: 5 strings
- **Files**: ExperienceCard.tsx, ExploreVibesButton.tsx, BookingRedirectClient.tsx
- **Priority**: High (primary user actions)

### Form Labels & Inputs
- **Count**: 4 strings
- **Files**: BookingRedirectClient.tsx, SearchPageClient.tsx
- **Priority**: Medium

### Empty States & Error Messages
- **Count**: 5 strings
- **Files**: SearchPageClient.tsx, GetInspiredQuiz.client.tsx
- **Priority**: Medium

### Page Content (Partners Page)
- **Count**: 32+ strings
- **Files**: PartnersSection.tsx, partners/page.tsx
- **Priority**: High (entire page content)

### Quiz Component
- **Count**: 24+ strings
- **Files**: GetInspiredQuiz.client.tsx
- **Priority**: High (major user-facing feature, but many keys already exist in translations - component needs refactoring)

### Metadata
- **Count**: 4 strings
- **Files**: experience/page.tsx, vibe/page.tsx, partners/page.tsx
- **Priority**: Medium (SEO-related)

### Results & Counts
- **Count**: 3 strings
- **Files**: SearchPageClient.tsx, ExperienceHero.tsx
- **Priority**: Medium

---

## Recommendations

1. **High Priority**: 
   - Partners page content (entire page needs translation keys)
   - GetInspiredQuiz component (needs refactoring to use existing translation keys)
   - Navigation CTAs and button text

2. **Medium Priority**:
   - Metadata templates
   - Empty states and error messages
   - Form labels

3. **Accessibility**:
   - All aria-labels and alt text should use translations for consistency

4. **Component Refactoring Needed**:
   - `GetInspiredQuiz.client.tsx` - Should use existing `getInspired.quiz.*` translation keys
   - `src/app/[locale]/not-found.tsx` - Should use `notFound.page.*` translation keys (like the root version does)
   - `RecommendationsCarousel.client.tsx` - Should use `common.mustSee` or `home.mustSee`

---

## Notes

- Many translation keys already exist in `messages/en.json` but are not being used by components
- The GetInspiredQuiz component appears to be a standalone implementation that duplicates functionality that should use existing translations
- Some metadata strings use template literals with variables - these will need translation functions that support interpolation
- Pluralization is needed for strings like "X experience(s) found" and "X reviews"

