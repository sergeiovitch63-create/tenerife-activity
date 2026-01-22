# Atlantico Experience Repository

## Overview

The `AtlanticoExperienceRepository` implements the `ExperienceRepository` interface using data from the Atlantico API. It fetches data through internal Next.js API routes (`/api/atlantico/group` and `/api/atlantico/event`) rather than calling the external API directly.

## How It Works

1. **Group Listing**: Fetches group details from `/api/atlantico/group/{groupId}/{lang}` to get a list of event codes
2. **Event Hydration**: For each event code, fetches full details from `/api/atlantico/event/{eventCode}/{lang}`
3. **Mapping**: Converts Atlantico event data to domain `Experience` entities using the mappers in `src/lib/atlantico/mappers.ts`

## Configuration

### Default Group ID

The repository uses **group ID 31** by default. This can be changed via environment variable:

```bash
ATLANTICO_DEFAULT_GROUP_ID=31
```

To use a different group, set this variable in your `.env.local` or deployment environment.

### Language

Default language is **ENG** (English). This is currently hardcoded but can be enhanced to support multiple languages.

## Concurrency Control

The repository limits concurrent API requests to **8 simultaneous requests** to avoid flooding the API. This is implemented using a simple request pool.

When fetching multiple events (e.g., in `findAll()`), requests are queued and executed in batches of 8.

## Internal Endpoints Used

The repository uses these internal Next.js API routes:

- **GET `/api/atlantico/group/{groupId}/{lang}`**
  - Returns group details including list of event codes
  - Used by: `findAll()`, `findByVibeId()`, `findMustSee()`

- **GET `/api/atlantico/event/{eventCode}/{lang}`**
  - Returns full event details
  - Used by: `findById()`, and for hydrating events from groups

## Fallback Behavior

- **Development**: If `ATLANTICO_BASE_URL` is not set, the repository automatically falls back to `MockExperienceRepository`
- **Production**: Requires valid Atlantico configuration
- **Error Handling**: Network errors or API failures result in empty arrays or null results, with warnings logged in development mode only

## Repository Methods

All methods from `ExperienceRepository` are implemented:

- `findAll()`: Fetches all experiences from the default group
- `findBySlug(slug)`: Finds experience by slug (searches all experiences)
- `findById(id)`: Finds experience by ID (event code)
- `findByVibeId(vibeId)`: Filters experiences by vibe ID (currently all use default vibeId '1')
- `search(query)`: Searches in title, description, and location
- `findMustSee()`: Returns first 6 experiences (can be enhanced with curation logic)

## Data Mapping

The repository maps Atlantico event data to domain `Experience` entities:

- **ID**: Event code
- **Slug**: Generated from event code (lowercase, sanitized)
- **Title**: Event name or title
- **Description**: Event description or short description
- **Price**: Extracted from raw data (defaults to 0)
- **Currency**: Extracted from raw data (defaults to 'EUR')
- **Vibe ID**: Currently defaults to '1' (can be enhanced with mapping)
- **Times**: Available time slots (stored in `availabilityHint`)

## Performance Considerations

- **Caching**: Next.js API routes handle caching (5-minute revalidation)
- **Concurrency**: Limited to 8 concurrent requests
- **Lazy Loading**: Events are only fetched when needed

## Future Enhancements

- Support for multiple languages
- Vibe mapping (assign experiences to correct vibes)
- Curation logic for `findMustSee()`
- Direct event code lookup optimization for `findBySlug()`
- Support for multiple groups

