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
    { tier: 1, name: "Patrol Boat", variant: "Gunboat", speed: 240, armor: 20, firepower: 15, health: 100, color: "#4CAF50", size: 20, xpRequired: 100 },
    { tier: 1, name: "Patrol Boat", variant: "Fast Attack", speed: 300, armor: 15, firepower: 12, health: 80, color: "#8BC34A", size: 18, xpRequired: 100 },
    { tier: 2, name: "Mine Warfare", variant: "Mine Layer", speed: 150, armor: 30, firepower: 10, health: 150, color: "#795548", size: 25, xpRequired: 200 },
    { tier: 2, name: "Mine Warfare", variant: "Mine Sweeper", speed: 180, armor: 25, firepower: 8, health: 130, color: "#8D6E63", size: 24, xpRequired: 200 },
    { tier: 3, name: "Submarine", variant: "Attack Sub", speed: 210, armor: 35, firepower: 25, health: 200, color: "#37474F", size: 28, xpRequired: 350 },
    { tier: 3, name: "Submarine", variant: "Stealth Sub", speed: 180, armor: 30, firepower: 20, health: 180, color: "#455A64", size: 26, xpRequired: 350 },
    { tier: 4, name: "Torpedo Boat", variant: "Motor Torpedo", speed: 270, armor: 25, firepower: 35, health: 180, color: "#00BCD4", size: 24, xpRequired: 500 },
    { tier: 5, name: "Destroyer", variant: "Guided Missile", speed: 210, armor: 40, firepower: 45, health: 300, color: "#2196F3", size: 32, xpRequired: 750 },
    { tier: 5, name: "Destroyer", variant: "Anti-Sub", speed: 240, armor: 35, firepower: 40, health: 280, color: "#03A9F4", size: 30, xpRequired: 750 },
    { tier: 6, name: "Frigate", variant: "ASW Frigate", speed: 210, armor: 45, firepower: 40, health: 350, color: "#3F51B5", size: 34, xpRequired: 1000 },
    { tier: 7, name: "Corvette", variant: "Missile Corvette", speed: 240, armor: 38, firepower: 48, health: 320, color: "#673AB7", size: 30, xpRequired: 1300 },
    { tier: 8, name: "Cruiser", variant: "Heavy Cruiser", speed: 180, armor: 60, firepower: 60, health: 500, color: "#9C27B0", size: 40, xpRequired: 1700 },
    { tier: 9, name: "Battleship", variant: "Super Battleship", speed: 120, armor: 80, firepower: 85, health: 800, color: "#E91E63", size: 50, xpRequired: 2200 },
    { tier: 10, name: "Aircraft Carrier", variant: "Fleet Carrier", speed: 150, armor: 70, firepower: 50, health: 1000, color: "#F44336", size: 60, xpRequired: 2800 },
    { tier: 11, name: "Amphibious Assault", variant: "LHD", speed: 150, armor: 65, firepower: 55, health: 900, color: "#FF5722", size: 55, xpRequired: 3500 },
    { tier: 12, name: "Support Vessel", variant: "Replenishment", speed: 120, armor: 50, firepower: 20, health: 700, color: "#FF9800", size: 45, xpRequired: 4000 },
    { tier: 13, name: "Dreadnought", variant: "Nuclear", speed: 90, armor: 100, firepower: 100, health: 1200, color: "#FFC107", size: 65, xpRequired: 5000 },
    { tier: 14, name: "Experimental", variant: "Railgun Cruiser", speed: 210, armor: 75, firepower: 120, health: 1000, color: "#00FFFF", size: 48, xpRequired: 7000 },
    { tier: 15, name: "Command Ship", variant: "Flagship", speed: 150, armor: 90, firepower: 80, health: 1500, color: "#FFD700", size: 70, xpRequired: 10000 }
];

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
    nextAIId: 0,
    nextProjectileId: 0,
    nextMineId: 0,
    nextEffectId: 0
};

// Broadcast throttling to help with lag -- send updates every N ticks
let __tickCounter = 0;
const BROADCAST_EVERY = 2; // send state every 2 server ticks (~15 updates/sec)


// Performance caps to avoid runaway entity growth
const MAX_EFFECTS = 500;
const MAX_PROJECTILES = 400;
const MAX_MINES = 500;

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
        targetAngle: Math.random() * Math.PI * 2,
        behaviorTimer: 0,
        targetId: null
    };
    
    gameState.aiShips.set(id, ship);
    return ship;
}

// Spawn initial AI ships
function initializeAIShips() {
    // Start with 20 AI ships placed uniformly at random across the world
    const initialCount = 20;
    const worldSize = 3000; // matches game world bounds
    for (let i = 0; i < initialCount; i++) {
        // Uniformly pick an (x,y) inside [-worldSize, worldSize]
        const x = (Math.random() * 2 - 1) * worldSize;
        const y = (Math.random() * 2 - 1) * worldSize;
        // Spawn all initial AI as tier 1 Patrol Boats
        createAIShip(x, y, 1);
    }
}

// Update AI behavior
function updateAI(ship, dt) {
    ship.behaviorTimer -= dt;
    
    if (ship.behaviorTimer <= 0) {
        ship.behaviorTimer = 2 + Math.random() * 3;
        
        // Find closest target
        let closestDist = Infinity;
        ship.targetId = null;
        
        // Check players
        gameState.players.forEach(player => {
            const dist = Math.hypot(player.x - ship.x, player.y - ship.y);
            if (dist < closestDist && dist < 500) {
                closestDist = dist;
                ship.targetId = player.id;
            }
        });
        
        // Check other AI ships
        gameState.aiShips.forEach(otherShip => {
            if (otherShip.id !== ship.id) {
                const dist = Math.hypot(otherShip.x - ship.x, otherShip.y - ship.y);
                if (dist < closestDist && dist < 500) {
                    closestDist = dist;
                    ship.targetId = otherShip.id;
                }
            }
        });
        
        if (!ship.targetId) {
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
        if (dist < 300 && ship.fireTimer <= 0) {
            fireProjectile(ship);
        }

        // AI may deploy mines as a tactical option when close to a target
        if (ship.mineTimer <= 0 && dist < 250 && Math.random() < 0.25) {
            deployMine(ship);
            ship.mineTimer = 6 + Math.random() * 8; // cooldown between 6-14s
        }
    }

    // Ensure mineTimer counts down even if no target
    ship.mineTimer = Math.max(0, ship.mineTimer - dt);
    
    // Turn towards target angle
    let angleDiff = ship.targetAngle - ship.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    ship.angle += angleDiff * dt * 2;
    
    // Move forward
    const thrust = ship.data.speed * 0.5;
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
    
    // Keep in bounds
    const worldSize = 3000;
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
            lifetime: 2
        };
        gameState.projectiles.push(projectile);
    }

    ship.fireTimer = 1 - (ship.data.tier * 0.05);
}

// Handle damage
function takeDamage(ship, damage, attackerId) {
    const actualDamage = Math.max(1, damage - ship.data.armor * 0.3);
    ship.health -= actualDamage;
    
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
        
        // Award XP to attacker
        const attacker = gameState.players.get(attackerId) || gameState.aiShips.get(attackerId);
        if (attacker) {
            attacker.kills++;
            attacker.xp += ship.data.tier * 50;
            attacker.score += ship.data.tier * 50;
            
            // Check for level up
            if (attacker.xp >= attacker.data.xpRequired) {
                const nextTier = attacker.data.tier + 1;
                const nextShips = SHIP_CLASSES.filter(s => s.tier === nextTier);
                if (nextShips.length > 0) {
                    const nextShip = nextShips[Math.floor(Math.random() * nextShips.length)];
                    attacker.data = nextShip;
                    attacker.maxHealth = nextShip.health;
                    attacker.health = nextShip.health;
                    attacker.xp = 0;
                    
                    gameState.effects.push({
                        id: `effect_${gameState.nextEffectId++}`,
                        type: 'levelup',
                        x: attacker.x,
                        y: attacker.y,
                        lifetime: 2
                    });
                }
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
        
        // Update fire timer
        player.fireTimer = Math.max(0, player.fireTimer - dt);
        // Update mine deployment cooldown
        player.mineTimer = Math.max(0, (player.mineTimer || 0) - dt);
        
        // Keep in bounds
        const worldSize = 3000;
        player.x = Math.max(-worldSize, Math.min(worldSize, player.x));
        player.y = Math.max(-worldSize, Math.min(worldSize, player.y));
    });
    
    // Update projectiles
    gameState.projectiles = gameState.projectiles.filter(proj => {
        proj.x += Math.cos(proj.angle) * proj.speed * dt;
        proj.y += Math.sin(proj.angle) * proj.speed * dt;
        proj.lifetime -= dt;
        return proj.lifetime > 0;
    });

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
            if (proj.ownerId !== player.id) {
                const dist = Math.hypot(proj.x - player.x, proj.y - player.y);
                if (dist < player.data.size) {
                    if (takeDamage(player, proj.damage, proj.ownerId)) {
                        gameState.players.delete(player.id);
                    }
                    toRemove.add(proj.id);
                }
            }
        });
        
        // Check AI collisions
        gameState.aiShips.forEach(ship => {
            if (proj.ownerId !== ship.id) {
                const dist = Math.hypot(proj.x - ship.x, proj.y - ship.y);
                if (dist < ship.data.size) {
                    if (takeDamage(ship, proj.damage, proj.ownerId)) {
                        gameState.aiShips.delete(ship.id);
                        // NOTE: Do not respawn AI here — AI should die permanently.
                    }
                    toRemove.add(proj.id);
                }
            }
        });
    });
    
    // Remove hit projectiles
    gameState.projectiles = gameState.projectiles.filter(p => !toRemove.has(p.id));
    
    // Check mine collisions (only active mines)
    const minesToRemove = new Set();
    
    gameState.mines.forEach(mine => {
        if (!mine.active) return; // Skip inactive mines

        // Determine if the mine should detonate (any ship stepped on it)
        let detonated = false;
        gameState.players.forEach(player => {
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

        // Apply to players
        gameState.players.forEach(player => {
            const d = Math.hypot(mine.x - player.x, mine.y - player.y);
                if (d <= explosionRadius) {
                // damage falls off linearly from center->edge; center gets mine.damage
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
            activeMines: gameState.mines.filter(m => m.ownerId === p.id).length
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
            score: s.score
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
        }))
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
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'join') {
                // If there are currently no human players, treat this as the
                // first join of a new round and (re)spawn AI ships.
                if (!gameState.players || gameState.players.size === 0) {
                    console.log('First human joined — initializing AI ships for new round');
                    gameState.aiShips.clear();
                    initializeAIShips();
                    // Immediately broadcast new state so clients see bots
                    broadcastGameState();
                }

                // Create new player (accept optional gameName)
                const shipData = SHIP_CLASSES[0];
                const player = {
                    id: playerId,
                    // Spawn players anywhere within world bounds instead of a small area
                    x: (Math.random() * 2 - 1) * 3000,
                    y: (Math.random() * 2 - 1) * 3000,
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
                    gameName: data.gameName || '',
                    mineTimer: 0
                };

                gameState.players.set(playerId, player);

                ws.send(JSON.stringify({
                    type: 'joined',
                    playerId: playerId,
                    player: player
                }));

                console.log(`Player ${playerId} joined`);
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
        gameState.players.delete(playerId);
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
        console.log(`Naval War IO server running on port ${port}`);
        server.removeListener('error', onError);
    });
}

// Prevent unhandled 'error' emissions from the WebSocket server
wss.on('error', (err) => {
    console.error('WebSocket server error:', err);
});

startServer(PORT);