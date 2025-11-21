import { NextRequest, NextResponse } from 'next/server';
// Manual recalculation disabled: route kept but returns 403 to preserve audit integrity
// Original logic using recalculateCommissionForPlot removed.

export async function POST(_request: NextRequest) {
    return NextResponse.json(
        { error: 'Manual commission recalculation disabled. Commissions are calculated automatically.' },
        { status: 403 }
    );
}

// GET endpoint to recalculate ALL sold plots
export async function GET() {
    return NextResponse.json(
        { error: 'Bulk commission recalculation disabled. System handles commission distribution automatically.' },
        { status: 403 }
    );
}
