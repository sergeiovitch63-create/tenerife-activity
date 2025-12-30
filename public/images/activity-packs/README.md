# Activity Pack Images

This folder contains images for Activity Pack cards displayed on the homepage.

## Folder Structure

Each Activity Pack has its own folder:

```
activity-packs/
├── twin-ticket/
│   └── cover.jpg          # Main image for Twin Ticket pack
├── two-parks-ticket/
│   └── cover.jpg          # Main image for Two Parks Ticket pack
├── special-packs/
│   └── cover.jpg          # Main image for Special Packs
└── booster-packs/
    └── cover.jpg          # Main image for Booster Packs
```

## Image Requirements

- **File name**: `cover.jpg` (required)
- **Aspect ratio**: 16:9 (recommended)
- **Format**: JPG, PNG, or WebP
- **Size**: Recommended 1920x1080px or larger for high-quality display

## Adding Images

1. Place your image file as `cover.jpg` in the appropriate pack folder
2. The image will automatically appear on the Activity Pack card
3. If an image is missing, a gradient fallback will be displayed

## Future Gallery Support

Each pack folder can contain additional images for future gallery features:
- `gallery-1.jpg`
- `gallery-2.jpg`
- etc.

## Image Paths

Images are referenced in the Activity Packs data configuration:
- `/images/activity-packs/twin-ticket/cover.jpg`
- `/images/activity-packs/two-parks-ticket/cover.jpg`
- `/images/activity-packs/special-packs/cover.jpg`
- `/images/activity-packs/booster-packs/cover.jpg`


