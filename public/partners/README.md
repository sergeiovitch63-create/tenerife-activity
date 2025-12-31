# Partner Logos

This directory contains partner logo files for the "Our Partners" section.

## Accepted Formats

- **.svg** (preferred) - Vector format, scalable, small file size
- **.png** (allowed) - Raster format, use only if SVG is not available

## Recommended Specifications

- **Size**: ~400px wide
- **Background**: Transparent (required)
- **Aspect ratio**: Consistent across all logos (recommended: 3:1 or 4:1 for horizontal logos)
- **File size**: Keep under 100KB per logo

## Naming Convention

Use the following naming pattern:

```
partner-{name}.svg
```

Examples:
- `partner-atlantico.svg`
- `partner-getyourguide.svg`
- `partner-xyz.svg`

## Usage

Partner logos are referenced in `/src/data/partners.ts`. To add a new partner:

1. Add the logo file to this directory following the naming convention
2. Update `/src/data/partners.ts` with the new partner entry

