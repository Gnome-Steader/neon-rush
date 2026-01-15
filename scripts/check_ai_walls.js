const WebSocket = require('ws');
const url = process.argv[2] || 'ws://localhost:3001';
const ws = new WebSocket(url);

let got = false;
ws.on('open', () => {
    console.log('connected to', url);
    // Ask server to spawn bots by pretending to join briefly
    try { ws.send(JSON.stringify({ type: 'join', gameName: 'checker' })); } catch (e) { /* ignore */ }
    // If the immediate join does not trigger AI broadcast (race), request a refill shortly after
    setTimeout(() => {
        try { ws.send(JSON.stringify({ type: 'refillBots' })); } catch (e) { /* ignore */ }
    }, 200);
});

ws.on('message', msg => {
    if (got) return;
    try {
        const data = JSON.parse(msg);
        if (data.type !== 'gameState') return;
        const walls = data.walls || [];
        const ais = data.aiShips || [];
        const overlaps = [];
        for (const ai of ais) {
            for (const w of walls) {
                const left = w.x - w.width/2;
                const right = w.x + w.width/2;
                const top = w.y - w.height/2;
                const bottom = w.y + w.height/2;
                // approximate size
                const r = (ai.data && ai.data.size) ? ai.data.size : 20;
                const nearestX = Math.max(left, Math.min(ai.x, right));
                const nearestY = Math.max(top, Math.min(ai.y, bottom));
                const dx = ai.x - nearestX;
                const dy = ai.y - nearestY;
                const collides = dx*dx + dy*dy <= r*r;
                if (collides) overlaps.push({ aiId: ai.id, wallId: w.id });
            }
        }
        console.log('walls:', walls.length, 'ai:', ais.length, 'overlaps:', overlaps.length);
        if (overlaps.length) console.log('sample overlaps:', overlaps.slice(0,5));
    } catch (e) {
        console.error('err parsing msg', e);
    } finally {
        got = true;
        ws.close();
        process.exit(0);
    }
});

ws.on('error', err => { console.error('ws error', err); process.exit(2); });