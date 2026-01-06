import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const image = formData.get('image');
        const description = formData.get('description');
        const extraPrompt = formData.get('extraPrompt') || '';
        const customWebhookUrl = formData.get('webhookUrl');

        // New parameters
        const stylePreset = formData.get('stylePreset') || 'ecommerce';
        const stylePromptSuffix = formData.get('stylePromptSuffix') || '';
        const width = formData.get('width') || '1024';
        const height = formData.get('height') || '1024';
        const creativity = formData.get('creativity') || '0.7';

        if (!image || !description) {
            return NextResponse.json(
                { error: 'Image and description are required' },
                { status: 400 }
            );
        }

        // Use custom webhook URL from request, or fall back to environment variable
        const webhookUrl = customWebhookUrl || process.env.N8N_PDP_WEBHOOK_URL;

        console.log('Webhook URL:', webhookUrl);

        if (!webhookUrl) {
            console.error('No webhook URL provided');
            return NextResponse.json(
                { error: 'Webhook URL not configured. Please set it in Settings or in .env.local' },
                { status: 500 }
            );
        }

        // Create FormData to send binary file to n8n
        const n8nFormData = new FormData();

        // Add the image as a binary file
        const imageBuffer = await image.arrayBuffer();
        const imageBlob = new Blob([imageBuffer], { type: image.type || 'image/png' });
        n8nFormData.append('image', imageBlob, image.name || 'product_image.png');

        // Add text fields
        n8nFormData.append('raw_description', description);
        n8nFormData.append('extra_prompt', extraPrompt);

        // Add new parameters
        n8nFormData.append('style_preset', stylePreset);
        n8nFormData.append('style_suffix', stylePromptSuffix);
        n8nFormData.append('width', width);
        n8nFormData.append('height', height);
        n8nFormData.append('creativity', creativity);

        console.log('Sending to n8n:', webhookUrl);
        console.log('Image size:', imageBuffer.byteLength, 'bytes');
        console.log('Style preset:', stylePreset);
        console.log('Size:', width, 'x', height);
        console.log('Creativity:', creativity);

        // Trigger n8n workflow with multipart/form-data
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

        const result = await n8nResponse.json();
        console.log('n8n success, images received:', result.images?.length || 0);

        return NextResponse.json(result);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const maxDuration = 300;
