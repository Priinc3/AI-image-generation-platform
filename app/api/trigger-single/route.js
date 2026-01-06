import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const prompt = formData.get('prompt');
        const image = formData.get('image'); // Optional reference image (file)
        const imageUrl = formData.get('imageUrl'); // Optional reference image URL (from edit mode)
        const stylePreset = formData.get('stylePreset') || 'ecommerce';
        const stylePromptSuffix = formData.get('stylePromptSuffix') || '';
        const width = formData.get('width') || '1024';
        const height = formData.get('height') || '1024';
        const creativity = formData.get('creativity') || '0.7';
        const variations = formData.get('variations') || '2';
        const customWebhookUrl = formData.get('webhookUrl');

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        // Use custom webhook URL from request, or fall back to environment variable
        const webhookUrl = customWebhookUrl || process.env.N8N_SINGLE_WEBHOOK_URL;

        console.log('Single Image Webhook URL:', webhookUrl);

        if (!webhookUrl) {
            console.error('No webhook URL provided');
            return NextResponse.json(
                { error: 'Webhook URL not configured. Please set it in Settings or .env.local' },
                { status: 500 }
            );
        }

        // Create FormData to send to n8n
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

        // Add image as binary if provided (file upload)
        if (image && image.size > 0) {
            const imageBuffer = await image.arrayBuffer();
            const imageBlob = new Blob([imageBuffer], { type: image.type || 'image/png' });
            n8nFormData.append('image', imageBlob, image.name || 'reference_image.png');
            console.log('Reference image from file:', imageBuffer.byteLength, 'bytes');
        } else if (imageUrl) {
            // Fetch the image from URL and send as binary (for edit mode)
            console.log('Fetching image from URL:', imageUrl);
            try {
                const imageResponse = await fetch(imageUrl);
                if (imageResponse.ok) {
                    const imageBuffer = await imageResponse.arrayBuffer();
                    const contentType = imageResponse.headers.get('content-type') || 'image/png';
                    const imageBlob = new Blob([imageBuffer], { type: contentType });
                    n8nFormData.append('image', imageBlob, 'reference_image.png');
                    console.log('Reference image from URL:', imageBuffer.byteLength, 'bytes');
                } else {
                    console.warn('Failed to fetch image from URL:', imageResponse.status);
                    // Still pass the URL as fallback
                    n8nFormData.append('image_url', imageUrl);
                }
            } catch (fetchError) {
                console.error('Error fetching image from URL:', fetchError);
                // Still pass the URL as fallback
                n8nFormData.append('image_url', imageUrl);
            }
        }

        console.log('Sending to n8n:', webhookUrl);

        // Trigger n8n workflow
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

        // Try to parse JSON response
        const responseText = await n8nResponse.text();
        console.log('n8n raw response:', responseText.substring(0, 500));

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse n8n response as JSON:', parseError);
            // If n8n returns empty or invalid JSON, return success anyway
            // The frontend will fetch images from S3
            return NextResponse.json({
                success: true,
                message: 'Workflow triggered, check S3 for images',
                rawResponse: responseText.substring(0, 100),
            });
        }

        console.log('n8n success, parsed result');

        // Normalize response - handle various n8n output formats
        let images = [];

        const extractS3Url = (item) => {
            return item.Location || item.url || item.s3Url || item.publicUrl || '';
        };

        const extractKey = (item) => {
            return item.Key || item.key || item.fileName || item.name || '';
        };

        if (Array.isArray(result)) {
            images = result.map((item, idx) => ({
                url: extractS3Url(item),
                key: extractKey(item),
                name: extractKey(item) || `variant_${idx + 1}.png`,
                bucket: item.Bucket || item.bucket || 'amazon-image-data',
            })).filter(img => img.url);
        } else if (result.images && Array.isArray(result.images)) {
            images = result.images.map((item, idx) => ({
                url: extractS3Url(item) || item.url,
                key: extractKey(item),
                name: extractKey(item) || item.name || `variant_${idx + 1}.png`,
            })).filter(img => img.url);
        } else if (result.Location || result.url) {
            images = [{
                url: extractS3Url(result),
                key: extractKey(result),
                name: extractKey(result) || 'generated_image.png',
            }];
        } else if (result.success && result.count) {
            if (result.images) {
                images = result.images;
            }
        }

        console.log('Normalized images:', images.length);

        return NextResponse.json({
            success: true,
            count: images.length,
            images: images,
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
