import express from 'express';
import rateLimit from 'express-rate-limit';
import db from '../config/db.js';
import { requireAuth, requireUserType } from '../utils/auth-middleware.js';

const router = express.Router();

const vendorRouteRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: express.Request, res: express.Response) => {
        res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }
});

const EARNINGS_RATE = 0.90;

/* GET VENDOR SALES
 * Returns ticket_items sold by the authenticated vendor, with optional filters.
 * Also returns today's daily sales total and daily earnings (90% of total).
 * The vendor_id is taken exclusively from the authenticated session — never from
 * the request — so a vendor can only ever see their own sales data.
 */
router.get('/sales', requireAuth, requireUserType('vendor', 'vendor-employee', 'vendor-admin'), vendorRouteRateLimit, async (req: any, res: any) => {
    const vendorId = req.session?.user?.vendorId;

    if (!vendorId) {
        return res.status(403).json({ error: 'No vendor ID associated with your account' });
    }

    const itemSearch = req.query.itemSearch?.toString().trim();
    const startDate  = req.query.startDate?.toString().trim();
    const endDate    = req.query.endDate?.toString().trim();
    const priceMin   = req.query.priceMin?.toString().trim();
    const priceMax   = req.query.priceMax?.toString().trim();
    const inventoryId = req.query.inventoryId?.toString().trim();

    const conditions: string[] = [
        `ti.vendor_id = $1`,
        `t.ticket_status IN ('closed', 'partially_refunded', 'refunded')`,
        `COALESCE(ti.refunded, false) = false`
    ];
    const values: (string | number)[] = [vendorId];

    if (itemSearch) {
        values.push(`%${itemSearch}%`);
        conditions.push(`ti.item_name ILIKE $${values.length}`);
    }

    if (startDate) {
        values.push(startDate);
        conditions.push(`t.created_at >= $${values.length}`);
    }

    if (endDate) {
        values.push(endDate);
        conditions.push(`t.created_at <= $${values.length}`);
    }

    if (priceMin) {
        const min = parseFloat(priceMin);
        if (!Number.isFinite(min)) {
            return res.status(400).json({ error: 'Invalid priceMin value' });
        }
        values.push(min);
        conditions.push(`ti.final_price >= $${values.length}`);
    }

    if (priceMax) {
        const max = parseFloat(priceMax);
        if (!Number.isFinite(max)) {
            return res.status(400).json({ error: 'Invalid priceMax value' });
        }
        values.push(max);
        conditions.push(`ti.final_price <= $${values.length}`);
    }

    if (inventoryId) {
        values.push(`%${inventoryId}%`);
        conditions.push(`ti.inventory_code ILIKE $${values.length}`);
    }

    try {
        const itemsResult = await db.query(
            `SELECT
                ti.ticket_item_id,
                ti.ticket_id,
                ti.inventory_code       AS vendor_inventory_id,
                ti.item_name            AS name,
                ti.base_price::float    AS vendor_price,
                ti.discount_amount::float AS discount_amount,
                ti.final_price::float   AS final_price,
                ti.quantity,
                t.created_at
             FROM ticket_items ti
             JOIN tickets t ON t.ticket_id = ti.ticket_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY t.created_at DESC`,
            values
        );

        const now = new Date();
        const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
        const endOfDay   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();

        const dailyResult = await db.query(
            `SELECT COALESCE(SUM(ti.final_price), 0)::float AS daily_total
             FROM ticket_items ti
             JOIN tickets t ON t.ticket_id = ti.ticket_id
             WHERE ti.vendor_id = $1
               AND t.ticket_status IN ('closed', 'partially_refunded', 'refunded')
               AND COALESCE(ti.refunded, false) = false
               AND t.created_at >= $2
               AND t.created_at <= $3`,
            [vendorId, startOfDay, endOfDay]
        );

        const dailySalesTotal = dailyResult.rows[0].daily_total as number;
        const dailyEarnings   = parseFloat((dailySalesTotal * EARNINGS_RATE).toFixed(2));

        res.status(200).json({
            items: itemsResult.rows,
            dailySalesTotal,
            dailyEarnings
        });
    } catch (error) {
        console.error('Error fetching vendor sales data:', error);
        res.status(500).json({ error: 'Failed to fetch sales data' });
    }
});

export default router;
