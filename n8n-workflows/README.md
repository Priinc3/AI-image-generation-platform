# n8n Workflow Setup Guide

This directory contains the n8n workflows needed for the Image Generator platform.

## Workflows

### 1. Amazon PDP Webhook (`amazon-pdp-webhook.json`)
Generates 6 Amazon product listing images from a product image and description.

**Webhook Path:** `/webhook/amazon-pdp`

**Expected Input (POST JSON):**
```json
{
  "image": "data:image/png;base64,...",
  "raw_description": "Your product description..."
}
```

**Output:**
```json
{
  "images": [
    { "data": "base64...", "name": "01_Hero" },
    { "data": "base64...", "name": "02_Ingredients" },
    { "data": "base64...", "name": "03_Benefits" },
    { "data": "base64...", "name": "04_Trust" },
    { "data": "base64...", "name": "05_Usage" },
    { "data": "base64...", "name": "06_Brand_Promise" }
  ]
}
```

---

### 2. Single Image Webhook (`single-image-webhook.json`)
Generates a single AI image from a text prompt.

**Webhook Path:** `/webhook/single-image`

**Expected Input (POST JSON):**
```json
{
  "prompt": "Your image description...",
  "image": "data:image/png;base64,..." // Optional reference image
}
```

**Output:**
```json
{
  "image": "base64..."
}
```

---

## Setup Instructions

### Step 1: Import Workflows
1. Open your n8n instance
2. Go to **Workflows** → **Import from File**
3. Import both JSON files from this directory

### Step 2: Configure Credentials
1. In each workflow, select the Google Gemini nodes
2. Update the credentials to use your Google API key:
   - Go to **Credentials** → **New Credential**
   - Select **Google PaLM API** (for Gemini)
   - Enter your API key from Google Cloud Console

### Step 3: Activate Webhooks
1. Open each workflow
2. Click **Activate** (toggle at the top right)
3. Copy the webhook URL displayed in the Webhook Trigger node

### Step 4: Update Environment Variables
In your Vercel project or `.env.local` file:

```env
N8N_PDP_WEBHOOK_URL=https://your-n8n.com/webhook/amazon-pdp
N8N_SINGLE_WEBHOOK_URL=https://your-n8n.com/webhook/single-image
```

---

## Important Notes

1. **n8n must be publicly accessible** - The webhooks need to be reachable from Vercel's servers

2. **Timeout Considerations** - Image generation can take 30-60 seconds. Ensure:
   - Your n8n timeout is set appropriately
   - Vercel function timeout is sufficient (use Pro plan if needed)

3. **Rate Limits** - Google Gemini has rate limits. Monitor usage to avoid hitting limits.

4. **Credentials** - Replace `YOUR_CREDENTIAL_ID` placeholders with your actual n8n credential IDs.
