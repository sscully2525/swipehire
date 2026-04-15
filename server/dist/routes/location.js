"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
// Geocode location (in production, use Google Maps or similar)
async function geocodeLocation(location) {
    // Mock geocoding for common cities
    const cityCoords = {
        'san francisco, ca': { lat: 37.7749, lng: -122.4194 },
        'new york, ny': { lat: 40.7128, lng: -74.0060 },
        'los angeles, ca': { lat: 34.0522, lng: -118.2437 },
        'chicago, il': { lat: 41.8781, lng: -87.6298 },
        'seattle, wa': { lat: 47.6062, lng: -122.3321 },
        'austin, tx': { lat: 30.2672, lng: -97.7431 },
        'boston, ma': { lat: 42.3601, lng: -71.0589 },
        'denver, co': { lat: 39.7392, lng: -104.9903 },
        'miami, fl': { lat: 25.7617, lng: -80.1918 },
        'atlanta, ga': { lat: 33.7490, lng: -84.3880 },
    };
    const normalizedLocation = location.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoords)) {
        if (normalizedLocation.includes(city.split(',')[0])) {
            return coords;
        }
    }
    return null;
}
// Search jobs by location
router.get('/jobs-by-location', async (req, res) => {
    try {
        const { lat, lng, radius = 50, remote, page = 1, limit = 20 } = req.query;
        let sql = `
      SELECT j.*, s.name as startup_name, s.logo_url as startup_logo, 
             s.stage as startup_stage, s.location as startup_location,
             s.verified as startup_verified, s.slug as startup_slug,
             s.lat, s.lng
      FROM jobs j
      JOIN startups s ON j.startup_id = s.id
      WHERE j.status = 'active'
    `;
        const params = [];
        if (remote === 'true') {
            sql += ` AND j.remote_allowed = true`;
        }
        if (lat && lng) {
            // Add distance calculation
            sql = `
        SELECT j.*, s.name as startup_name, s.logo_url as startup_logo, 
               s.stage as startup_stage, s.location as startup_location,
               s.verified as startup_verified, s.slug as startup_slug,
               s.lat, s.lng,
               (3959 * acos(cos(radians($1)) * cos(radians(s.lat)) * 
                cos(radians(s.lng) - radians($2)) + sin(radians($1)) * sin(radians(s.lat)))) AS distance
        FROM jobs j
        JOIN startups s ON j.startup_id = s.id
        WHERE j.status = 'active'
        AND s.lat IS NOT NULL AND s.lng IS NOT NULL
      `;
            params.push(lat, lng);
            sql += ` AND (3959 * acos(cos(radians($1)) * cos(radians(s.lat)) * 
                cos(radians(s.lng) - radians($2)) + sin(radians($1)) * sin(radians(s.lat)))) <= $3`;
            params.push(radius);
        }
        sql += ` ORDER BY j.featured DESC, j.created_at DESC`;
        sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, (parseInt(page) - 1) * parseInt(limit));
        const result = await (0, db_1.query)(sql, params);
        res.json({
            jobs: result.rows,
            total: result.rows.length,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    }
    catch (error) {
        console.error('Jobs by location error:', error);
        res.status(500).json({ error: 'Failed to fetch jobs by location' });
    }
});
// Get companies with locations for map
router.get('/companies-map', async (req, res) => {
    try {
        const { bounds, filters } = req.query;
        let sql = `
      SELECT s.id, s.name, s.slug, s.logo_url, s.location, s.stage, s.verified,
             s.lat, s.lng, s.description,
             COUNT(j.id) as job_count
      FROM startups s
      LEFT JOIN jobs j ON s.id = j.startup_id AND j.status = 'active'
      WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
    `;
        const params = [];
        if (bounds) {
            const boundsObj = JSON.parse(bounds);
            sql += ` AND s.lat BETWEEN $1 AND $2 AND s.lng BETWEEN $3 AND $4`;
            params.push(boundsObj.south, boundsObj.north, boundsObj.west, boundsObj.east);
        }
        if (filters) {
            const filtersObj = JSON.parse(filters);
            if (filtersObj.stages?.length) {
                sql += ` AND s.stage = ANY($${params.length + 1})`;
                params.push(filtersObj.stages);
            }
            if (filtersObj.verifiedOnly) {
                sql += ` AND s.verified = true`;
            }
        }
        sql += ` GROUP BY s.id HAVING COUNT(j.id) > 0`;
        const result = await (0, db_1.query)(sql, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Companies map error:', error);
        res.status(500).json({ error: 'Failed to fetch companies for map' });
    }
});
// Update company coordinates (admin or company owner)
router.put('/company-coordinates/:startupId', async (req, res) => {
    try {
        const { lat, lng, address } = req.body;
        const { startupId } = req.params;
        // In production, verify user owns the company or is admin
        await (0, db_1.query)('UPDATE startups SET lat = $1, lng = $2, location = COALESCE($3, location) WHERE id = $4', [lat, lng, address, startupId]);
        res.json({ message: 'Coordinates updated successfully' });
    }
    catch (error) {
        console.error('Update coordinates error:', error);
        res.status(500).json({ error: 'Failed to update coordinates' });
    }
});
// Geocode and update all companies (admin only)
router.post('/geocode-all', async (req, res) => {
    try {
        const companies = await (0, db_1.query)('SELECT id, location FROM startups WHERE lat IS NULL OR lng IS NULL');
        const results = [];
        for (const company of companies.rows) {
            const coords = await geocodeLocation(company.location);
            if (coords) {
                await (0, db_1.query)('UPDATE startups SET lat = $1, lng = $2 WHERE id = $3', [coords.lat, coords.lng, company.id]);
                results.push({ id: company.id, location: company.location, coords });
            }
        }
        res.json({
            message: `Geocoded ${results.length} companies`,
            results
        });
    }
    catch (error) {
        console.error('Geocode all error:', error);
        res.status(500).json({ error: 'Failed to geocode companies' });
    }
});
// Get popular locations
router.get('/popular-locations', async (req, res) => {
    try {
        const result = await (0, db_1.query)(`
      SELECT location, COUNT(*) as job_count,
             AVG(CASE WHEN s.lat IS NOT NULL THEN s.lat END) as lat,
             AVG(CASE WHEN s.lng IS NOT NULL THEN s.lng END) as lng
      FROM startups s
      JOIN jobs j ON s.id = j.startup_id
      WHERE j.status = 'active'
      GROUP BY location
      ORDER BY job_count DESC
      LIMIT 20
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Popular locations error:', error);
        res.status(500).json({ error: 'Failed to fetch popular locations' });
    }
});
exports.default = router;
//# sourceMappingURL=location.js.map