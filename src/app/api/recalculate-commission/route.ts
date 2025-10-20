import { NextRequest, NextResponse } from 'next/server';
import { recalculateCommissionForPlot } from '@/lib/actions';

export async function POST(request: NextRequest) {
    try {
        const { plotId } = await request.json();
        
        if (!plotId) {
            return NextResponse.json(
                { error: 'Plot ID is required' },
                { status: 400 }
            );
        }
        
        console.log(`🔄 API: Recalculating commission for plot: ${plotId}`);
        
        const result = await recalculateCommissionForPlot(plotId);
        
        if (result.success) {
            return NextResponse.json({
                success: true,
                message: result.message,
                data: result.result
            });
        } else {
            return NextResponse.json(
                { error: result.message },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('❌ API Error recalculating commission:', error);
        return NextResponse.json(
            { error: (error as Error).message || 'Failed to recalculate commission' },
            { status: 500 }
        );
    }
}

// GET endpoint to recalculate ALL sold plots
export async function GET() {
    try {
        const { calculateCommissionForSoldPlots } = await import('@/lib/actions');
        
        console.log('🔄 API: Recalculating commissions for all sold plots');
        
        const result = await calculateCommissionForSoldPlots();
        
        return NextResponse.json(result);
    } catch (error) {
        console.error('❌ API Error:', error);
        return NextResponse.json(
            { error: (error as Error).message || 'Failed to recalculate commissions' },
            { status: 500 }
        );
    }
}
