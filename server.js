const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static('public'));

// Game state
const SHIP_CLASSES = [
    { tier: 1, name: "Patrol Boat", speed: 240, armor: 20, firepower: 15, health: 100, color: "#4CAF50", size: 20, xpRequired: 100 },
    { tier: 1, name: "Patrol Boat", speed: 300, armor: 15, firepower: 12, health: 80, color: "#8BC34A", size: 18, xpRequired: 100 },
    { tier: 2, name: "Mine Warfare", speed: 150, armor: 30, firepower: 10, health: 150, color: "#795548", size: 25, xpRequired: 200 },
    { tier: 2, name: "Mine Warfare", speed: 180, armor: 25, firepower: 8, health: 130, color: "#8D6E63", size: 24, xpRequired: 200 },
    { tier: 3, name: "Submarine", speed: 210, armor: 35, firepower: 25, health: 200, color: "#37474F", size: 28, xpRequired: 350 },
    { tier: 3, name: "Submarine", speed: 180, armor: 30, firepower: 20, health: 180, color: "#455A64", size: 26, xpRequired: 350 },
    { tier: 4, name: "Torpedo Boat", speed: 270, armor: 25, firepower: 35, health: 180, color: "#00BCD4", size: 24, xpRequired: 500 },
    { tier: 5, name: "Destroyer", speed: 210, armor: 40, firepower: 45, health: 300, color: "#2196F3", size: 32, xpRequired: 750 },
    { tier: 5, name: "Destroyer", speed: 240, armor: 35, firepower: 40, health: 280, color: "#03A9F4", size: 30, xpRequired: 750 },
    { tier: 6, name: "Frigate", speed: 210, armor: 45, firepower: 40, health: 350, color: "#3F51B5", size: 34, xpRequired: 1000 },
    { tier: 7, name: "Corvette", speed: 240, armor: 38, firepower: 48, health: 320, color: "#673AB7", size: 30, xpRequired: 1300 },
    { tier: 8, name: "Cruiser", speed: 180, armor: 60, firepower: 60, health: 500, color: "#9C27B0", size: 40, xpRequired: 1700 },
    { tier: 9, name: "Battleship", speed: 120, armor: 80, firepower: 85, health: 800, color: "#E91E63", size: 50, xpRequired: 2200 },
    { tier: 10, name: "Aircraft Carrier", speed: 150, armor: 70, firepower: 50, health: 1000, color: "#F44336", size: 60, xpRequired: 2800 },
    { tier: 11, name: "Amphibious Assault", speed: 150, armor: 65, firepower: 55, health: 900, color: "#FF5722", size: 55, xpRequired: 3500 },
    { tier: 12, name: "Support Vessel", speed: 120, armor: 50, firepower: 20, health: 700, color: "#FF9800", size: 45, xpRequired: 4000 },
    { tier: 13, name: "Dreadnought", speed: 90, armor: 100, firepower: 100, health: 1200, color: "#FFC107", size: 65, xpRequired: 5000 },
    { tier: 14, name: "Experimental", speed: 210, armor: 75, firepower: 120, health: 1000, color: "#00FFFF", size: 48, xpRequired: 7000 },
    { tier: 15, name: "Command Ship", speed: 150, armor: 90, firepower: 80, health: 1500, color: "#FFD700", size: 70, xpRequired: 10000 }
];

// Ensure only one ship class per tier exists.
// If multiple entries share the same tier, keep the LAST occurrence and remove earlier ones.
(function dedupeShipClasses() {
    const seen = new Set();
    const deduped = [];
    for (let i = SHIP_CLASSES.length - 1; i >= 0; i--) {
        const s = SHIP_CLASSES[i];
        if (!seen.has(s.tier)) {
            deduped.push(s);
            seen.add(s.tier);
        } else {
            // Log removal to help debugging during development
            console.log(`ship_classes: removed duplicate tier ${s.tier}`);
        }
    }
    deduped.reverse();
    SHIP_CLASSES.length = 0;
    SHIP_CLASSES.push(...deduped);
})();

const BOT_NAMES = [
    "PixelPouncer", "TurboNoodle", "ShadowSprinter", "CosmicCrab", "NeonNacho",
    "FrostByteBandit", "LavaLlama", "QuantumQuokka", "SneakySpoon", "AstroMunch",
    "GlitchGoblin", "ThunderMuffin", "RoboRaccoon", "MysticMarshmallow", "TurboTadpole",
    "ByteBard", "ChaosChurro", "PhantomPickle", "NovaNibbler",

    // +100 new names
    "CircuitSquirrel", "NebulaNugget", "WobbleWombat", "StaticSalsa",
    "MegaMarmot", "PixelPancake", "RiftRaptor", "TurboTurnip",
    "QuantumYeti", "SizzleSasquatch", "GigaGopher", "AstroAnchovy",
    "ChaosCactus", "FuzzyFalcon", "NoodleNarwhal", "VortexVulture",
    "BinaryBiscuit", "CosmicCorgi", "SneakySardine", "RoboRadish",
    "MysticMango", "ThunderTurnip", "GlitchGiraffe", "NovaNoodle",
    "TurboTofu", "PixelPiranha", "LunarLobster", "StaticStingray",
    "CosmoCabbage", "RiftRabbit", "MegaMuffin", "NebulaNectar",
    "FrostFerret", "QuantumQuail", "AstroAvocado", "ChaosCranberry",
    "PhantomPudding", "GigaGummy", "TurboTurtle", "PixelPopsicle",
    "ShadowSundae", "CosmicCantaloupe", "NeonNectarine", "FrostFritter",
    "LavaLatte", "QuantumQuiver", "SneakyScone", "AstroAlpaca",
    "GlitchGnocchi", "ThunderTangerine", "RoboRutabaga", "MysticMoth",
    "TurboTaffy", "ByteBuffalo", "ChaosCoconut", "PhantomPuffin",
    "NovaNoodlefish", "CircuitCoyote", "NebulaNoodle", "WobbleWalrus",
    "StaticSparrow", "MegaMango", "PixelPuffball", "RiftRaccoon",
    "QuantumQuokkaPrime", "SizzleSalamander", "GigaGummybear", "AstroAntelope",
    "ChaosChowder", "FuzzyFennec", "NoodleNighthawk", "VortexVole",
    "BinaryBurrito", "CosmicCucumber", "SneakySushi", "RoboRaven",
    "MysticMarmot", "ThunderTaco", "GlitchGuppy", "NovaNacho",
    "TurboTarantula", "PixelPenguin", "LunarLynx", "StaticSquid",
    "CosmoCoyote", "RiftRutabaga", "MegaMongoose", "NebulaNoodlefish",
    "FrostFalafel", "QuantumQuasar", "AstroArtichoke", "ChaosCheeto",
    "PhantomPancake", "GigaGorilla", "TurboTornado", "PixelPlatypus", "ShadowShark", "CosmicCicada", "NeonNewt", "FrostFennecFox",
    "LavaLynx", "QuantumQuoll", "SneakySalmon", "AstroAardvark",
    "GlitchGibbon", "ThunderTrout", "RoboRaccoonDog", "MysticManatee",
    "TurboTriceratops", "ByteBeetle", "ChaosChameleon", "PhantomPika",
    "NovaNumbat", "CircuitCrab", "NebulaNighthawk", "WobbleWeasel",
    "StaticStarfish", "MegaMeerkat", "PixelPuffin", "RiftRhinoceros", "QuantumQuetzal", "SizzleSkunk", "GigaGecko", "AstroAxolotl", "ChaosCicada",
    "FantasticFig", "MysticMantis", "TurboTapir", "PixelPlover"
];


let botNameIndex = 0;

const gameState = {
    players: new Map(),
    aiShips: new Map(),
    projectiles: [],
    effects: [],
    mines: [],
    walls: [],
    nextAIId: 0,
    nextProjectileId: 0,
    nextMineId: 0,
    nextEffectId: 0
};

// Fleets management (code -> { code, leaderId, members: Map(playerId -> meta) })
gameState.fleets = new Map();

// Storm mechanic configuration
// At the start of a round the storm's safe circle radius begins at the map edge (WORLD_SIZE)
// and slowly shrinks inward. Ships outside the safe radius take `damagePerSecond` damage.
// This server-side authoritative object is updated each tick.
gameState.storm = null;
// track when the round started (used to avoid early win detection)
gameState.roundStartTime = Date.now();

// Map playerId -> WebSocket connection for direct notifications
const connByPlayerId = new Map();

// Helpers
function generateFleetCode() {
    // 6-digit numeric code
    for (let i = 0; i < 6; i++) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        if (!gameState.fleets.has(code)) return code;
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getEntityById(id) {
    if (!id) return null;
    if (gameState.players.has(id)) return gameState.players.get(id);
    if (gameState.aiShips.has(id)) return gameState.aiShips.get(id);
    return null;
}

function getFleetCodeForId(id) {
    const p = getEntityById(id);
    return p && p.fleetCode ? p.fleetCode : null;
}

function isFriendly(attackerId, target) {
    if (!attackerId || !target) return false;
    const aCode = getFleetCodeForId(attackerId);
    const tCode = target && target.fleetCode ? target.fleetCode : null;
    return aCode && tCode && aCode === tCode;
} 

// Remove all mines owned by `ownerId` from the world
function removeMinesForOwner(ownerId) {
    if (!ownerId) return;
    const removedMinePositions = [];
    gameState.mines = gameState.mines.filter(m => {
        if (m.ownerId === ownerId) {
            removedMinePositions.push({ x: m.x, y: m.y });
            return false;
        }
        return true;
    });

    // spawn small visual fragments where mines were removed (non-explosive)
    for (const pos of removedMinePositions) {
        gameState.effects.push({ id: `effect_${gameState.nextEffectId++}`, type: 'explosion_fragment', x: pos.x, y: pos.y, vx: (Math.random()-0.5)*40, vy: (Math.random()-0.5)*40, lifetime: 0.4 });
    }
}


// Broadcast throttling to help with lag -- send updates every N ticks
let __tickCounter = 0;
const BROADCAST_EVERY = 2; // send state every 2 server ticks (~15 updates/sec)


// Performance caps to avoid runaway entity growth
const MAX_EFFECTS = 500;
const MAX_PROJECTILES = 400;
const MAX_MINES = 500;

// Bot mine-dodging configuration:
// MINE_DODGE_CHANCE: probability (0-1) that a bot will attempt to dodge a nearby active mine
// MINE_DODGE_DETECTION_RADIUS: how far (units) bots can 'see' mines to start dodge behavior
const MINE_DODGE_CHANCE = 0.8;
const MINE_DODGE_DETECTION_RADIUS = 500; 

// World size (world extends from -WORLD_SIZE to WORLD_SIZE). Increase by 5x for larger maps.
const WORLD_SIZE = 3000 * 5; // was 3000 (now 15000)



// Generate unique ID
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create AI ship
function createAIShip(x, y, tier = 1) {
    // Default AI ships always start as tier 1 (Patrol Boat)
    const possibleShips = SHIP_CLASSES.filter(s => s.tier === tier);
    const shipData = possibleShips[Math.floor(Math.random() * possibleShips.length)];
    
    const id = `ai_${gameState.nextAIId++}`;
    const botName = BOT_NAMES[botNameIndex % BOT_NAMES.length];
    botNameIndex++;
    
    const ship = {
        id,
        x,
        y,
        angle: Math.random() * Math.PI * 2,
        velocityX: 0,
        velocityY: 0,
        data: shipData,
        health: shipData.health,
        maxHealth: shipData.health,
        xp: 0,
        kills: 0,
        score: 0,
        fireTimer: 0,
        isAI: true,
        gameName: botName,
        mineTimer: Math.random() * 6,
        avoidMineTimer: 0,
        targetAngle: Math.random() * Math.PI * 2,
        behaviorTimer: 0,
        targetId: null
    }; 
    
    gameState.aiShips.set(id, ship);
    return ship;
}

// Helper: check if two axis-aligned rectangles (centered at x,y) overlap given padding
function rectsOverlap(a, b, pad = 0) {
    const ax1 = a.x - a.width / 2 - pad;
    const ax2 = a.x + a.width / 2 + pad;
    const ay1 = a.y - a.height / 2 - pad;
    const ay2 = a.y + a.height / 2 + pad;

    const bx1 = b.x - b.width / 2;
    const bx2 = b.x + b.width / 2;
    const by1 = b.y - b.height / 2;
    const by2 = b.y + b.height / 2;

    return !(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2);
}

// Resolve an entity (player or AI ship) against walls: authoritative push-out and velocity correction
function resolveWallCollisionForEntity(entity) {
    if (!entity || !entity.data) return;
    const radius = (entity.data && entity.data.size) ? entity.data.size : 20;
    try {
        for (const w of gameState.walls) {
            const res = circleRectCollision(entity.x, entity.y, radius, w);
            if (res.collides) {
                let dx = entity.x - res.nearestX;
                let dy = entity.y - res.nearestY;
                let dist = Math.hypot(dx, dy);
                if (dist === 0) {
                    // fallback: push out along smallest axis
                    const left = w.x - w.width / 2;
                    const right = w.x + w.width / 2;
                    const top = w.y - w.height / 2;
                    const bottom = w.y + w.height / 2;
                    const pushLeft = Math.abs(entity.x - left);
                    const pushRight = Math.abs(entity.x - right);
                    const pushTop = Math.abs(entity.y - top);
                    const pushBottom = Math.abs(entity.y - bottom);
                    const minPush = Math.min(pushLeft, pushRight, pushTop, pushBottom);
                    if (minPush === pushLeft) { dx = 1; dy = 0; dist = 1; }
                    else if (minPush === pushRight) { dx = -1; dy = 0; dist = 1; }
                    else if (minPush === pushTop) { dx = 0; dy = 1; dist = 1; }
                    else { dx = 0; dy = -1; dist = 1; }
                }

                const overlap = radius - dist;
                entity.x += (dx / dist) * overlap;
                entity.y += (dy / dist) * overlap;

                // Remove velocity component pushing into wall if entity has velocity
                if (typeof entity.velocityX === 'number' && typeof entity.velocityY === 'number') {
                    const nx = dx / (dist || 1);
                    const ny = dy / (dist || 1);
                    const vn = entity.velocityX * nx + entity.velocityY * ny;
                    entity.velocityX -= vn * nx;
                    entity.velocityY -= vn * ny;

                    // damping to avoid jitter
                    entity.velocityX *= 0.8;
                    entity.velocityY *= 0.8;

                    // Compute local normal and tangent (nx,ny already defined above)
                    const tx1 = -ny, ty1 = nx;
                    const tx2 = ny, ty2 = -nx;

                    // Choose tangent more aligned with current motion to slide around the wall
                    const vx = (typeof entity.velocityX === 'number') ? entity.velocityX : Math.cos(entity.angle || 0);
                    const vy = (typeof entity.velocityY === 'number') ? entity.velocityY : Math.sin(entity.angle || 0);
                    const dot1 = vx * tx1 + vy * ty1;
                    const dot2 = vx * tx2 + vy * ty2;
                    let chosenTx = dot1 >= dot2 ? tx1 : tx2;
                    let chosenTy = dot1 >= dot2 ? ty1 : ty2;

                    if (entity.isAI) {
                        // Set AI targetAngle to follow the tangent around the obstacle
                        let angle = Math.atan2(chosenTy, chosenTx);
                        // small random jitter so bots don't always behave identically
                        angle += (Math.random() - 0.5) * 0.6;
                        entity.targetAngle = angle;

                        // Also nudge velocity slightly along the tangent so they move away smoothly
                        if (typeof entity.velocityX === 'number' && typeof entity.velocityY === 'number') {
                            entity.velocityX += chosenTx * (Math.hypot(vx, vy) * 0.2 + 10);
                            entity.velocityY += chosenTy * (Math.hypot(vx, vy) * 0.2 + 10);
                        }
                    } else {
                        // For players, slide them along the tangent a bit so they feel like they're moving around
                        entity.x += chosenTx * (overlap * 0.22);
                        entity.y += chosenTy * (overlap * 0.22);
                    }
                }
            }
        }
    } catch (e) { /* ignore */ }
}

// --- Collision helpers (used for authoritative wall collisions and projectile bounces) ---
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// circle-rect collision: circle at (cx,cy) radius r, rect centered at rect.x,rect.y with width,height
function circleRectCollision(cx, cy, r, rect) {
    const left = rect.x - rect.width / 2;
    const right = rect.x + rect.width / 2;
    const top = rect.y - rect.height / 2;
    const bottom = rect.y + rect.height / 2;
    const nearestX = clamp(cx, left, right);
    const nearestY = clamp(cy, top, bottom);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    const dist2 = dx * dx + dy * dy;
    return { collides: dist2 <= r * r, dx, dy, nearestX, nearestY };
}

function reflectVector(vx, vy, nx, ny) {
    // n should be normalized
    const dot = vx * nx + vy * ny;
    const rx = vx - 2 * dot * nx;
    const ry = vy - 2 * dot * ny;
    return { x: rx, y: ry };
}

// Initialize a small set of non-overlapping bright yellow walls
function initializeWalls() {
    gameState.walls = [];

    // Decide how many walls — increase density for more obstacles (10 to 24 walls)
    const numWalls = 10 + Math.floor(Math.random() * 15);

    // Smaller padding and varied sizes when more walls are present
    const padding = 40; // minimal space between walls so they don't touch
    const minSize = 80;
    const maxSize = 600;

    let attempts = 0;
    for (let i = 0; i < numWalls && attempts < numWalls * 200; i++) {
        attempts++;
        const w = minSize + Math.floor(Math.random() * (maxSize - minSize));
        const h = minSize + Math.floor(Math.random() * (maxSize - minSize));

        // pick a random center position somewhere across the world (but avoid very near center)
        const angle = Math.random() * Math.PI * 2;
        const radius = (0.15 + Math.random() * 0.7) * WORLD_SIZE; // avoid very center and very edge
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const wall = { id: `wall_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, x, y, width: w, height: h };

        // ensure it fits within world bounds
        const halfW = w / 2;
        const halfH = h / 2;
        if (x - halfW < -WORLD_SIZE || x + halfW > WORLD_SIZE || y - halfH < -WORLD_SIZE || y + halfH > WORLD_SIZE) {
            // try again
            i--; if (attempts > 1000) break; else continue;
        }

        // ensure it does not overlap any existing wall (with padding)
        let ok = true;
        for (const other of gameState.walls) {
            if (rectsOverlap(wall, other, padding)) { ok = false; break; }
        }

        if (ok) {
            gameState.walls.push(wall);
            attempts = 0; // reset attempts for next wall
        } else {
            // try another position for same wall
            i--; if (attempts > 1000) break;
        }
    }
}



// Spawn initial AI ships
function initializeAIShips() {
    // Start with 40 AI ships placed uniformly at random across the world
    const initialCount = 40;
    const worldSize = WORLD_SIZE; // matches game world bounds
    for (let i = 0; i < initialCount; i++) {
        // Uniformly pick an (x,y) inside [-worldSize, worldSize]
        const x = (Math.random() * 2 - 1) * worldSize;
        const y = (Math.random() * 2 - 1) * worldSize;
        // Spawn all initial AI as tier 1 Patrol Boats
        createAIShip(x, y, 1);
    }

    // Create walls for the round
    initializeWalls();

    // Initialize storm and round timer
    gameState.roundStartTime = Date.now();
    gameState.storm = {
        x: 0, // centered at map (0,0)
        y: 0,
        safeRadius: WORLD_SIZE, // safe area starts at map edge
        damagePerSecond: 10, // damage to ships that are outside the safe radius
        // Increased speed: make the storm shrink 6× faster
        shrinkRate: 48, // base units per second the safe radius shrinks inward (was 8)
        baseShrinkRate: 48, // keep a base value for dynamic scaling (was 8)
        shrinkMultiplier: 1, // smoothed multiplier applied to shrink rate
        maxShrinkMultiplier: 2.0, // maximum multiplier when activity is low
        shrinkAdjustWindowSec: 5, // how many seconds of recent damage to consider
        lowDamageThreshold: 5, // total damage over window below which we speed up fully
        highDamageThreshold: 20, // above this we don't speed up
        active: true
    };
    // initialize damage events buffer (stores {ts, amount}) for recent activity checks
    gameState.recentDamageEvents = [];
    console.log(`Storm initialized with safeRadius=${gameState.storm.safeRadius}, damagePerSecond=${gameState.storm.damagePerSecond}, shrinkRate=${gameState.storm.shrinkRate}`);

}

// Update AI behavior
function updateAI(ship, dt) {
    ship.behaviorTimer -= dt;

    // Bots with health > 40 become 'aggressive' — they retarget faster, search farther,
    // prefer player targets and are more likely to fire / deploy mines.
    const aggressive = ship.health > 40;

    if (ship.behaviorTimer <= 0) {
        // reduce how often even aggressive bots retarget to avoid runaway firing
        ship.behaviorTimer = aggressive ? 1.2 + Math.random() * 2 : 2 + Math.random() * 3;

        // Find closest target (consider both players and other AI so bots fight each other too)
        let closestDist = Infinity;
        ship.targetId = null;
        // shrink the aggressive detection radius slightly to avoid pulling in too many targets
        const detectionRadius = aggressive ? 700 : 500;

        // Consider human players
        gameState.players.forEach(player => {
            if (!player.inPlay) return;
            const dist = Math.hypot(player.x - ship.x, player.y - ship.y);
            if (dist < closestDist && dist < detectionRadius) {
                closestDist = dist;
                ship.targetId = player.id;
            }
        });

        // Also consider other AI ships (skip self) so bots will fight each other
        gameState.aiShips.forEach(otherShip => {
            if (otherShip.id === ship.id) return;
            const dist = Math.hypot(otherShip.x - ship.x, otherShip.y - ship.y);
            if (dist < closestDist && dist < detectionRadius) {
                closestDist = dist;
                ship.targetId = otherShip.id;
            }
        });

        // If still no target and aggressive, seek the nearest entity (player or AI) even if outside detectionRadius
        if (!ship.targetId && aggressive) {
            let nearestDist = Infinity;
            let nearest = null;
            gameState.players.forEach(player => {
                if (!player.inPlay) return;
                const dist = Math.hypot(player.x - ship.x, player.y - ship.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = player;
                }
            });
            gameState.aiShips.forEach(otherShip => {
                if (otherShip.id === ship.id) return;
                const dist = Math.hypot(otherShip.x - ship.x, otherShip.y - ship.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = otherShip;
                }
            });
            if (nearest) {
                ship.targetId = nearest.id;
            } else {
                ship.targetAngle = Math.random() * Math.PI * 2;
            }
        } else if (!ship.targetId) {
            ship.targetAngle = Math.random() * Math.PI * 2;
        }
    }

    // Find target
    let target = gameState.players.get(ship.targetId) || gameState.aiShips.get(ship.targetId);

    if (target) {
        const dx = target.x - ship.x;
        const dy = target.y - ship.y;
        ship.targetAngle = Math.atan2(dy, dx);

        const dist = Math.hypot(dx, dy);
        // soften aggressive firing to avoid large projectile bursts
        const fireRange = aggressive ? 450 : 300;

        // Aggressive bots will fire at slightly longer ranges, but with a safer minimum cooldown
        if (dist < fireRange && ship.fireTimer <= 0) {
            fireProjectile(ship);
            if (aggressive) ship.fireTimer = Math.max(0.25, (1 - (ship.data.tier * 0.05)) * 0.5);
        }

        // AI may deploy mines as a tactical option when close to a target
        const mineChance = aggressive ? 0.35 : 0.25;
        const mineRange = aggressive ? 300 : 250;
        if (ship.mineTimer <= 0 && dist < mineRange && Math.random() < mineChance) {
            deployMine(ship);
            ship.mineTimer = 6 + Math.random() * 8; // cooldown between 6-14s
        }
    }

    // Ensure mineTimer counts down even if no target
    ship.mineTimer = Math.max(0, ship.mineTimer - dt);
    // Ensure avoid timer counts down too
    ship.avoidMineTimer = Math.max(0, ship.avoidMineTimer - dt);


    // Mine avoidance: pick a tangential path around the nearest active mine and hold it briefly
    if (ship.avoidMineTimer <= 0) {
        let nearestMine = null;
        let nearestMineDist = Infinity;
        for (const m of gameState.mines) {
            if (!m.active) continue;
            if (m.ownerId === ship.id) continue;
            const d = Math.hypot(m.x - ship.x, m.y - ship.y);
            if (d < nearestMineDist) { nearestMineDist = d; nearestMine = m; }
        }

        if (nearestMine && nearestMineDist < MINE_DODGE_DETECTION_RADIUS) {
            if (Math.random() < MINE_DODGE_CHANCE) {
                const dx = ship.x - nearestMine.x;
                const dy = ship.y - nearestMine.y;
                const baseAngle = Math.atan2(dy, dx); // away from mine

                // Compute two possible tangent directions (clockwise / counterclockwise)
                const tangentA = baseAngle + Math.PI / 2;
                const tangentB = baseAngle - Math.PI / 2;

                // Choose the tangent that requires the least turning from current heading to keep motion smooth
                const normAngleDiff = (a, b) => {
                    let d = a - b;
                    while (d > Math.PI) d -= Math.PI * 2;
                    while (d < -Math.PI) d += Math.PI * 2;
                    return Math.abs(d);
                };
                const pick = normAngleDiff(tangentA, ship.angle) < normAngleDiff(tangentB, ship.angle) ? tangentA : tangentB;

                // Gently steer around the mine (small jitter) and hold this avoidance for a short time
                ship.targetAngle = pick + (Math.random() - 0.5) * 0.2;
                ship.avoidMineTimer = 0.9 + Math.random() * 0.8; // hold for ~0.9-1.7s

                // Apply a very gentle lateral nudge to encourage a smooth arc (no large speed boosts)
                const lateralNudge = 0.08; // small fraction of speed
                ship.velocityX += Math.cos(pick) * ship.data.speed * lateralNudge;
                ship.velocityY += Math.sin(pick) * ship.data.speed * lateralNudge;
            }
        }
    }

    // Turn towards target angle (slightly faster when aggressive)
    let angleDiff = ship.targetAngle - ship.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    ship.angle += angleDiff * dt * (aggressive ? 2.5 : 2);

    // Move forward (aggressive bots push a bit harder)
    const thrust = ship.data.speed * (aggressive ? 0.6 : 0.5);
    ship.velocityX += Math.cos(ship.angle) * thrust * dt;
    ship.velocityY += Math.sin(ship.angle) * thrust * dt;

    // Update position
    ship.x += ship.velocityX * dt;
    ship.y += ship.velocityY * dt;

    // Apply friction
    ship.velocityX *= 0.98;
    ship.velocityY *= 0.98;

    // Update fire timer
    ship.fireTimer = Math.max(0, ship.fireTimer - dt);

    // Keep in bounds (world bounds)
    const worldSize = WORLD_SIZE;
    ship.x = Math.max(-worldSize, Math.min(worldSize, ship.x));
    ship.y = Math.max(-worldSize, Math.min(worldSize, ship.y));
}

// Deploy a mine (limited to 5 per player)
function deployMine(ship) {
    // Count active mines for this ship
    const playerMines = gameState.mines.filter(m => m.ownerId === ship.id);
    if (playerMines.length >= 5) return; // Max 5 mines per player

    const mine = {
        id: `mine_${gameState.nextMineId++}`,
        x: ship.x + Math.cos(ship.angle) * (ship.data.size + 10),
        y: ship.y + Math.sin(ship.angle) * (ship.data.size + 10),
        ownerId: ship.id,
        lifetime: 20,
        activationDelay: 1.5,
        active: false,
        damage: 350,
        explosionRadius: 300
    };
    gameState.mines.push(mine);
}
function fireProjectile(ship) {
    const spread = ship.data.tier < 5 ? 0.2 : 0.1;
    const numProjectiles = Math.floor(ship.data.firepower / 20) || 1;

    for (let i = 0; i < numProjectiles; i++) {
        const angleOffset = (Math.random() - 0.5) * spread;
        const projectile = {
            id: `proj_${gameState.nextProjectileId++}`,
            x: ship.x + Math.cos(ship.angle) * ship.data.size,
            y: ship.y + Math.sin(ship.angle) * ship.data.size,
            angle: ship.angle + angleOffset,
            speed: 900,
            damage: ship.data.firepower,
            ownerId: ship.id,
            lifetime: 2,
            radius: 6,
            bounces: 0
        };
        gameState.projectiles.push(projectile);
    }

    // Make fire rate 2x as fast by halving the default cooldown
    ship.fireTimer = (1 - (ship.data.tier * 0.05)) * 0.5;
} 

// Handle damage
function takeDamage(ship, damage, attackerId) {
    const actualDamage = Math.max(1, damage - ship.data.armor * 0.3);
    ship.health -= actualDamage;
    
    // Track recent non-storm damage (only count when there was an attacker)
    // This helps the storm accelerate if there is little combat happening.
    try {
        if (attackerId) {
            gameState.recentDamageEvents = gameState.recentDamageEvents || [];
            gameState.recentDamageEvents.push({ ts: Date.now(), amount: actualDamage });
        }
    } catch (e) { /* ignore tracking failures */ }

    // Create damage effect
    const effect = {
        id: `effect_${gameState.nextEffectId++}`,
        type: 'damage',
        x: ship.x,
        y: ship.y,
        value: actualDamage,
        lifetime: 0.5
    };
    gameState.effects.push(effect);


    if (ship.health <= 0) {
        // Create a larger explosion whose size scales with the ship size
        const explosionRadius = Math.max(40, ship.data.size * 3);
        gameState.effects.push({
            id: `effect_${gameState.nextEffectId++}`,
            type: 'explosion',
            x: ship.x,
            y: ship.y,
            radius: explosionRadius,
            lifetime: 1.5
        });

        // Add some smaller debris fragments for visual flair
        const fragmentCount = Math.min(20, Math.floor(ship.data.size / 2));
        for (let i = 0; i < fragmentCount; i++) {
            gameState.effects.push({
                id: `effect_${gameState.nextEffectId++}`,
                type: 'explosion_fragment',
                x: ship.x + (Math.random() - 0.5) * ship.data.size * 2,
                y: ship.y + (Math.random() - 0.5) * ship.data.size * 2,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                lifetime: 1 + Math.random() * 1
            });
        }

        // Remove any mines owned by the dying ship
        try { removeMinesForOwner(ship.id); } catch (e) { /* ignore */ }
        
        // Award kill to attacker and fleet (if any)
        const attacker = gameState.players.get(attackerId) || gameState.aiShips.get(attackerId);
        if (attacker) {
            attacker.kills++;
            attacker.score += ship.data.tier * 50;

            // Increment fleet kills if attacker is in a fleet
            if (attacker.fleetCode) {
                const fleet = gameState.fleets.get(attacker.fleetCode);
                if (fleet) {
                    fleet.kills = (fleet.kills || 0) + 1;
                }
            }
            
            // Level up on each kill
            const nextTier = attacker.data.tier + 1;
            const nextShips = SHIP_CLASSES.filter(s => s.tier === nextTier);
            if (nextShips.length > 0) {
                const nextShip = nextShips[Math.floor(Math.random() * nextShips.length)];
                attacker.data = nextShip;
                attacker.maxHealth = nextShip.health;
                attacker.health = nextShip.health;
                
                gameState.effects.push({
                    id: `effect_${gameState.nextEffectId++}`,
                    type: 'levelup',
                    x: attacker.x,
                    y: attacker.y,
                    lifetime: 2
                });
            }
        }
        
        return true;
    }
    return false;
}

// Game loop
function gameLoop() {
    const dt = 1 / 30; // 30 FPS server tick
    
    // Update AI ships
    gameState.aiShips.forEach(ship => {
        updateAI(ship, dt);
    });

    // Resolve AI collisions against walls (authoritative)
    try {
        gameState.aiShips.forEach(ship => {
            resolveWallCollisionForEntity(ship);
        });
    } catch (e) { /* ignore */ }
    
    // Update player positions from their inputs
    gameState.players.forEach(player => {
        if (player.input) {
            const thrust = player.input.forward ? 1 : player.input.backward ? -0.5 : 0;
            if (thrust !== 0) {
                player.velocityX += Math.cos(player.angle) * player.data.speed * thrust * dt;
                player.velocityY += Math.sin(player.angle) * player.data.speed * thrust * dt;
            }
            
            player.angle = player.input.angle;
            
            if (player.input.firing && player.fireTimer <= 0) {
                fireProjectile(player);
            }
        }
        
            // Update position
        player.x += player.velocityX * dt;
        player.y += player.velocityY * dt;
        
        // Apply friction
        player.velocityX *= 0.98;
        player.velocityY *= 0.98;
        
        // Authoritative wall resolution for players
        resolveWallCollisionForEntity(player);

        // Update fire timer
        player.fireTimer = Math.max(0, player.fireTimer - dt);
        // Update mine deployment cooldown
        player.mineTimer = Math.max(0, (player.mineTimer || 0) - dt);
        
        // Keep in bounds (world bounds)
        const worldSize = WORLD_SIZE;
        player.x = Math.max(-worldSize, Math.min(worldSize, player.x));
        player.y = Math.max(-worldSize, Math.min(worldSize, player.y));
    });
    
    // Update projectiles (apply motion and authoritative wall bouncing)
    {
        const newProjectiles = [];
        for (let proj of gameState.projectiles) {
            let vx = Math.cos(proj.angle) * proj.speed;
            let vy = Math.sin(proj.angle) * proj.speed;

            // Move
            proj.x += vx * dt;
            proj.y += vy * dt;

            // Check collision with walls
            let collided = false;
            const pr = proj.radius || 6;
            for (const w of gameState.walls) {
                const res = circleRectCollision(proj.x, proj.y, pr, w);
                if (res.collides) {
                    collided = true;

                    // compute normal
                    let nx = proj.x - res.nearestX;
                    let ny = proj.y - res.nearestY;
                    let len = Math.hypot(nx, ny);
                    if (len === 0) {
                        // fallback choose side
                        const left = w.x - w.width / 2;
                        const right = w.x + w.width / 2;
                        const top = w.y - w.height / 2;
                        const bottom = w.y + w.height / 2;
                        const dxLeft = Math.abs(proj.x - left);
                        const dxRight = Math.abs(proj.x - right);
                        const dyTop = Math.abs(proj.y - top);
                        const dyBottom = Math.abs(proj.y - bottom);
                        const minD = Math.min(dxLeft, dxRight, dyTop, dyBottom);
                        if (minD === dxLeft) { nx = -1; ny = 0; }
                        else if (minD === dxRight) { nx = 1; ny = 0; }
                        else if (minD === dyTop) { nx = 0; ny = -1; }
                        else { nx = 0; ny = 1; }
                        len = 1;
                    } else {
                        nx /= len; ny /= len;
                    }

                    // reflect velocity
                    const rv = reflectVector(vx, vy, nx, ny);
                    vx = rv.x * 0.86; vy = rv.y * 0.86; // dampen a bit
                    proj.speed = Math.hypot(vx, vy);
                    proj.angle = Math.atan2(vy, vx);
                    proj.bounces = (proj.bounces || 0) + 1;

                    // Push projectile slightly out of wall so it doesn't immediately re-collide
                    proj.x += nx * (pr + 1);
                    proj.y += ny * (pr + 1);

                    // create a small visual shard effect
                    gameState.effects.push({ id: `effect_${gameState.nextEffectId++}`, type: 'explosion_fragment', x: proj.x, y: proj.y, vx: rv.x * 20, vy: rv.y * 20, lifetime: 0.4 });
                    break;
                }
            }

            proj.lifetime -= dt;

            // Destroy if too many bounces or lifetime expired
            if ((proj.bounces && proj.bounces > 3) || proj.lifetime <= 0) continue;

            newProjectiles.push(proj);
        }
        gameState.projectiles = newProjectiles;
    }

    // Cap number of active projectiles to avoid runaway resource use
    if (gameState.projectiles.length > MAX_PROJECTILES) {
        gameState.projectiles.splice(0, gameState.projectiles.length - MAX_PROJECTILES);
    }
    
    // Update effects
    gameState.effects = gameState.effects.filter(effect => {
        // Move effect particle if it has velocity
        if (effect.vx) effect.x += effect.vx * dt;
        if (effect.vy) effect.y += effect.vy * dt;
        effect.lifetime -= dt;
        return effect.lifetime > 0;
    });

    // Cap total effect count to avoid runaway memory / bandwidth during heavy activity
    if (gameState.effects.length > MAX_EFFECTS) {
        gameState.effects.splice(0, gameState.effects.length - MAX_EFFECTS);
    }

    // Update mines (activation delay and lifetime)
    gameState.mines.forEach(mine => {
        mine.activationDelay -= dt;
        if (mine.activationDelay <= 0) mine.active = true;
        mine.lifetime -= dt;
    });
    gameState.mines = gameState.mines.filter(m => m.lifetime > 0);
    
    // Check collisions
    const toRemove = new Set();
    
    gameState.projectiles.forEach(proj => {
        // Check player collisions
        gameState.players.forEach(player => {
            // Skip players not yet in play
            if (!player.inPlay) return;

            // Skip self-hit
            if (proj.ownerId === player.id) return;

            // Friendly check: do not damage same-fleet members
            const attacker = getEntityById(proj.ownerId);
            if (attacker && isFriendly(attacker.id, player)) return;

            const dist = Math.hypot(proj.x - player.x, proj.y - player.y);
            if (dist < player.data.size) {
                if (takeDamage(player, proj.damage, proj.ownerId)) {
                    gameState.players.delete(player.id);
                }
                toRemove.add(proj.id);
            }
        });
        
        // Check AI collisions
        gameState.aiShips.forEach(ship => {
            if (proj.ownerId === ship.id) return;
            const dist = Math.hypot(proj.x - ship.x, proj.y - ship.y);
            if (dist < ship.data.size) {
                if (takeDamage(ship, proj.damage, proj.ownerId)) {
                    gameState.aiShips.delete(ship.id);
                    // NOTE: Do not respawn AI here — AI should die permanently.
                }
                toRemove.add(proj.id);
            }
        });
    });
    
    // Remove hit projectiles
    gameState.projectiles = gameState.projectiles.filter(p => !toRemove.has(p.id));
    
    // Check mine collisions (only active mines)
    const minesToRemove = new Set();
    
    gameState.mines.forEach(mine => {
        if (!mine.active) return; // Skip inactive mines

        // Determine if the mine should detonate (any non-friendly ship stepped on it)
        let detonated = false;
        gameState.players.forEach(player => {
            if (!player.inPlay) return;
            // ignore if owner and player are in same fleet
            if (isFriendly(mine.ownerId, player)) return;
            const d = Math.hypot(mine.x - player.x, mine.y - player.y);
            if (d < player.data.size + 15) detonated = true;
        });
        gameState.aiShips.forEach(ship => {
            const d = Math.hypot(mine.x - ship.x, mine.y - ship.y);
            if (d < ship.data.size + 15) detonated = true;
        });

        if (!detonated) return;

        // Explosion applies falloff damage to all ships within radius
        const explosionRadius = mine.explosionRadius || 250;

        // Apply to players (skip friendly)
        gameState.players.forEach(player => {
            if (!player.inPlay) return;
            if (isFriendly(mine.ownerId, player)) return;
            const d = Math.hypot(mine.x - player.x, mine.y - player.y);
            if (d <= explosionRadius) {
                const damage = Math.max(1, Math.round(mine.damage * (1 - (d / explosionRadius))));
                if (takeDamage(player, damage, mine.ownerId)) {
                    gameState.players.delete(player.id);
                }
            }
        });

        // Apply to AI ships
        gameState.aiShips.forEach(ship => {
            const d = Math.hypot(mine.x - ship.x, mine.y - ship.y);
            if (d <= explosionRadius) {
                const damage = Math.max(1, Math.round(mine.damage * (1 - (d / explosionRadius))));
                if (takeDamage(ship, damage, mine.ownerId)) {
                    gameState.aiShips.delete(ship.id);
                    // NOTE: Do not respawn AI here — AI should die permanently.
                }
            }
        });

        // Explosion visuals and removal
        minesToRemove.add(mine.id);
        gameState.effects.push({
            id: `effect_${gameState.nextEffectId++}`,
            type: 'explosion',
            x: mine.x,
            y: mine.y,
            radius: explosionRadius,
            lifetime: 1.8
        });
    });
    
    // Remove detonated mines
    gameState.mines = gameState.mines.filter(m => !minesToRemove.has(m.id));
    // Cap mines (defensive)
    if (gameState.mines.length > MAX_MINES) {
        gameState.mines.splice(0, gameState.mines.length - MAX_MINES);
    }
    
    // Note: AI are not auto-respawned. Initial AI were spawned at server start
    // and will now permanently die when destroyed. This prevents new AI
    // from being created during runtime so population only decreases over time.
    
    // Storm update: shrink safe radius and damage ships outside it
    if (gameState.storm && gameState.storm.active) {
        const s = gameState.storm;
        // Shrink safe radius with dynamic adjustment based on recent (player/AI) damage
        const now = Date.now();
        const windowMs = (s.shrinkAdjustWindowSec || 5) * 1000;
        gameState.recentDamageEvents = gameState.recentDamageEvents || [];
        // Prune events older than our sliding window
        while (gameState.recentDamageEvents.length && gameState.recentDamageEvents[0].ts < now - windowMs) {
            gameState.recentDamageEvents.shift();
        }
        const damageLastWindow = gameState.recentDamageEvents.reduce((acc, e) => acc + e.amount, 0);

        // Determine target multiplier (1..maxShrinkMultiplier) — more multiplier when damage is low
        const low = s.lowDamageThreshold || 5;
        const high = s.highDamageThreshold || 20;
        const maxMult = s.maxShrinkMultiplier || 2.0;
        let targetMult = 1;
        if (damageLastWindow <= low) {
            targetMult = maxMult;
        } else if (damageLastWindow < high) {
            const t = (damageLastWindow - low) / (high - low); // 0..1
            targetMult = 1 + (1 - t) * (maxMult - 1);
        } else {
            targetMult = 1;
        }
        // Smoothly adjust multiplier to avoid sudden jumps
        s.shrinkMultiplier = (s.shrinkMultiplier || 1) + (targetMult - (s.shrinkMultiplier || 1)) * 0.12;
        const effectiveShrink = (s.baseShrinkRate || s.shrinkRate || 8) * s.shrinkMultiplier;
        s.currentShrinkRate = effectiveShrink;

        // occasional log when accelerating (throttled)
        if (s.shrinkMultiplier > 1.05 && (!s._lastLog || now - s._lastLog > 2000)) {
            console.log(`Storm accelerating: mul=${s.shrinkMultiplier.toFixed(2)}, effectiveShrink=${effectiveShrink.toFixed(2)}, recentDamage=${damageLastWindow.toFixed(1)}`);
            s._lastLog = now;
        }

        s.safeRadius = Math.max(0, s.safeRadius - effectiveShrink * (1/30));

        // damage ships outside safe radius
        const damageThisTick = (s.damagePerSecond || 10) * (1/30);
        gameState.players.forEach(p => {
            if (!p || !p.inPlay) return;
            const d = Math.hypot(p.x - s.x, p.y - s.y);
            if (d > s.safeRadius) {
                if (takeDamage(p, damageThisTick, null)) {
                    gameState.players.delete(p.id);
                }
            }
        });
        gameState.aiShips.forEach(a => {
            const d = Math.hypot(a.x - s.x, a.y - s.y);
            if (d > s.safeRadius) {
                if (takeDamage(a, damageThisTick, null)) {
                    gameState.aiShips.delete(a.id);
                }
            }
        });

        // occasional storm visual particles outside the safe radius
        if (Math.random() < 0.02) {
            const angle = Math.random() * Math.PI * 2;
            const r = s.safeRadius + Math.random() * 300;
            gameState.effects.push({ id: `effect_${gameState.nextEffectId++}`, type: 'storm_gust', x: Math.cos(angle)*r, y: Math.sin(angle)*r, vx: (Math.random()-0.5)*40, vy: (Math.random()-0.5)*40, lifetime: 1.2 });
        }

        // if fully closed, end the round with no winner
        if (s.safeRadius <= 0) {
            endRound();
        }
    }

    // Broadcast game state to all clients (throttled to reduce network load)
    __tickCounter++;
    if (__tickCounter % BROADCAST_EVERY === 0) {
        broadcastGameState();
    }
}

// Broadcast game state
function broadcastGameState() {
    const state = {
        type: 'gameState',
        players: Array.from(gameState.players.values()).map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            angle: p.angle,
            health: p.health,
            maxHealth: p.maxHealth,
            data: p.data,
            xp: p.xp,
            kills: p.kills,
            score: p.score,
            gameName: p.gameName || '',
            mineTimer: p.mineTimer || 0,
            activeMines: gameState.mines.filter(m => m.ownerId === p.id).length,
            fleetCode: p.fleetCode || null,
            inPlay: !!p.inPlay
        })),
        aiShips: Array.from(gameState.aiShips.values()).map(s => ({
            id: s.id,
            x: s.x,
            y: s.y,
            angle: s.angle,
            health: s.health,
            maxHealth: s.maxHealth,
            data: s.data,
            gameName: s.gameName || '',
            xp: s.xp,
            kills: s.kills,
            score: s.score,
            fleetCode: null,
            inPlay: true
        })),
        fleets: Array.from(gameState.fleets.values()).map(f => ({
            code: f.code,
            leaderId: f.leaderId,
            started: !!f.started,
            kills: f.kills || 0,
            members: Array.from(f.members.entries()).map(([id, m]) => ({ id, name: m.name }))
        })), 
        projectiles: (gameState.projectiles.slice(-200)).map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            angle: p.angle,
            ownerId: p.ownerId
        })),
        effects: gameState.effects.map(e => ({
            id: e.id,
            type: e.type,
            x: e.x,
            y: e.y,
            value: e.value,
            radius: e.radius,
            vx: e.vx,
            vy: e.vy,
            lifetime: e.lifetime
        })),
        mines: gameState.mines.map(m => ({
            id: m.id,
            x: m.x,
            y: m.y,
            ownerId: m.ownerId,
            active: m.active,
            lifetime: m.lifetime,
            damage: m.damage
        })),
        // Static walls (non-overlapping yellow obstacles)
        walls: (gameState.walls || []).map(w => ({ id: w.id, x: w.x, y: w.y, width: w.width, height: w.height })),
            // Storm (safe radius shrinking inward)
        storm: gameState.storm
    };
    
    const message = JSON.stringify(state);
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// If there are no human players left, refill AI ships for a new round
// NOTE: Bot refilling is triggered when the first human joins an empty server.

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New client connected');
    
    const playerId = generateId('player');
    // register connection for playerId (allows leader notifications)
    connByPlayerId.set(playerId, ws);
    ws.playerId = playerId;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'join') {
                // Create new player (accept optional gameName) — default solo join
                // If there are currently no human players in play, respawn AI
                const anyHumanPlaying = Array.from(gameState.players.values()).some(p => p.inPlay);
                if (!anyHumanPlaying) {
                    console.log('First human joined — initializing AI ships for new round');
                    gameState.aiShips.clear();
                    initializeAIShips();
                    broadcastGameState();
                }

                const shipData = SHIP_CLASSES[0];
                // Spawn player on a ring further from center to encourage spread across the map
                const _spawnAngle = Math.random() * Math.PI * 2;
                const _spawnRadius = (0.5 + Math.random() * 0.45) * WORLD_SIZE; // between 50% and 95% of world
                const player = {
                    id: playerId,
                    x: Math.cos(_spawnAngle) * _spawnRadius,
                    y: Math.sin(_spawnAngle) * _spawnRadius,
                    angle: 0,
                    velocityX: 0,
                    velocityY: 0,
                    data: shipData,
                    health: shipData.health,
                    maxHealth: shipData.health,
                    xp: 0,
                    kills: 0,
                    score: 0,
                    fireTimer: 0,
                    isAI: false,
                    input: null,
                    gameName: data.gameName ? String(data.gameName).trim().slice(0,30) : '',
                    mineTimer: 0,
                    inPlay: true,
                    fleetCode: null
                };

                gameState.players.set(playerId, player);

                ws.send(JSON.stringify({ type: 'joined', playerId: playerId, player }));
                console.log(`Player ${playerId} joined`);

            // Fleet creation
            } else if (data.type === 'createFleet') {
                const name = data.gameName ? String(data.gameName).trim().slice(0,30) : '';
                const code = generateFleetCode();
                const fleet = { code, leaderId: playerId, members: new Map(), kills: 0, started: false };
                fleet.members.set(playerId, { name });
                // If the player entity already exists (joined), set their display name too
                if (gameState.players.has(playerId)) {
                    const p = gameState.players.get(playerId);
                    p.gameName = name || p.gameName;
                }
                gameState.fleets.set(code, fleet);
                ws.send(JSON.stringify({ type: 'fleetCreated', code, members: Array.from(fleet.members.entries()).map(([id, m]) => ({ id, name: m.name })), kills: fleet.kills }));
                console.log(`Fleet ${code} created by ${playerId}`);

            } else if (data.type === 'joinFleet') {
                const code = data.code ? String(data.code).trim() : null;
                const fleet = code && gameState.fleets.get(code);
                if (!fleet) {
                    ws.send(JSON.stringify({ type: 'fleetError', message: 'Fleet not found' }));
                } else if (fleet.started) {
                    ws.send(JSON.stringify({ type: 'fleetError', message: 'Fleet already started' }));
                } else if (fleet.members.size >= 4) {
                    // Enforce max 4 players per fleet
                    ws.send(JSON.stringify({ type: 'fleetError', message: 'Fleet is full (max 4 players)' }));
                } else {
                    const name = data.gameName ? String(data.gameName).trim().slice(0,30) : '';
                    fleet.members.set(playerId, { name });

                    // If the player is already a joined player entity, update their gameName
                    if (gameState.players.has(playerId)) {
                        const p = gameState.players.get(playerId);
                        p.gameName = name || p.gameName;
                    }

                    // respond to the joining member with current list and kills
                    ws.send(JSON.stringify({ type: 'fleetJoined', code, members: Array.from(fleet.members.entries()).map(([id, m]) => ({ id, name: m.name })), kills: fleet.kills }));

                    // notify leader with updated member list and kills
                    const leaderWs = connByPlayerId.get(fleet.leaderId);
                    if (leaderWs && leaderWs.readyState === WebSocket.OPEN) {
                        leaderWs.send(JSON.stringify({ type: 'fleetUpdate', code, members: Array.from(fleet.members.entries()).map(([id, m]) => ({ id, name: m.name })), kills: fleet.kills, leaderId: fleet.leaderId }));
                    }

                    console.log(`Player ${playerId} joined fleet ${code}`);
                }

            } else if (data.type === 'leaveFleet') {
                const code = data.code;
                const fleet = gameState.fleets.get(code);
                if (fleet && fleet.members.has(playerId)) {
                    fleet.members.delete(playerId);
                    ws.send(JSON.stringify({ type: 'fleetLeft', code }));
                    if (fleet.leaderId === playerId || fleet.members.size === 0) {
                        gameState.fleets.delete(code);
                        for (const [mid] of fleet.members) {
                            const mws = connByPlayerId.get(mid);
                            if (mws && mws.readyState === WebSocket.OPEN) mws.send(JSON.stringify({ type: 'fleetClosed', code }));
                        }
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'fleetError', message: 'Not in fleet' }));
                }

            } else if (data.type === 'startFleet') {
                const code = data.code;
                const fleet = gameState.fleets.get(code);
                if (!fleet) {
                    ws.send(JSON.stringify({ type: 'fleetError', message: 'Fleet not found' }));
                } else if (fleet.leaderId !== playerId) {
                    ws.send(JSON.stringify({ type: 'fleetError', message: 'Only leader can start the fleet' }));
                } else {
                    console.log(`Starting fleet ${code} by ${playerId}`);
                    // Respawn AI if needed
                    const anyHumanPlaying = Array.from(gameState.players.values()).some(p => p.inPlay);
                    if (!anyHumanPlaying) {
                        gameState.aiShips.clear();
                        initializeAIShips();
                    }

                    // Spawn or mark members in game
                    for (const [mid, meta] of fleet.members) {
                        const memberWs = connByPlayerId.get(mid);
                        if (!gameState.players.has(mid)) {
                            const shipData = SHIP_CLASSES[0];
                            // Spawn fleet member on ring for better spread
                            const _spawnAngle = Math.random() * Math.PI * 2;
                            const _spawnRadius = (0.5 + Math.random() * 0.45) * WORLD_SIZE;
                            const p = {
                                id: mid,
                                x: Math.cos(_spawnAngle) * _spawnRadius,
                                y: Math.sin(_spawnAngle) * _spawnRadius,
                                angle: 0,
                                velocityX: 0,
                                velocityY: 0,
                                data: shipData,
                                health: shipData.health,
                                maxHealth: shipData.health,
                                xp: 0,
                                kills: 0,
                                score: 0,
                                fireTimer: 0,
                                isAI: false,
                                input: null,
                                gameName: meta && meta.name ? meta.name : '',
                                mineTimer: 0,
                                inPlay: true,
                                fleetCode: code
                            };
                            gameState.players.set(mid, p);
                            if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                                memberWs.send(JSON.stringify({ type: 'joined', playerId: mid, player: p }));
                            }
                            console.log(`Fleet member ${mid} spawned for fleet ${code}`);
                        } else {
                            const existing = gameState.players.get(mid);
                            existing.inPlay = true;
                            existing.fleetCode = code;
                            // Ensure display name from fleet meta is applied if present
                            if (meta && meta.name) existing.gameName = meta.name || existing.gameName;
                            if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                                memberWs.send(JSON.stringify({ type: 'fleetStarted', code }));
                            }
                        }
                    }

                    // Notify all fleet members that the fleet has started (so they can hide start screen)
                    for (const [mid] of fleet.members) {
                        const mws = connByPlayerId.get(mid);
                        if (mws && mws.readyState === WebSocket.OPEN) {
                            try {
                                mws.send(JSON.stringify({ type: 'fleetStarted', code }));
                            } catch (e) { /* ignore */ }
                        }
                    }

                    // Mark fleet as started and keep it so we can track fleet kills during play
                    fleet.started = true;

                    // Broadcast new state to everyone
                    broadcastGameState();
                }

            } else if (data.type === 'input') {
                    // Update player input
                    const player = gameState.players.get(playerId);
                    if (player) {
                        player.input = data.input;
                        // Handle mine deployment (spacebar) with cooldown to prevent spam
                        if (data.deployMine) {
                            player.mineTimer = player.mineTimer || 0;
                            if (player.mineTimer <= 0) {
                                deployMine(player);
                                player.mineTimer = 1.5; // 1.5s cooldown between deployments
                            }
                        }
                    }

                } else if (data.type === 'restart') {
                    // Player requested a restart: reset AI population to initial set
                    console.log(`Restart requested by ${playerId}`);
                    gameState.aiShips.clear();
                    initializeAIShips();
                    // Immediately broadcast new state so clients update UI
                    broadcastGameState();
                } else if (data.type === 'refillBots') {
                    // Player requested to refill bots (on join battle)
                    console.log(`Refill bots requested by ${playerId}`);
                    gameState.aiShips.clear();
                    initializeAIShips();
                    // Immediately broadcast new state so clients update UI
                    broadcastGameState();
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });
        
        ws.on('close', () => {
            // Remove mapping
            connByPlayerId.delete(playerId);

            // Remove from any fleet membership
            for (const [code, fleet] of Array.from(gameState.fleets.entries())) {
                if (fleet.members.has(playerId)) {
                    fleet.members.delete(playerId);
                    // If leader left or fleet empty, dissolve
                    if (fleet.leaderId === playerId || fleet.members.size === 0) {
                        gameState.fleets.delete(code);
                        for (const [mid] of fleet.members) {
                            const mws = connByPlayerId.get(mid);
                            if (mws && mws.readyState === WebSocket.OPEN) mws.send(JSON.stringify({ type: 'fleetClosed', code }));
                        }
                    }
                }
            }

            // Remove player's mines when they disconnect
            try { removeMinesForOwner(playerId); } catch (e) { /* ignore */ }

            // Remove player from active game if present
            if (gameState.players.has(playerId)) {
                gameState.players.delete(playerId);
            }

            console.log(`Player ${playerId} disconnected`);
        });
    });
// Initialize game
initializeAIShips();

// Start game loop (30 FPS)
setInterval(gameLoop, 1000 / 30);

// Start server with error handling (try next port on EADDRINUSE)
const PORT = parseInt(process.env.PORT, 10) || 3000;

function startServer(port) {
    function onError(err) {
        if (err && err.code === 'EADDRINUSE') {
            console.error(`Port ${port} in use; trying ${port + 1}...`);
            server.removeListener('error', onError);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    }

    server.on('error', onError);
    server.listen(port, () => {
        console.log(`Fleetfury.win server running on port ${port}`);
        server.removeListener('error', onError);
    });
}

// Prevent unhandled 'error' emissions from the WebSocket server
wss.on('error', (err) => {
    console.error('WebSocket server error:', err);
});

startServer(PORT);