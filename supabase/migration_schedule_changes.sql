-- Migration: Schedule changes for last-minute presentation moves
-- Date: 2026-03-23
-- Run this in the Supabase SQL Editor to update the live database

-- A0041: D2/Sala .SEGY/14h30 → D1/Sala .DAT/14h30 (replaces cancelled A0006)
UPDATE events SET day = 1, room = 'Sala .DAT', time_slot = '14h30-14h55'
WHERE id = 'A0041';

-- A0014: D2/Sala .DAT/14h30 → D1/Sala .LAS/15h20
UPDATE events SET day = 1, room = 'Sala .LAS', time_slot = '15h20-15h45'
WHERE id = 'A0014';

-- A0040: D1/Sala .LAS/15h20 → D2/Sala .DAT/14h30 (fills A0014's old slot)
UPDATE events SET day = 2, room = 'Sala .DAT', time_slot = '14h30-14h55'
WHERE id = 'A0040';

-- A0034: D2/Sala .SEGY/15h45 → D1/Sala .SEGY/15h20 (replaces A0031)
UPDATE events SET day = 1, room = 'Sala .SEGY', time_slot = '15h20-15h45'
WHERE id = 'A0034';

-- A0031: D1/Sala .SEGY/15h20 → D2/Sala .SEGY/15h45 (fills A0034's old slot)
UPDATE events SET day = 2, room = 'Sala .SEGY', time_slot = '15h45-16h10'
WHERE id = 'A0031';

-- A0039: D3/Sala .LAS/14h55 → D2/Sala .SEGY/14h30 (fills A0041's old slot)
UPDATE events SET day = 2, room = 'Sala .SEGY', time_slot = '14h30-14h55'
WHERE id = 'A0039';

-- A0006 and A0022 remain in DB (for FK integrity) but are handled as cancelled in app code
-- No DB changes needed for them — the app blocks checkins and ignores existing ones

-- Delete any existing checkins on cancelled events
DELETE FROM checkins WHERE event_id IN ('A0006', 'A0022');
