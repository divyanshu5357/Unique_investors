import { NextRequest, NextResponse } from 'next/server';

/**
 * WhatsApp Contact Form Handler
 * Uses Manual Link Method (No External Dependencies)
 * 
 * Generates a WhatsApp link that opens a pre-filled message
 * User can copy/paste the formatted message
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { firstName, lastName, email, phone, message } = body;

        // Validate required fields
        if (!firstName || !email || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Format the message for WhatsApp
        const fullName = lastName ? `${firstName} ${lastName}` : firstName;
        const whatsappMessage = `📬 New Contact Form Submission\n\n👤 Name: ${fullName}\n📧 Email: ${email}\n📞 Phone: ${phone || 'Not provided'}\n\n💬 Message:\n${message}`;

        // Generate WhatsApp link
        // This creates a wa.me link that pre-fills the message
        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappUrl = `https://wa.me/918810317477?text=${encodedMessage}`;

        // Log for tracking
        console.log('✅ WhatsApp contact form processed:', {
            name: fullName,
            email: email,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Contact form processed successfully',
                whatsappUrl: whatsappUrl,
                method: 'Manual WhatsApp Link',
                instructions: 'Share this link or the formatted message via WhatsApp'
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('❌ Error in WhatsApp route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
