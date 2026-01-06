import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request) {
    try {
        const body = await request.json();

        const {
            accessKeyId,
            secretAccessKey,
            region = 'ap-south-1',
            bucket = 'amazon-image-data',
            prefix = '',
            maxKeys = 100
        } = body;

        if (!accessKeyId || !secretAccessKey) {
            return NextResponse.json(
                { error: 'AWS credentials are required' },
                { status: 400 }
            );
        }

        const s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        // List objects in bucket
        const listCommand = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: maxKeys,
        });

        const listResponse = await s3Client.send(listCommand);

        // Filter for image files only
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        const imageObjects = (listResponse.Contents || []).filter(obj => {
            const key = obj.Key?.toLowerCase() || '';
            return imageExtensions.some(ext => key.endsWith(ext)) ||
                !key.includes('.'); // Include files without extension (like your uploads)
        });

        // Generate signed URLs for each image (valid for 1 hour)
        const images = await Promise.all(
            imageObjects.map(async (obj) => {
                const getCommand = new GetObjectCommand({
                    Bucket: bucket,
                    Key: obj.Key,
                });

                // Generate pre-signed URL (valid for 1 hour)
                const signedUrl = await getSignedUrl(s3Client, getCommand, {
                    expiresIn: 3600
                });

                // Extract name from key
                const name = obj.Key?.split('/').pop() || obj.Key;

                return {
                    key: obj.Key,
                    name: name,
                    url: signedUrl,
                    publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${obj.Key}`,
                    size: obj.Size,
                    lastModified: obj.LastModified?.toISOString(),
                };
            })
        );

        // Sort by last modified (newest first)
        images.sort((a, b) => {
            const dateA = new Date(a.lastModified || 0);
            const dateB = new Date(b.lastModified || 0);
            return dateB.getTime() - dateA.getTime();
        });

        return NextResponse.json({
            success: true,
            count: images.length,
            bucket,
            images,
        });

    } catch (error) {
        console.error('S3 list error:', error);
        return NextResponse.json(
            {
                error: 'Failed to list S3 bucket contents',
                details: error.message
            },
            { status: 500 }
        );
    }
}

// GET method for simpler access (uses env variables)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const prefix = searchParams.get('prefix') || '';
        const maxKeys = parseInt(searchParams.get('maxKeys') || '100');

        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const region = process.env.AWS_REGION || 'ap-south-1';
        const bucket = process.env.AWS_S3_BUCKET || 'amazon-image-data';

        if (!accessKeyId || !secretAccessKey) {
            return NextResponse.json(
                { error: 'AWS credentials not configured in environment' },
                { status: 400 }
            );
        }

        const s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        const listCommand = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: maxKeys,
        });

        const listResponse = await s3Client.send(listCommand);

        const imageObjects = (listResponse.Contents || []).filter(obj => {
            const key = obj.Key?.toLowerCase() || '';
            return !key.endsWith('/'); // Exclude folders
        });

        const images = await Promise.all(
            imageObjects.map(async (obj) => {
                const getCommand = new GetObjectCommand({
                    Bucket: bucket,
                    Key: obj.Key,
                });

                const signedUrl = await getSignedUrl(s3Client, getCommand, {
                    expiresIn: 3600
                });

                const name = obj.Key?.split('/').pop() || obj.Key;

                return {
                    key: obj.Key,
                    name: name,
                    url: signedUrl,
                    publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${obj.Key}`,
                    size: obj.Size,
                    lastModified: obj.LastModified?.toISOString(),
                };
            })
        );

        images.sort((a, b) => {
            const dateA = new Date(a.lastModified || 0);
            const dateB = new Date(b.lastModified || 0);
            return dateB.getTime() - dateA.getTime();
        });

        return NextResponse.json({
            success: true,
            count: images.length,
            bucket,
            images,
        });

    } catch (error) {
        console.error('S3 list error:', error);
        return NextResponse.json(
            { error: 'Failed to list S3 bucket contents', details: error.message },
            { status: 500 }
        );
    }
}
