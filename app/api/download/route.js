import { NextResponse } from 'next/server';

/**
 * Proxy endpoint to download S3 images
 * This bypasses CORS issues when downloading S3 images from the browser
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get('url');
        const filename = searchParams.get('filename') || 'image.png';

        if (!imageUrl) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Fetch the image from S3
        const response = await fetch(imageUrl);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.status}` },
                { status: response.status }
            );
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        // Return the image with download headers
        return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
                'Content-Type': blob.type || 'image/png',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': arrayBuffer.byteLength.toString(),
            },
        });
    } catch (error) {
        console.error('Download proxy error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to download image' },
            { status: 500 }
        );
    }
}
