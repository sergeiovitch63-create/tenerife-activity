# Placeholder Images

This directory contains fallback placeholder images used when the API doesn't provide an image.

## Required Images

The following placeholder images should be added to this directory:

- `hiking.jpg` - Hiking/trekking activities
- `ocean.jpg` - Ocean/water activities
- `boat.jpg` - Boat/sailing activities
- `city.jpg` - City/urban tours
- `jeep.jpg` - Jeep/safari tours
- `karting.jpg` - Karting/racing activities
- `spa.jpg` - Spa/wellness activities
- `nightlife.jpg` - Nightlife/party activities
- `beach.jpg` - Beach activities
- `mountain.jpg` - Mountain activities
- `adventure.jpg` - General adventure activities
- `culture.jpg` - Cultural tours
- `food.jpg` - Food/restaurant activities
- `sunset.jpg` - Sunset/viewpoint activities
- `wildlife.jpg` - Wildlife/nature activities

## Image Requirements

- Format: JPG or PNG
- Recommended size: 1200x800px (4:3 aspect ratio)
- File size: Keep under 200KB per image for performance
- Content: Generic, representative images that match the activity type

## Usage

The fallback system automatically selects a placeholder based on:
1. Vibe ID (if available)
2. Title/description keywords
3. Deterministic hash of groupCode/slug (for consistency)

Images are served from `/placeholders/<name>.jpg` and work with Next.js Image component.























