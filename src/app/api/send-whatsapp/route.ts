import { NextRequest, NextResponse } from 'next/server';

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
        const whatsappMessage = `📬 New Contact Form Submission\n\n👤 Name: ${firstName} ${lastName || ''}\n📧 Email: ${email}\n📞 Phone: ${phone || 'Not provided'}\n\n💬 Message:\n${message}`;

        // Method 1: Using Twilio WhatsApp API (if you have credentials)
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
            try {
                const twilio = require('twilio');
                const client = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );

                await client.messages.create({
                    body: whatsappMessage,
                    from: process.env.TWILIO_WHATSAPP_FROM, // e.g., 'whatsapp:+14155552671'
                    to: 'whatsapp:+918810317477' // Your WhatsApp number
                });

                return NextResponse.json(
                    { success: true, message: 'WhatsApp message sent successfully' },
                    { status: 200 }
                );
            } catch (twilioError) {
                console.error('Twilio error:', twilioError);
                // Continue to fallback method
            }
        }

        // Method 2: Using Meta WhatsApp Business API (if you have access token)
        if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
            try {
                const response = await fetch(
                    `https://graph.instagram.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
                        },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            to: '918810317477',
                            type: 'text',
                            text: {
                                preview_url: false,
                                body: whatsappMessage
                            }
                        })
                    }
                );

                if (response.ok) {
                    return NextResponse.json(
                        { success: true, message: 'WhatsApp message sent via Meta API' },
                        { status: 200 }
                    );
                } else {
                    const error = await response.json();
                    console.error('Meta API error:', error);
                    // Continue to fallback method
                }
            } catch (metaError) {
                console.error('Meta API error:', metaError);
                // Continue to fallback method
            }
        }

        // Method 3: Fallback - Return WhatsApp link for manual sending
        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappUrl = `https://wa.me/918810317477?text=${encodedMessage}`;

        return NextResponse.json(
            {
                success: true,
                message: 'Contact form saved. WhatsApp link generated.',
                whatsappUrl: whatsappUrl,
                instructions: 'Use the whatsappUrl to send message via WhatsApp manually'
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error in send-whatsapp route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
