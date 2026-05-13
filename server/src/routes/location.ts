import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { verifyAccessToken } from '../models/user';

const router = Router();

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = verifyAccessToken(token);
    (req as any).userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const result = await query('SELECT role FROM users WHERE id = $1', [userId]);
  if (result.rows[0]?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Mock geocoding for common cities
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'new york':      { lat: 40.7128, lng: -74.0060 },
  'los angeles':   { lat: 34.0522, lng: -118.2437 },
  'chicago':       { lat: 41.8781, lng: -87.6298 },
  'seattle':       { lat: 47.6062, lng: -122.3321 },
  'austin':        { lat: 30.2672, lng: -97.7431 },
  'boston':        { lat: 42.3601, lng: -71.0589 },
  'denver':        { lat: 39.7392, lng: -104.9903 },
  'miami':         { lat: 25.7617, lng: -80.1918 },
  'atlanta':       { lat: 33.7490, lng: -84.3880 },
  'nashville':     { lat: 36.1627, lng: -86.7816 },
  'portland':      { lat: 45.5051, lng: -122.6750 },
  'phoenix':       { lat: 33.4484, lng: -112.0740 },
  'houston':       { lat: 29.7604, lng: -95.3698 },
  'san diego':     { lat: 32.7157, lng: -117.1611 },
  'washington':    { lat: 38.9072, lng: -77.0369 },
  'dallas':        { lat: 32.7767, lng: -96.7970 },
  'las vegas':     { lat: 36.1699, lng: -115.1398 },
  'pittsburgh':    { lat: 40.4406, lng: -79.9959 },
  'reno':          { lat: 39.5296, lng: -119.8138 },
  'memphis':       { lat: 35.1495, lng: -90.0490 },
  'louisville':    { lat: 38.2527, lng: -85.7585 },
  'charlotte':     { lat: 35.2271, lng: -80.8431 },
  'hartford':      { lat: 41.7658, lng: -72.6851 },
  'cleveland':     { lat: 41.4993, lng: -81.6944 },
  'detroit':       { lat: 42.3314, lng: -83.0458 },
  'des moines':    { lat: 41.5868, lng: -93.6250 },
};

function geocodeLocation(location: string): { lat: number; lng: number } | null {
  const normalized = location.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(city)) return coords;
  }
  return null;
}

// Search jobs by location
router.get('/jobs-by-location', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = '50', remote, page = '1', limit = '20' } = req.query as Record<string, string>;

    const params: any[] = [];
    let sql: string;

    if (lat && lng) {
      params.push(parseFloat(lat), parseFloat(lng));
      sql = `
        SELECT j.*, s.name as startup_name, s.logo_url as startup_logo,
               s.stage as startup_stage, s.location as startup_location,
               s.verified as startup_verified, s.slug as startup_slug,
               s.lat, s.lng,
               (3959 * acos(LEAST(1, cos(radians($1)) * cos(radians(s.lat)) *
                cos(radians(s.lng) - radians($2)) + sin(radians($1)) * sin(radians(s.lat))))) AS distance
        FROM jobs j
        JOIN startups s ON j.startup_id = s.id
        WHERE j.status = 'active'
          AND s.lat IS NOT NULL AND s.lng IS NOT NULL
          AND (3959 * acos(LEAST(1, cos(radians($1)) * cos(radians(s.lat)) *
               cos(radians(s.lng) - radians($2)) + sin(radians($1)) * sin(radians(s.lat))))) <= $3
      `;
      params.push(parseFloat(radius));
    } else {
      sql = `
        SELECT j.*, s.name as startup_name, s.logo_url as startup_logo,
               s.stage as startup_stage, s.location as startup_location,
               s.verified as startup_verified, s.slug as startup_slug,
               s.lat, s.lng
        FROM jobs j
        JOIN startups s ON j.startup_id = s.id
        WHERE j.status = 'active'
      `;
    }

    if (remote === 'true') {
      sql += ` AND j.remote_allowed = true`;
    }

    sql += ` ORDER BY j.featured DESC, j.created_at DESC`;
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await query(sql, params);
    res.json({ jobs: result.rows, total: result.rows.length, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Jobs by location error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs by location' });
  }
});

// Get companies with locations for map
router.get('/companies-map', async (req: Request, res: Response) => {
  try {
    const { bounds, filters } = req.query;
    const params: any[] = [];

    let sql = `
      SELECT s.id, s.name, s.slug, s.logo_url, s.location, s.stage, s.verified,
             s.lat, s.lng, s.description,
             COUNT(j.id) as job_count
      FROM startups s
      LEFT JOIN jobs j ON s.id = j.startup_id AND j.status = 'active'
      WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
    `;

    if (bounds) {
      const b = JSON.parse(bounds as string);
      sql += ` AND s.lat BETWEEN $${params.length + 1} AND $${params.length + 2} AND s.lng BETWEEN $${params.length + 3} AND $${params.length + 4}`;
      params.push(b.south, b.north, b.west, b.east);
    }

    if (filters) {
      const f = JSON.parse(filters as string);
      if (f.stages?.length) {
        sql += ` AND s.stage = ANY($${params.length + 1})`;
        params.push(f.stages);
      }
      if (f.verifiedOnly) {
        sql += ` AND s.verified = true`;
      }
    }

    sql += ` GROUP BY s.id HAVING COUNT(j.id) > 0`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Companies map error:', error);
    res.status(500).json({ error: 'Failed to fetch companies for map' });
  }
});

// Update company coordinates — must own the company or be admin
router.put('/company-coordinates/:startupId', authenticate, async (req: Request, res: Response) => {
  try {
    const { lat, lng, address } = req.body;
    const { startupId } = req.params;
    const userId = (req as any).userId;

    const ownerCheck = await query(
      `SELECT s.id FROM startups s
       LEFT JOIN users u ON u.id = $1
       WHERE s.id = $2 AND (s.created_by = $1 OR u.role = 'admin')`,
      [userId, startupId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to update this company' });
    }

    await query(
      'UPDATE startups SET lat = $1, lng = $2, location = COALESCE($3, location) WHERE id = $4',
      [lat, lng, address, startupId]
    );
    res.json({ message: 'Coordinates updated successfully' });
  } catch (error) {
    console.error('Update coordinates error:', error);
    res.status(500).json({ error: 'Failed to update coordinates' });
  }
});

// Geocode all companies — admin only
router.post('/geocode-all', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const companies = await query('SELECT id, location FROM startups WHERE lat IS NULL OR lng IS NULL');
    const results = [];
    for (const company of companies.rows) {
      const coords = geocodeLocation(company.location);
      if (coords) {
        await query('UPDATE startups SET lat = $1, lng = $2 WHERE id = $3', [coords.lat, coords.lng, company.id]);
        results.push({ id: company.id, location: company.location, coords });
      }
    }
    res.json({ message: `Geocoded ${results.length} companies`, results });
  } catch (error) {
    console.error('Geocode all error:', error);
    res.status(500).json({ error: 'Failed to geocode companies' });
  }
});

// Get popular locations
router.get('/popular-locations', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT s.location, COUNT(j.id) as job_count,
             AVG(s.lat) as lat, AVG(s.lng) as lng
      FROM startups s
      JOIN jobs j ON s.id = j.startup_id
      WHERE j.status = 'active'
      GROUP BY s.location
      ORDER BY job_count DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Popular locations error:', error);
    res.status(500).json({ error: 'Failed to fetch popular locations' });
  }
});

export default router;
