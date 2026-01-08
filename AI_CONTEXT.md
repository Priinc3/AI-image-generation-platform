# AI Context Document: ImageGen AI

> A comprehensive guide for AI assistants to understand this project.

---

## 🎯 What This Product Is

**ImageGen AI** is a web application that enables users to generate professional e-commerce product images using AI. It's specifically designed for Amazon sellers and e-commerce businesses who need high-quality product images without hiring photographers or designers.

### Target Users
- Amazon FBA sellers
- E-commerce store owners
- Product marketers
- Small businesses needing product imagery

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (Vercel)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐│
│  │ Amazon PDP  │  │Image Editor │  │   Gallery   │  │Settings ││
│  │  Generator  │  │ (Multi-img) │  │   (S3)      │  │         ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────┘│
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                           │
│  /api/trigger-pdp    /api/trigger-single    /api/s3/list       │
└─────────┬────────────────┬────────────────────────┬─────────────┘
          │                │                        │
          ▼                ▼                        ▼
┌─────────────────┐  ┌─────────────────┐    ┌─────────────────┐
│   n8n Webhook   │  │   n8n Webhook   │    │    AWS S3       │
│  (PDP Workflow) │  │(Single Workflow)│    │  (Image Store)  │
└────────┬────────┘  └────────┬────────┘    └─────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Gemini AI                             │
│              (Image Generation via n8n nodes)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
image-generator/
├── app/                          # Next.js App Router
│   ├── page.js                   # Homepage
│   ├── amazon-pdp/page.jsx       # Amazon PDP Generator
│   ├── single-image/page.jsx     # Image Editor (multi-image)
│   ├── gallery/page.jsx          # S3 Gallery viewer
│   ├── settings/page.jsx         # Webhook & AWS config
│   └── api/
│       ├── trigger-pdp/route.js  # PDP generation API
│       ├── trigger-single/route.js # Single/multi image API
│       ├── download/route.js     # Image download proxy
│       └── s3/list/route.js      # S3 bucket listing
├── components/
│   ├── Navbar.jsx
│   ├── ImageUploader.jsx
│   ├── ImageLightbox.jsx
│   ├── StylePresets.jsx
│   └── ...
├── utils/
│   ├── downloadZip.js            # Download utilities
│   ├── settingsStorage.js        # localStorage helpers
│   └── galleryStorage.js         # (legacy, not used)
└── styles/
    └── globals.css               # All styling
```

---

## 🔧 Core Features

### 1. Amazon PDP Generator (`/amazon-pdp`)
Generates 6 professional Amazon listing images from a single product photo:
- Hero product shot
- Ingredients/features visualization
- Benefits infographic
- Trust & certifications
- Lifestyle/usage imagery
- Brand promise closer

**Input:**
- Product image (file)
- Product description (text)
- Style preset (optional)
- Size, creativity (optional)

**Webhook receives:**
- `image` (binary)
- `description`
- `style_preset`, `style_suffix`
- `width`, `height`, `creativity`

### 2. Image Editor (`/single-image`)
Creates AI variations from reference images:
- Supports 1-3 reference images (required)
- Custom prompts
- 8 style presets
- Aspect ratio selection
- Creativity control

**Input:**
- Up to 3 reference images (files or URLs)
- Prompt (text)
- Style preset
- Aspect ratio, creativity

**Webhook receives:**
- `image_count` (1, 2, or 3)
- `image1`, `image2`, `image3` (binary)
- `prompt`, `raw_prompt`
- `style_preset`, `style_suffix`
- `width`, `height`, `creativity`

### 3. Gallery (`/gallery`)
Displays all generated images from S3:
- Select multiple images
- Download individual or as ZIP
- Lightbox view
- Refresh from S3

### 4. Settings (`/settings`)
Configure:
- n8n webhook URLs (PDP, Single)
- AWS S3 credentials (for gallery)

---

## 🔗 Integration Points

### n8n Webhooks
The app sends FormData to n8n webhooks. n8n workflows should:
1. Receive the form data and binary images
2. Use Google Gemini nodes for image generation
3. Upload results to S3
4. Return success/failure

**Expected n8n Response:**
```json
{
  "success": true,
  "images": [
    { "Location": "https://s3.../image1.png", "Key": "image1.png" },
    { "Location": "https://s3.../image2.png", "Key": "image2.png" }
  ]
}
```

### AWS S3
- Images are stored in S3 by n8n
- Frontend fetches via `/api/s3/list` with pre-signed URLs
- Downloads use `/api/download` proxy to bypass CORS

---

## 🎨 Style Presets

Available in `components/StylePresets.jsx`:

| ID | Name | Description |
|----|------|-------------|
| ecommerce | E-commerce Clean | White background, studio lighting |
| lifestyle | Lifestyle | Natural settings, in-use context |
| minimal | Minimal | Simple, clean, modern aesthetic |
| luxury | Premium Luxury | Rich colors, elegant presentation |
| vibrant | Vibrant & Bold | Saturated colors, dynamic |
| natural | Natural & Organic | Earth tones, eco-friendly feel |
| tech | Tech & Modern | Sleek, futuristic, tech product style |
| artistic | Artistic | Creative, abstract interpretation |
| custom | Custom | User-defined style suffix |

---

## 🗄️ Data Storage

| What | Where | How |
|------|-------|-----|
| Generated images | AWS S3 | Uploaded by n8n workflows |
| User settings | localStorage | `settingsStorage.js` |
| Webhook URLs | localStorage | Via Settings page |
| AWS credentials | localStorage | Via Settings page |

---

## 🚀 Deployment

**Platform:** Vercel
**Framework:** Next.js 16 (App Router)
**API Timeout:** 180 seconds (for long generations)

**Environment Variables (optional):**
```
N8N_PDP_WEBHOOK_URL=https://...
N8N_SINGLE_WEBHOOK_URL=https://...
```

Note: Users can also set these in the Settings page (stored in localStorage).

---

## 📝 API Reference

### POST `/api/trigger-pdp`
Triggers Amazon PDP image generation.

**FormData:**
- `image` (file) - Product photo
- `description` (string) - Product description
- `webhookUrl` (string) - n8n webhook URL
- `stylePreset` (string) - Style ID
- `stylePromptSuffix` (string) - Style description
- `width` (string) - Image width
- `height` (string) - Image height
- `creativity` (string) - 0.0 to 1.0

### POST `/api/trigger-single`
Triggers Image Editor generation.

**FormData:**
- `image1`, `image2`, `image3` (files) - Reference images
- `imageCount` (string) - Number of images
- `prompt` (string) - Generation prompt
- `webhookUrl` (string) - n8n webhook URL
- `stylePreset`, `stylePromptSuffix`, `width`, `height`, `creativity`

### POST `/api/s3/list`
Lists images from S3 bucket.

**JSON Body:**
- `accessKeyId`, `secretAccessKey`, `region`, `bucket`, `maxKeys`

**Response:**
```json
{
  "success": true,
  "images": [
    { "key": "...", "url": "...", "lastModified": "...", "size": 12345 }
  ]
}
```

### GET `/api/download`
Downloads image with proper headers.

**Query params:**
- `url` - S3 image URL
- `filename` - Download filename

---

## 🐛 Known Behaviors

1. **Generation takes 30-60 seconds** - Normal for AI image generation
2. **S3 images require valid credentials** - Set in Settings page
3. **Webhook URLs must be publicly accessible** - n8n cloud or self-hosted with public URL
4. **Images are fetched after generation** - App polls S3 to find new images

---

## 🔮 Potential Enhancements

- Batch processing multiple products
- Image history/versions
- Direct S3 upload from frontend
- Template saving
- User authentication
- Usage analytics/billing

---

## 📞 Key Technical Decisions

1. **No database** - Uses S3 for images, localStorage for settings
2. **n8n for AI** - Decouples AI logic from frontend, easy to modify
3. **Pre-signed URLs** - Secure S3 access without exposing bucket
4. **Download proxy** - Solves CORS issues for S3 downloads
5. **Suspense boundary** - Required for `useSearchParams` in Next.js 14+

---

*Last updated: January 2026*
