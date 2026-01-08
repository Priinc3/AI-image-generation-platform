import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const prompt = formData.get('prompt');
        const stylePreset = formData.get('stylePreset') || 'ecommerce';
        const stylePromptSuffix = formData.get('stylePromptSuffix') || '';
        const width = formData.get('width') || '1024';
        const height = formData.get('height') || '1024';
        const creativity = formData.get('creativity') || '0.7';
        const variations = formData.get('variations') || '2';
        const customWebhookUrl = formData.get('webhookUrl');
        const imageCount = formData.get('imageCount') || '1';

        // Get multiple images (image1, image2, image3) or URLs
        const images = [];
        const imageUrls = [];

        for (let i = 1; i <= 3; i++) {
            const image = formData.get(`image${i}`);
            const imageUrl = formData.get(`imageUrl${i}`);

            if (image && image.size > 0) {
                images.push({ index: i, file: image });
            } else if (imageUrl) {
                imageUrls.push({ index: i, url: imageUrl });
            }
        }

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        if (images.length === 0 && imageUrls.length === 0) {
            return NextResponse.json(
                { error: 'At least one reference image is required' },
                { status: 400 }
            );
        }

        const webhookUrl = customWebhookUrl || process.env.N8N_SINGLE_WEBHOOK_URL;

        console.log('Image Editor Webhook URL:', webhookUrl);
        console.log('Image count:', imageCount);
        console.log('File images:', images.length);
        console.log('URL images:', imageUrls.length);

        if (!webhookUrl) {
            console.error('No webhook URL provided');
            return NextResponse.json(
                { error: 'Webhook URL not configured. Please set it in Settings or .env.local' },
                { status: 500 }
            );
        }

        const n8nFormData = new FormData();

        // Build full prompt with style
        const fullPrompt = stylePromptSuffix
            ? `${prompt}. ${stylePromptSuffix}`
            : prompt;

        // Add all parameters
        n8nFormData.append('prompt', fullPrompt);
        n8nFormData.append('raw_prompt', prompt);
        n8nFormData.append('style_preset', stylePreset);
        n8nFormData.append('style_suffix', stylePromptSuffix);
        n8nFormData.append('width', width);
        n8nFormData.append('height', height);
        n8nFormData.append('creativity', creativity);
        n8nFormData.append('variations', variations);
        n8nFormData.append('image_count', imageCount);

        // Add file images
        for (const img of images) {
            const imageBuffer = await img.file.arrayBuffer();
            const imageBlob = new Blob([imageBuffer], { type: img.file.type || 'image/png' });
            n8nFormData.append(`image${img.index}`, imageBlob, img.file.name || `reference_image_${img.index}.png`);
            console.log(`Image ${img.index} size:`, imageBuffer.byteLength, 'bytes');
        }

        // For URL images, fetch and send as binary
        for (const img of imageUrls) {
            console.log(`Fetching image ${img.index} from URL:`, img.url);
            try {
                const imageResponse = await fetch(img.url);
                if (imageResponse.ok) {
                    const imageBuffer = await imageResponse.arrayBuffer();
                    const contentType = imageResponse.headers.get('content-type') || 'image/png';
                    const imageBlob = new Blob([imageBuffer], { type: contentType });
                    n8nFormData.append(`image${img.index}`, imageBlob, `reference_image_${img.index}.png`);
                    console.log(`Image ${img.index} from URL size:`, imageBuffer.byteLength, 'bytes');
                } else {
                    console.warn(`Failed to fetch image ${img.index} from URL:`, imageResponse.status);
                    n8nFormData.append(`image_url${img.index}`, img.url);
                }
            } catch (fetchError) {
                console.error(`Error fetching image ${img.index} from URL:`, fetchError);
                n8nFormData.append(`image_url${img.index}`, img.url);
            }
        }

        console.log('Sending to n8n:', webhookUrl);

        const n8nResponse = await fetch(webhookUrl, {
            method: 'POST',
            body: n8nFormData,
        });

        console.log('n8n response status:', n8nResponse.status);

        if (!n8nResponse.ok) {
            const errorText = await n8nResponse.text();
            console.error('n8n error response:', errorText);
            return NextResponse.json(
                { error: `n8n workflow error: ${n8nResponse.status} - ${errorText.substring(0, 200)}` },
                { status: 500 }
            );
        }

        const responseText = await n8nResponse.text();
        console.log('n8n raw response:', responseText.substring(0, 500));

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse n8n response as JSON:', parseError);
            return NextResponse.json({
                success: true,
                message: 'Workflow triggered, check S3 for images',
                rawResponse: responseText.substring(0, 100),
            });
        }

        console.log('n8n success, parsed result');

        let resultImages = [];

        const extractS3Url = (item) => {
            return item.Location || item.url || item.s3Url || item.publicUrl || '';
        };

        const extractKey = (item) => {
            return item.Key || item.key || item.fileName || item.name || '';
        };

        if (Array.isArray(result)) {
            resultImages = result.map((item, idx) => ({
                url: extractS3Url(item),
                key: extractKey(item),
                name: extractKey(item) || `variant_${idx + 1}.png`,
                bucket: item.Bucket || item.bucket || 'amazon-image-data',
            })).filter(img => img.url);
        } else if (result.images && Array.isArray(result.images)) {
            resultImages = result.images.map((item, idx) => ({
                url: extractS3Url(item) || item.url,
                key: extractKey(item),
                name: extractKey(item) || item.name || `variant_${idx + 1}.png`,
            })).filter(img => img.url);
        } else if (result.Location || result.url) {
            resultImages = [{
                url: extractS3Url(result),
                key: extractKey(result),
                name: extractKey(result) || 'generated_image.png',
            }];
        } else if (result.success && result.count) {
            if (result.images) {
                resultImages = result.images;
            }
        }

        console.log('Normalized images:', resultImages.length);

        return NextResponse.json({
            success: true,
            count: resultImages.length,
            images: resultImages,
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const maxDuration = 180;
