
'use server'

import { Plot, PlotSchema } from './schema';
import { createClient } from '@supabase/supabase-js';


// Create a Supabase client with public API key (anon key)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getPublicPlots(): Promise<Plot[]> {
    try {
        const { data: plots, error } = await supabase
            .from('plots')
            .select(`
                id,
                project_name,
                type,
                block,
                plot_number,
                status,
                dimension,
                area,
                buyer_name
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching public plots:', error);
            throw new Error(`Failed to fetch plots: ${error.message}`);
        }

        if (!plots) return [];

        // Map database fields to application schema
        return plots.map(plot => ({
            id: plot.id,
            projectName: plot.project_name,
            type: plot.type || 'Residential', // Default if missing
            block: plot.block || 'A', // Default if missing
            plotNumber: plot.plot_number,
            status: plot.status,
            dimension: plot.dimension || `${Math.sqrt(plot.area || 1000).toFixed(0)}x${Math.sqrt(plot.area || 1000).toFixed(0)} ft`, // Calculate from area
            area: plot.area,
            buyerName: plot.buyer_name,
            // Omit sensitive fields
        }));
    } catch (error) {
        console.error('Error in getPublicPlots:', error);
        throw new Error(`Failed to get plots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

    