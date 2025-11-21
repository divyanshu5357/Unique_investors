import type { NextApiRequest, NextApiResponse } from 'next';
import { findOrphanedProfiles } from '@/lib/serverUtils';

/**
 * Health check endpoint to monitor data integrity
 * GET /api/health/data-integrity
 * 
 * Returns:
 * - Orphaned profiles count
 * - Total profiles count
 * - Status: healthy/warning/error
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add authentication check
  // const apiKey = req.headers['x-api-key'];
  // if (apiKey !== process.env.INTERNAL_API_KEY) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    const orphanedProfiles = await findOrphanedProfiles();
    
    const status = orphanedProfiles.length === 0 ? 'healthy' : 'warning';
    
    return res.status(200).json({
      status,
      timestamp: new Date().toISOString(),
      checks: {
        orphaned_profiles: {
          status: status,
          count: orphanedProfiles.length,
          profiles: orphanedProfiles.map(p => ({
            id: p.id,
            email: p.email,
            name: p.full_name
          }))
        }
      },
      message: orphanedProfiles.length === 0 
        ? 'All data integrity checks passed' 
        : `Found ${orphanedProfiles.length} orphaned profile(s)`
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message || 'Health check failed'
    });
  }
}
