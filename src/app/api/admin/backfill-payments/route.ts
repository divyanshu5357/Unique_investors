import { NextRequest, NextResponse } from 'next/server';
import { backfillAllInitialBookingPayments } from '@/lib/actions';

export async function POST(request: NextRequest) {
    try {
        const result = await backfillAllInitialBookingPayments();
        
        return NextResponse.json({
            message: `Backfill complete: ${result.created} payments created, ${result.skipped} skipped`,
            ...result
        });
    } catch (error) {
        console.error('Backfill error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to backfill payments' 
            },
            { status: 500 }
        );
    }
}
