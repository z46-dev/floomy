const express = require("express");
const expressWS = require("express-ws");
const cors = require("cors");
const fs = require("fs");

const util = require("./lib/util.js");
const protocol = require("./lib/protocol.js");
const { HSHG } = require("./lib/hshg.js");
const petals = require("./lib/petals.js");
const mobConfig = require("./lib/mobs.js");
const discord = require("./lib/bot.js");
const compile = require("./lib/jsFuck.js");

const config = {
    packetDebugger: process.argv.some(arg => arg.includes("packet-debugger"))
};

const clientboundPetals = Object.values(petals).map(rarity => Object.values(rarity)).flat().flat();
const clientboundMobs = Object.values(mobConfig).map(rarity => Object.values(rarity)).flat().flat();

const mobSpawnTable = util.generateLootTable(mobConfig, {
    "Common": 100,
    "Unusual": 60,
    "Rare": 30,
    "Epic": 15,
    "Legendary": 6,
    "Mythical": 1,
    "Unique": .1
});

const grid = new HSHG();
const world = {
    width: 42000,
    height: 6000,
    zones: [{
        type: "easy",
        start: 0,
        end: 12000,
        spawning: {
            maximum: 50,
            possible: {
                "Common": ["Rock", "Ladybug", "Bee"],
                "Epic": ["Giant Ladybug"]
            }
        }
    }, {
        type: "medium",
        start: 12000,
        end: 24000,
        spawning: {
            maximum: 50,
            possible: {
                "Common": ["Cactus", "Ladybug", "Bee"],
                "Unusual": ["Hornet"],
                "Rare": ["Beetle"]
            }
        }
    }, {
        type: "hard",
        start: 24000,
        end: 36000,
        spawning: {
            maximum: 50,
            possible: {
                "Common": ["Hornet", "Ladybug", "Bee"],
                "Unusual": ["Rock"],
                "Rare": ["Beetle"],
                "Legendary": ["Legendary Beetle"]
            }
        }
    }, {
        type: "unknown",
        start: 36000,
        end: 42000,
        spawning: {
            maximum: 50,
            possible: {
                "Unusual": ["Rock", "Hornet"],
                "Rare": ["Beetle"],
                "Epic": ["Giant Ladybug"],
                "Legendary": ["Legendary Hornet", "Legendary Beetle"],
                "Mythical": ["Mythical Ladybug"]
            }
        }
    }],
    mspt: "0.0",
    port: process.env.PORT || 3000,
    fps: 0,
    frames: 0,
    bandwidth: {
        total: {
            in: 0,
            out: 0
        },
        second: {
            in: 0,
            out: 0,
            counterIn: 0,
            counterOut: 0
        },
        count: {
            in: bytes => {
                world.bandwidth.total.in += bytes / 1e+6;
                world.bandwidth.second.counterIn += bytes;
            },
            out: bytes => {
                world.bandwidth.total.out += bytes / 1e+6;
                world.bandwidth.second.counterOut += bytes;
            }
        }
    }
};

setInterval(function updateBandwidthUsage() {
    world.fps = world.frames;
    world.bandwidth.second.in = world.bandwidth.second.counterIn;
    world.bandwidth.second.out = world.bandwidth.second.counterOut;
    world.bandwidth.second.counterIn = 0;
    world.bandwidth.second.counterOut = 0;
    world.frames = 0;
}, 1e3);

let entities = {},
    flowers = {},
    mobs = {},
    entityID = 0;

class Vector {
    constructor(x, y) {
        this._x = x;
        this._y = y;
    }
    set x(val) {
        if (Number.isFinite(val)) {
            this._x = val;
        }
    }
    set y(val) {
        if (Number.isFinite(val)) {
            this._y = val;
        }
    }
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    update() {
        this.len = this.length;
        this.dir = this.direction;
    }
    get length() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    isShorterThan(d) {
        return this.x * this.x + this.y * this.y <= d * d;
    }
    get direction() {
        return Math.atan2(this.y, this.x);
    }
}

class Health {
    constructor(amount) {
        this.max = amount;
        this.amount = amount;
        this.lastHit = 0;
        this.resist = .6;
    }
    regenerate() {
        if (Date.now() - this.lastHit <= 15000) return;
        let amount = this.max / 250;
        this.amount = Math.min(this.max, this.amount + amount);
    }
    forceRegenerate(amount) {
        this.amount = Math.min(this.max, this.amount + this.max * amount);
    }
    damage(damage) {
        this.amount = Math.max(0, this.amount - (damage * this.resist));
        this.lastHit = Date.now();
    }
    check() {
        return this.amount > 0;
    }
    get percent() {
        return Math.round(Math.min(1, Math.max(0, this.amount / this.max)) * 100);
    }
}

class Entity {
    constructor(x, y) {
        this._x = x;
        this._y = y;
        this.size = 25;
        this.id = entityID ++;
        this.velocity = new Vector(0, 0);
        this.acceleration = new Vector(0, 0);
        this.attack = this.defend = this.inGrid = false;
        this.damage = 10;
        this.pushability = 4 / 3;
        this.collisionArray = [];
        this.HSHG = {};
        this.updateAABB = () => {};
        this.getAABB = (() => {
            let data = {},
                savedSize = 0,
                getLongestEdge = (x1, y1, x2, y2) => Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
            this.updateAABB = () => {
                let x1 = this.x - this.size,
                    y1 = this.y - this.size,
                    x2 = this.x + this.size,
                    y2 = this.y + this.size,
                    size = getLongestEdge(x1, y1, x2, y1),
                    sizeDiff = savedSize / size;
                data = {
                    min: [x1, y1],
                    max: [x2, y2],
                    active: true,
                    size: size
                };
                if (sizeDiff > Math.SQRT2 || sizeDiff < Math.SQRT1_2) {
                    this.removeFromGrid();
                    this.addToGrid();
                    savedSize = data.size;
                }
            };
            return () => data;
        })();
        this.updateAABB();
        entities[this.id] = this;
    }
    set x(val) {
        if (Number.isFinite(val)) {
            this._x = val;
        }
    }
    set y(val) {
        if (Number.isFinite(val)) {
            this._y = val;
        }
    }
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    get source() {
        return this.id;
    }
    addToGrid() {
        if (!this.inGrid) {
            grid.addObject(this);
            this.inGrid = true;
        }
    }
    removeFromGrid() {
        if (this.inGrid) {
            grid.removeObject(this);
            this.inGrid = false;
        }
    }
    destroy() {
        this.health.amount = -1;
        this.kill();
    }
    kill() {
        if (this.isKilled) {
            return;
        }
        this.isKilled = 1;
        this.collisionArray = [];
        this.removeFromGrid();
        delete entities[this.id];
    }
}

class Flower extends Entity {
    constructor(x, y, socket) {
        super(x, y);
        this.socket = socket;
        this.angle = 0;
        this.speed = 45;
        this.health = new Health(100);
        this.petals = [];
        this.projectiles = [];
        for (let i = 0; i < 5; i ++) {
            this.petals.push(new Petal(this, 3.5, i, Math.random() * clientboundPetals.length | 0));
            this.petals[this.petals.length - 1].makeExtra();
        }
        //this.addToGrid();
        flowers[this.id] = this;
    }
    update() {
        if (!this.health.check()) {
            this.kill();
            return;
        }
        this.updateAABB();
        if (this.poisoned) {
            if (++this.poisoned.tick % this.poisoned.interval === 0) {
                this.health.damage(this.health.max * this.poisoned.intensity);
                if (--this.poisoned.time <= 0) {
                    this.poisoned = null;
                }
            }
        }
        this.health.regenerate();
        this.angle += .075;
        this.velocity.x = util.lerp(this.velocity.x, this.acceleration.x, .334);
        this.velocity.y = util.lerp(this.velocity.y, this.acceleration.y, .334);
        if ((this.x + this.velocity.x * this.speed) - this.size <= 0) {
            this.velocity.x = 0;
            this.x = this.size;
        } else if ((this.x + this.velocity.x * this.speed) + this.size >= world.width) {
            this.velocity.x = 0;
            this.x = world.width - this.size;
        } else {
            this.x = util.lerp(this.x, this.x + this.velocity.x * this.speed, .15);
        }
        if ((this.y + this.velocity.y * this.speed) - this.size <= 0) {
            this.velocity.y = 0;
            this.y = this.size;
        } else if ((this.y + this.velocity.y * this.speed) + this.size >= world.height)  {
            this.velocity.y = 0;
            this.y = world.height - this.size;
        } else {
            this.y = util.lerp(this.y, this.y + this.velocity.y * this.speed, .15);
        }
        for (let i = 0; i < this.petals.length; i ++) {
            if (this.petals[i].isPlaceholder) {
                if (Date.now() - this.petals[i].from >= this.petals[i].timer) {
                    this.petals[i] = new Petal(this, this.petals[i].distance, this.petals[i].slotID, this.petals[i].type, this.petals[i].parentPetal);
                    this.petals[i].makeExtra();
                }
                continue;
            }
            if (!this.petals[i].health.check()) {
                this.petals[i].kill();
                this.petals[i] = {
                    isPlaceholder: true,
                    slotID: this.petals[i].slotID,
                    from: Date.now(),
                    timer: this.petals[i].type.recharge,
                    distance: this.petals[i].distance,
                    type: this.petals[i].saveType,
                    parentPetal: this.petals[i].parentPetal
                };
                continue;
            }
            this.petals[i].update();
        }
        for (let i = 0; i < this.projectiles.length; i ++) {
            this.projectiles[i].update();
        }
        this.collisionArray = [];
    }
    kill() {
        if (this.isKilled) {
            return;
        }
        this.isKilled = 1;
        this.removeFromGrid();
        for (let i = 0; i < this.petals.length; i ++) {
            if (!this.petals[i].isPlaceholder) {
                this.petals[i].kill();
            }
        }
        for (let i = 0; i < this.projectiles.length; i ++) {
            this.projectiles[i].kill();
        }
        this.collisionArray = [];
        delete entities[this.id];
        delete flowers[this.id];
    }
}

class Petal extends Entity {
    constructor(flower, distance, slotID, type, parent) {
        super(flower.x, flower.y);
        this.parentPetal = parent;
        this.flower = flower;
        this.distance = distance;
        this.slotID = slotID;
        this.type = clientboundPetals[type];
        this.health = new Health(this.type.health);
        this.damage = this.type.damage;
        this.size = this.type.size * flower.size;
        this.poisonToApply = this.type.poison;
        this.saveType = type;
        this.pushability = 6;
        if (this.type.damageResist) {
            this.flower.health.resist = Math.max(.05, this.flower.health.resist - this.type.damageResist);
        }
        this.creation = Date.now();
    }
    makeExtra() {
        if (this.type.spawn && this.parentPetal == null && this.slotID > -1) {
            let flag = false;
            let existing = this.flower.petals.filter(r => r.parentPetal === this.slotID);
            for (let i = 0; i < this.type.spawn - 1 - existing; i ++) {
                this.flower.petals.push(new Petal(this.flower, this.distance, -1, this.saveType, this.slotID));
                this.flower.petals[this.flower.petals.length - 1].makeExtra();
                flag = true;
            }
            if (flag) {
                this.flower.petals = this.flower.petals.sort(function sortByID(a, b) {
                    return a.id - b.id;
                }).sort(function sortBySlotAndParent(a, b) {
                    let IDa = a.slotID === -1 ? a.parentPetal : a.slotID,
                        IDb = b.slotID === -1 ? b.parentPetal : b.slotID;
                    return IDa - IDb;
                });
            }
        }
    }
    get source() {
        return this.flower.id;
    }
    get angle() {
        return this.flower.petals.findIndex(petal => petal.id === this.id) * (Math.PI * 2 / this.flower.petals.length);
    }
    update() {
        if (!this.health.check()) {
            return;
        }
        if (this.parentPetal != null && this.flower.petals.findIndex(petal => petal.slotID === this.parentPetal) === -1) {
            this.flower.petals = this.flower.petals.filter(petal => petal.id !== this.id);
            this.kill();
            return;
        }
        if (!this.hasFragged && this.type.frag && this.type.frag.amount > 0 && this.flower.attack && Date.now() - this.creation > this.type.recharge / 2 && this.health.check()) {
            for (let i = 0; i < this.type.frag.amount; i ++) {
                this.flower.projectiles.push(new Projectile(this.x, this.y, this.type.frag, this.flower, this.angle + Math.PI / (this.type.frag.amount / 2) * i, this.saveType));
            }
            this.hasFragged = true;
            this.health.damage(this.health.max * 2);
            this.collisionArray = [];
            return;
        }
        this.updateAABB();
        if (this.type.healing && this.flower.health.percent < 99 && Date.now() - this.creation > this.type.recharge / 2) { // Roses
            if (util.getDistance(this, this.flower) < this.flower.size) {
                this.flower.health.forceRegenerate(this.type.healing);
                this.health.damage(this.health.max);
            }
            this.velocity.x = util.lerp(this.velocity.x, (this.flower.x + (this.flower.velocity.x * this.flower.speed)) - this.x, .25);
            this.velocity.y = util.lerp(this.velocity.y, (this.flower.y + (this.flower.velocity.y * this.flower.speed)) - this.y, .25);
            this.x = util.lerp(this.x, this.x + this.velocity.x, .25);
            this.y = util.lerp(this.y, this.y + this.velocity.y, .25);
        } else { // Basic movement
            let dist = this.distance * (this.flower.attack ? 1.75 : this.flower.defend ? .65 : 1);
            this.velocity.x = util.lerp(this.velocity.x, (this.flower.x + Math.cos(this.angle + this.flower.angle) * (this.flower.size * dist)) - this.x, .175);
            this.velocity.y = util.lerp(this.velocity.y, (this.flower.y + Math.sin(this.angle + this.flower.angle) * (this.flower.size * dist)) - this.y, .175);
            this.x = util.lerp(this.x, this.x + this.velocity.x, .25);
            this.y = util.lerp(this.y, this.y + this.velocity.y, .25);
        }
        this.collisionArray = [];
    }
    kill() {
        if (this.isKilled) {
            return;
        }
        if (this.type.damageResist) {
            this.flower.health.resist = Math.min(1, this.flower.health.resist + this.type.damageResist);
        }
        this.isKilled = 1;
        this.collisionArray = [];
        this.removeFromGrid();
        delete entities[this.id];
    }
}

class Projectile extends Entity {
    constructor(x, y, type, parent, angle = parent.angle, index = 0) {
        super(x, y);
        this.parent = parent;
        this.index = index;
        this.health = new Health(type.damage);
        this.speed = type.speed;
        this.damage = type.damage;
        this.range = type.range;
        this.size = type.size * parent.size;
        this.poisonToApply = type.poison;
        this._v = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        }
    }
    get angle() {
        return this.velocity.direction;
    }
    get source() {
        return this.parent.id;
    }
    update() {
        if (!this.health.check() || this.range <= 0) {
            this.kill();
            return;
        }
        this.range --;
        this.updateAABB();
        this.velocity.x = this._v.x;
        this.velocity.y = this._v.y;
        this.x += this.velocity.x * this.speed;
        this.y += this.velocity.y * this.speed;
        this.collisionArray = [];
    }
    kill() {
        if (this.isKilled) {
            return;
        }
        this.isKilled = 1;
        this.removeFromGrid();
        this.collisionArray = [];
        this.parent.projectiles = this.parent.projectiles.filter(r => r.id !== this.id);
        delete entities[this.id];
    }
}

class Mob extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.angle = 0;
        this.type = type;
        this.health = new Health(this.type.health);
        this.damage = this.type.damage;
        this.speed = this.type.speed;
        this.aiType = this.type.aiType;
        if (this.type.size instanceof Array) {
            this.size = this.type.size[0] + Math.random() * (this.type.size[1] - this.type.size[0]);
        } else if (this.type.size) {
            this.size = this.type.size;
        }
        if (this.type.pushability) {
            this.pushability = this.type.pushability;
        }
        this.projectiles = [];
        if (this.type.projectile) {
            this.projectile = this.type.projectile;
            this.projectile.ticker = 10;
        }
        this.lastUpdate = 0;
        if (this.type.drops) {
            this.drops = this.type.drops;
        }
        mobs[this.id] = this;
    }
    refreshAI() {
        if (Date.now() - this.lastUpdate > 500) {
            this.lastUpdate = Date.now();
            let suitable = Object.values(flowers).filter(flower => !!flower && flower.source !== this.source && util.getDistance(flower, this) < this.size + 500);
            if (suitable.length) {
                if (!suitable.includes(this.target)) {
                    this.target = suitable.sort((a, b) => util.getDistance(a, this) - util.getDistance(b, this))[0];
                }
            } else {
                this.target = null;
            }
        }
    }
    update() {
        if (!this.health.check()) {
            this.kill();
            return;
        }
        this.updateAABB();
        if (this.poisoned) {
            if (++this.poisoned.tick % this.poisoned.interval === 0) {
                this.health.damage(this.health.max * this.poisoned.intensity);
                if (--this.poisoned.time <= 0) {
                    this.poisoned = null;
                }
            }
        }
        this.health.regenerate();
        let angle = Math.random() * Math.PI * 2;
        if (this.projectile) {
            this.projectile.ticker --;
        }
        switch (this.aiType) {
            case "hostile":
            case "hostileDistance":
                this.refreshAI();
                if (this.target) {
                    angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                    if (this.aiType === "hostileDistance" && util.getDistance(this.target, this) < this.size * 3) {
                        this.acceleration.x = 0;
                        this.acceleration.y = 0;
                        this.angle = angle;
                    } else {
                        this.acceleration.x = Math.cos(angle);
                        this.acceleration.y = Math.sin(angle);
                        this.angle = angle;
                    }
                    if (this.projectile && this.projectile.ticker <= 0) {
                        this.projectile.ticker = this.projectile.reload;
                        this.projectiles.push(new Projectile(this.x, this.y, this.projectile, this));
                    }
                } else if (Math.random() > .99) {
                    this.acceleration.x = Math.cos(angle);
                    this.acceleration.y = Math.sin(angle);
                    this.angle = angle;
                }
                break;
            case "passive":
                if (Math.random() > .99) {
                    this.acceleration.x = Math.cos(angle);
                    this.acceleration.y = Math.sin(angle);
                    this.angle = angle;
                }
                break;
        }
        this.velocity.x = util.lerp(this.velocity.x, this.acceleration.x, .334);
        this.velocity.y = util.lerp(this.velocity.y, this.acceleration.y, .334);
        if ((this.x + this.velocity.x * this.speed) - this.size <= 0) {
            this.velocity.x = 0;
            this.x = this.size;
        } else if ((this.x + this.velocity.x * this.speed) + this.size >= world.width) {
            this.velocity.x = 0;
            this.x = world.width - this.size;
        } else {
            this.x = util.lerp(this.x, this.x + this.velocity.x * this.speed, .15);
        }
        if ((this.y + this.velocity.y * this.speed) - this.size <= 0) {
            this.velocity.y = 0;
            this.y = this.size;
        } else if ((this.y + this.velocity.y * this.speed) + this.size >= world.height) {
            this.velocity.y = 0;
            this.y = world.height - this.size;
        } else {
            this.y = util.lerp(this.y, this.y + this.velocity.y * this.speed, .15);
        }
        for (let projectile of this.projectiles) {
            projectile.update();
        }
        this.collisionArray = [];
    }
    kill() {
        if (this.isKilled) {
            return;
        }
        this.isKilled = 1;
        this.removeFromGrid();
        this.collisionArray = [];
        for (let projectile of this.projectiles) {
            projectile.kill();
        }
        this.projectiles = [];
        if (this.drops && Math.random() > 1 - (this.drops.chance / 100)) {
            for (let i = 0; i < this.drops.maximum; i ++) {
                let rarity = util.getRarity(0, Object.keys(this.drops.choices));
                if (this.drops.choices[rarity]) {
                    let choice = util.choose(this.drops.choices[rarity]);
                    choice = clientboundPetals.findIndex(petal => petal.name === choice && petal.rarity === rarity);
                    if (choice > -1) {
                        new Drop(this.x, this.y, choice);
                    }
                }
            }
        }
        delete entities[this.id];
        delete mobs[this.id];
    }
}

let drops = {};
class Drop extends Entity {
    constructor(x, y, index) {
        super(x, y);
        this.index = index;
        //
        this.health = new Health(1);
        this.damage = 0;
        this.pushability = 0;
        this.size = 30;
        this.timer = 500;
        //
        this.updateAABB();
        drops[this.id] = this;
    }
    update() {
        this.timer --;
        if (this.timer <= 0) {
            this.kill();
            return;
        }
        this.collisionArray = [];
    }
    kill() {
        if (this.isKilled) {
            return;
        }
        this.isKilled = 1;
        this.removeFromGrid();
        this.collisionArray = [];
        delete entities[this.id];
        delete drops[this.id];
    }
}

let bots = [];
class Bot {
    constructor() {
        this.id = bots.length;
        this.lastUpdate = 0;
        this.spawn();
        this.update();
        bots.push(this);
    }
    spawn() {
        this.body = new Flower(Math.random() * world.width, Math.random() * world.height, null);
        this.body.name = "BOT " + this.id;
    }
    update() {
        if (!this.body || !this.body.health.check()) {
            this.target = null;
            this.spawn();
            this.lastUpdate -= 501;
        }
        if (this.body && Date.now() - this.lastUpdate > 500) {
            this.lastUpdate = Date.now();
            let suitable = Object.values(flowers).concat(Object.values(mobs)).filter(entity => entity.source !== this.body.source && util.getDistance(entity, this.body) < 1000);
            if (suitable.length) {
                if (!suitable.includes(this.target)) {
                    this.target = suitable.sort((a, b) => util.getDistance(a, this.body) - util.getDistance(b, this.body))[0];
                }
            } else {
                this.target = null;
            }
        }
        if (this.target != null && this.body) {
            if (!this.target.health.check()) {
                this.target = null;
                return;
            }
            let angle = Math.atan2(this.target.y - this.body.y, this.target.x - this.body.x),
                health = this.body.health.percent;
            this.body.acceleration.x = Math.cos(angle);
            this.body.acceleration.y = Math.sin(angle);
            this.body.attack = health > 66;
            this.body.defend = health < 33;
        }
    }
}

const sockets = (function() {
    let clients = [];
    function bitflag(object) {
        let output = 0,
            i = 1;
        for (let key of Object.keys(object)) {
            if (!!object[key]) {
                output += i;
            }
            i *= 2;
        }
        return output;
    }
    function encode(type, data) {
        const writer = new protocol.Writer(true);
        writer.setInt8(type);
        switch (type) {
            case 0: {
                writer.setStringUTF8(data.playerID.toString());
                writer.setUint8(data.flowers.length);
                writer.setUint16(data.mobs.length);
                writer.setUint16(data.drops.length);
                if (config.packetDebugger) {
                    protocol.packetDebugger({
                        playerID: data.playerID,
                        flowers: data.flowers.length,
                        mobs: data.mobs.length,
                        drops: data.drops.length
                    }, {
                        playerID: "StringUTF8",
                        flowers: "Uint8",
                        mobs: "Uint16",
                        drops: "Uint16"
                    });
                }
                for (let i = 0, l = data.flowers.length; i < l; i ++) {
                    let flower = data.flowers[i];
                    if (config.packetDebugger) {
                        protocol.packetDebugger({
                            id: flower.id.toString(),
                            flags: bitflag({
                                hit: (Date.now() - flower.health.lastHit) < 100,
                                poisoned: !!flower.poisoned
                            }),
                            name: flower.name || "Unnamed Flower",
                            x: Math.round(flower.x),
                            y: Math.round(flower.y),
                            size: Math.round(flower.size),
                            health: flower.health.percent,
                            petalLength: flower.petals.filter(petal => !petal.isPlaceholder && petal.health.check()).length,
                            projectileLength: flower.projectiles.filter(projectile => projectile.health.check()).length
                        }, {
                            id: "StringUTF8",
                            flags: "Uint8",
                            name: "StringUTF8",
                            x: "Int32",
                            y: "Int32",
                            size: "Uint8",
                            health: "Uint8",
                            petalLength: "Uint8",
                            projectileLength: "Uint8"
                        });
                    }
                    writer.setStringUTF8(flower.id.toString());
                    writer.setUint8(bitflag({
                        hit: (Date.now() - flower.health.lastHit) < 100,
                        poisoned: !!flower.poisoned
                    }));
                    writer.setStringUTF8(flower.name || "Unnamed Flower");
                    writer.setUint32(Math.round(flower.x));
                    writer.setUint32(Math.round(flower.y));
                    writer.setUint8(Math.round(flower.size));
                    writer.setUint8(flower.health.percent);
                    writer.setUint8(flower.petals.filter(petal => !petal.isPlaceholder && petal.health.check()).length);
                    writer.setUint8(flower.projectiles.filter(projectile => projectile.health.check()).length);
                    for (let j = 0, l = flower.petals.length; j < l; j ++) {
                        let petal = flower.petals[j];
                        if (petal.isPlaceholder || !petal.health.check()) {
                            continue;
                        }
                        if (config.packetDebugger) {
                            protocol.packetDebugger({
                                id: petal.id.toString(),
                                flags: bitflag({
                                    hit: (Date.now() - petal.health.lastHit) < 100
                                }),
                                x: Math.round(petal.x),
                                y: Math.round(petal.y),
                                size: Math.round(petal.size),
                                index: petal.type.index
                            }, {
                                id: "StringUTF8",
                                flags: "Uint8",
                                x: "Int32",
                                y: "Int32",
                                size: "Uint8",
                                index: "Int8"
                            });
                        }
                        writer.setStringUTF8(petal.id.toString());
                        writer.setUint8(bitflag({
                            hit: (Date.now() - petal.health.lastHit) < 100
                        }));
                        writer.setUint32(Math.round(petal.x));
                        writer.setUint32(Math.round(petal.y));
                        writer.setUint8(Math.round(petal.size));
                        writer.setInt8(petal.type.index);
                    }
                    for (let j = 0, l = flower.projectiles.length; j < l; j ++) {
                        let projectile = flower.projectiles[j];
                        if (!projectile.health.check()) {
                            continue;
                        }
                        if (config.packetDebugger) {
                            protocol.packetDebugger({
                                id: projectile.id.toString(),
                                flags: bitflag({
                                    hit: (Date.now() - projectile.health.lastHit) < 100
                                }),
                                x: Math.round(projectile.x),
                                y: Math.round(projectile.y),
                                size: Math.round(projectile.size),
                                angle: projectile.angle
                            }, {
                                id: "StringUTF8",
                                flags: "Uint8",
                                x: "Int32",
                                y: "Int32",
                                size: "Uint8",
                                angle: "Float32",
                                index: "Int8"
                            });
                        }
                        writer.setStringUTF8(projectile.id.toString());
                        writer.setUint8(bitflag({
                            hit: (Date.now() - projectile.health.lastHit) < 100
                        }));
                        writer.setUint32(Math.round(projectile.x));
                        writer.setUint32(Math.round(projectile.y));
                        writer.setUint8(projectile.size);
                        writer.setFloat32(projectile.angle);
                        writer.setInt8(projectile.index || 0);
                    }
                }
                for (let i = 0; i < data.mobs.length; i ++) {
                    let mob = data.mobs[i];
                    if (config.packetDebugger) {
                        protocol.packetDebugger({
                            id: mob.id.toString(),
                            flags: bitflag({
                                hit: (Date.now() - mob.health.lastHit) < 100,
                                poisoned: !!mob.poisoned
                            }),
                            x: Math.round(mob.x),
                            y: Math.round(mob.y),
                            size: Math.round(mob.size),
                            index: mob.type.index,
                            angle: mob.angle,
                            projectiles: mob.projectiles.filter(r => !!r && r.health.check()).length
                        }, {
                            id: "StringUTF8",
                            flags: "Uint8",
                            x: "Int32",
                            y: "Int32",
                            size: "Uint8",
                            index: "Uint8",
                            angle: "Float32",
                            projectiles: "Uint8"
                        });
                    }
                    writer.setStringUTF8(mob.id.toString());
                    writer.setUint8(bitflag({
                        hit: (Date.now() - mob.health.lastHit) < 100,
                        poisoned: !!mob.poisoned
                    }));
                    writer.setUint32(Math.round(mob.x));
                    writer.setUint32(Math.round(mob.y));
                    writer.setUint8(mob.size);
                    writer.setUint8(mob.type.index);
                    writer.setFloat32(mob.angle);
                    writer.setUint8(mob.projectiles.filter(r => !!r && r.health.check()).length);
                    for (let j = 0, l = mob.projectiles.length; j < l; j ++) {
                        let projectile = mob.projectiles[j];
                        if (!projectile.health.check()) {
                            continue;
                        }
                        if (config.packetDebugger) {
                            protocol.packetDebugger({
                                id: projectile.id.toString(),
                                flags: bitflag({
                                    hit: (Date.now() - projectile.health.lastHit) < 100
                                }),
                                x: Math.round(projectile.x),
                                y: Math.round(projectile.y),
                                size: Math.round(projectile.size),
                                angle: projectile.angle
                            }, {
                                id: "StringUTF8",
                                flags: "Uint8",
                                x: "Int32",
                                y: "Int32",
                                size: "Uint8",
                                angle: "Float32"
                            });
                        }
                        writer.setStringUTF8(projectile.id.toString());
                        writer.setUint8(bitflag({
                            hit: (Date.now() - projectile.health.lastHit) < 100
                        }));
                        writer.setUint32(Math.round(projectile.x));
                        writer.setUint32(Math.round(projectile.y));
                        writer.setUint8(projectile.size);
                        writer.setFloat32(projectile.angle);
                    }
                }
                for (let i = 0; i < data.drops.length; i ++) {
                    let drop = data.drops[i];
                    if (config.packetDebugger) {
                        protocol.packetDebugger({
                            id: drop.id.toString(),
                            x: Math.round(drop.x),
                            y: Math.round(drop.y),
                            size: Math.round(drop.size),
                            index: drop.index
                        }, {
                            id: "StringUTF8",
                            x: "Int32",
                            y: "Int32",
                            size: "Uint8",
                            index: "Uint8"
                        });
                    }
                    writer.setStringUTF8(drop.id.toString());
                    writer.setUint32(Math.round(drop.x));
                    writer.setUint32(Math.round(drop.y));
                    writer.setUint8(drop.size);
                    writer.setUint8(drop.index);
                }
            } break;
            case 1: {
                writer.setUint16(Object.keys(entities).length);
                writer.setStringUTF8(world.mspt);
            } break;
            case 2: {
                writer.setUint16(world.width);
                writer.setUint16(world.height);
                writer.setInt8(world.zones.length);
                for (let zone of world.zones) {
                    writer.setStringUTF8(zone.type);
                    writer.setUint16(zone.start);
                    writer.setUint16(zone.end);
                }
            } break;
            case 3: {
                writer.setInt8(data.active.length);
                writer.setInt8(data.stored.length);
                for (let i = 0; i < data.active.length; i ++) {
                    let index = data.active[i];
                    writer.setInt8(index === false ? -1 : +index);
                }
                for (let i = 0; i < data.stored.length; i ++) {
                    let index = data.stored[i];
                    writer.setInt8(index === false ? -1 : +index);
                }
            } break;
        }
        return writer.build().buffer;
    }
    const basicIndex = clientboundPetals.findIndex(e => e.name === "Basic" && e.rarity === "Common");
    class Inventory {
        constructor(socket, body) {
            this.socket = socket;
            this.body = body;
            this.maxActive = 5;
            this.maxStored = 8; 
            this.activeSlots = new Array(this.maxActive).fill(basicIndex);//.map(() => Math.random() * clientboundPetals.length | 0);
            this.storedSlots = new Array(this.maxStored).fill(false);
            this.body.petals.forEach(petal => petal.kill());
            this.body.petals = [];
            for (let i = 0; i < this.activeSlots.length; i ++) {
                this.body.petals.push(new Petal(this.body, 3.5, i, this.activeSlots[i]));
                this.body.petals[this.body.petals.length - 1].makeExtra();
            }
            this.talk();
        }
        talk() {
            this.socket.talk(3, {
                active: this.activeSlots,
                stored: this.storedSlots
            });
        }
        remove(part, index) { // 0 -> Bad | 1 -> Good
            switch (part) {
                case 0: // Delete an active petal
                    // Filter out improper requests
                    if (Math.min(this.maxActive, Math.max(0, +index)) !== index) {
                        return 0;
                    }
                    this.activeSlots[index] = false;
                    this.talk();
                    break;
                case 1: // Delete a stored petal
                    // Filter out improper requests
                    if (Math.min(this.maxStored, Math.max(0, +index)) !== index) {
                        return 0;
                    }
                    this.storedSlots[index] = false;
                    this.talk();
                    break;
                default:
                    return 0;
            }
            return 1;
        }
        swap(activeIndex, storedIndex) { // 0 -> Bad | 1 -> Good
            // Filter out improper requests
            if (Math.min(this.maxActive, Math.max(0, +activeIndex)) !== activeIndex || Math.min(this.maxStored, Math.max(0, +storedIndex)) !== storedIndex) {
                return 0;
            }
            // Don't let them put nothing in their active slot, but don't count it as a violation either
            if (this.storedSlots[storedIndex] === false || this.storedSlots[storedIndex] < 0) {
                return 1;
            }
            // Replace the stored first
            let oldStored = this.storedSlots[storedIndex];
            this.storedSlots[storedIndex] = this.activeSlots[activeIndex];
            // Replace the active
            this.activeSlots[activeIndex] = oldStored;
            // Replace the petal
            if (this.body) {
                let i = this.body.petals.findIndex(petal => petal.slotID === activeIndex);
                let type = clientboundPetals[oldStored];
                if (this.body.petals[i] instanceof Petal) {
                    this.body.petals[i].kill();
                }
                this.body.petals[i] = {
                    isPlaceholder: true,
                    slotID: this.body.petals[i].slotID,
                    from: Date.now(),
                    timer: type.recharge,
                    distance: this.body.petals[i].distance,
                    type: oldStored,
                    parentPetal: null
                };
                for (let petal of this.body.petals) {
                    if (petal.parentPetal === activeIndex && petal.slotID === -1) {
                        // it do be kil
                        petal.kill();
                        this.body.petals = this.body.petals.filter(r => r.id !== petal.id);
                    }
                }
                this.body.petals = this.body.petals.sort(function sortByID(a, b) {
                    return a.id - b.id;
                }).sort(function sortBySlotAndParent(a, b) {
                    let IDa = a.slotID === -1 ? a.parentPetal : a.slotID,
                        IDb = b.slotID === -1 ? b.parentPetal : b.slotID;
                    return IDa - IDb;
                });
            }
            this.talk();
            return 1;
        }
        pickup(drop) {
            let i = this.activeSlots.findIndex(e => e === false || e === -1);
            if (i === -1) {
                i = this.storedSlots.findIndex(e => e === false || e === -1);
                if (i === -1) {
                    return false;
                }
                this.storedSlots[i] = drop.index;
                this.talk();
                return true;
            }
            this.activeSlots[i] = drop.index;
            this.talk();
            return true;
        }
    }
    let socketID = 0;
    function connect(socket, request) {
        socket.binaryType = "arraybuffer";
        socket.cryptoIn = new protocol.CRYPTO(...protocol.keys.inboundKeys);
        socket.cryptoOut = new protocol.CRYPTO(...protocol.keys.outboundKeys);
        socket.id = socketID ++;
        socket.name = request.query ? request.query.name || "Unnamed Flower" : "Unnamed Flower";
        socket.name = util.cleanString(socket.name, 25);
        socket.body = new Flower(Math.random() * world.zones[0].end, Math.random() * world.height, socket);
        socket.body.update();
        socket.body.name = socket.name;
        Object.defineProperty(socket, "identification", {
            get() {
                return `[(${socket.id}) ${socket.name}]`;
            }
        })
        socket.onclose = function() {
            console.log(`Socket ${socket.identification} disconnected!`);
            clients = clients.filter(other => other.id !== socket.id);
            if (socket.body) {
                socket.body.kill();
            }
        }
        socket.onerror = () => {};
        socket.onmessage = function(message) {
            world.bandwidth.count.in(message.data.byteLength);
            const reader = new protocol.Reader(new DataView(socket.cryptoIn.changePacket(new Uint8Array(message.data)).buffer), 0, true);
            switch (reader.getInt8()) {
                case 0:
                    if (socket.body) {
                        let angle = reader.getFloat32(),
                            speed = reader.getFloat32();
                        if (!Number.isFinite(angle) || !Number.isFinite(speed)) {
                            break;
                        }
                        socket.body.acceleration.x = Math.cos(angle);
                        socket.body.acceleration.y = Math.sin(angle);
                        socket.body.speed = 45 * Math.min(1, Math.max(0, speed));
                    }
                    break;
                case 1:
                    if (socket.body) {
                        let flag = reader.getInt8();
                        switch (flag) {
                            case 0: // Normal
                                socket.body.attack = false;
                                socket.body.defend = false;
                                break;
                            case 1: // Attack
                                socket.body.attack = true;
                                socket.body.defend = false;
                                break;
                            case 2: // Defend
                                socket.body.attack = false;
                                socket.body.defend = true;
                                break;
                        }
                    }
                    break;
                case 2:
                    if (socket.body && socket.body.inventory) {
                        let index1 = reader.getInt8(),
                            index2 = reader.getInt8();
                        if (index1 === -1) {
                            socket.body.inventory.remove(1, index2);
                        } else {
                            socket.body.inventory.swap(index1, index2);
                        }
                    }
                    break;
                case 3: {
                    if (socket.body == null || !socket.body.health.check()) {
                        socket.body = new Flower(Math.random() * world.zones[0].end, Math.random() * world.height, socket);
                        socket.body.update();
                        socket.body.name = socket.name;
                        socket.body.inventory = new Inventory(socket, socket.body);
                    }
                } break;
            }
        }
        socket.talk = function(type, data) {
            if (socket.readyState === 1) {
                let packet = new Uint8Array(encode(type, data));
                world.bandwidth.count.out(packet.byteLength);
                socket.send(socket.cryptoOut.changePacket(packet));
            }
        }
        socket.viewWorld = function() {
            socket.talk(0, {
                playerID: socket.body.health.check() ? socket.body.id : -1,
                flowers: Object.values(flowers).filter(flower => Math.abs(flower.x - socket.body.x) <= 2000 && Math.abs(flower.y - socket.body.y) <= 1100),
                mobs: Object.values(mobs).filter(mob => Math.abs(mob.x - socket.body.x) <= 2000 && Math.abs(mob.y - socket.body.y) <= 1100),
                drops: Object.values(drops).filter(drop => Math.abs(drop.x - socket.body.x) <= 2000 && Math.abs(drop.y - socket.body.y) <= 1100)
            });
        }
        socket.sendPing = function() {
            socket.talk(1);
        }
        socket.talk(2);
        socket.body.inventory = new Inventory(socket, socket.body);
        console.log(`Socket ${socket.identification} joined the game!`);
        clients.push(socket);
    }
    return {
        get clients() {
            return clients;
        },
        connect
    }
})();

function purge() {
    for (let id in entities) {
        let entity = entities[id];
        if (entity instanceof Flower) {
            if (!entity.health.check()) {
                entity.kill();
                delete entities[id];
                delete flowers[id];
            }
        }
        if (entity instanceof Petal || entity instanceof Projectile) {
            if (!entity.health.check()) {
                entity.kill();
                delete entities[id];
            }
        }
        if (entity instanceof Mob) {
            if (!entity.health.check()) {
                entity.kill();
                delete entities[id];
                delete mobs[id];
            }
        }
        if (entity instanceof Drop) {
            if (entity.timer <= 0 || !entity.health.check()) {
                entity.kill();
                delete entities[id];
                delete drops[id];
            }
        }
    }
}

let updateLoopDelta = 0,
    updateLoopTick = 1000 / 60;
setInterval(function() {
    if (Date.now() - updateLoopDelta < updateLoopTick) {
        return;
    }
    for (let client of sockets.clients) {
        client.viewWorld();
    }
    for (let bot of bots) {
        bot.update();
    }
    updateLoopDelta = Date.now();
}, updateLoopTick);

setInterval(function() {
    for (let client of sockets.clients) {
        client.sendPing();
    }
    for (let i = bots.length; i < 5; i ++) {
        if (Math.random() > .95) {
            new Bot();
        }
    }
    let census = {};
    for (let id in mobs) {
        let mob = mobs[id];
        census[mob.zone] = (census[mob.zone] || 0) + 1;
    }
    for (let zone of world.zones) {
        if (zone.spawning) {
            for (let i = (census[zone.type] || 0); i < zone.spawning.maximum; i ++) {
                if (Math.random() > 0) {
                    let chosenType,
                        validTypes = Object.keys(zone.spawning.possible),
                        i = 1000;
                    while (chosenType = util.getRarity(), !validTypes.includes(chosenType) && i -- > 0) {}
                    if (!validTypes.includes(chosenType)) {
                        continue;
                    }
                    let possibleSpawns = zone.spawning.possible[chosenType];
                    let mySpawns = mobSpawnTable.filter(entry => entry.rarity === chosenType && possibleSpawns.includes(entry.name));
                    if (!mySpawns.length) {
                        continue;
                    }
                    let mob = new Mob(zone.start + Math.random() * (zone.end - zone.start), Math.random() * world.height, util.choose(mySpawns));
                    mob.zone = zone.type;
                }
            }
        }
    }
}, 750);

let gameLoopDelta = 0,
    gameLoopTick = 1000 / 60;
setInterval(function() {
    if (Date.now() - gameLoopDelta < gameLoopTick * .9) {
        return;
    }
    let start = performance.now();
    for (let id in mobs) {
        let mob = mobs[id];
        mob.update();
    }
    for (let id in flowers) {
        let flower = flowers[id];
        flower.update();
    }
    for (let id in drops) {
        drops[id].update();
    }
    grid.update();
    let pairs = grid.queryForCollisionPairs();
    for (let [instance, other] of pairs) {
        if (instance.source === other.source || instance.collisionArray.includes(other.id) || other.collisionArray.includes(instance.id)) {
            continue;
        }
        // Check collision
        if (util.getDistance(instance, other) > instance.size + other.size || (instance instanceof Mob && other instanceof Projectile) || (other instanceof Mob && instance instanceof Projectile)) {
            continue;
        }
        if ((instance instanceof Drop && other instanceof Flower) || (instance instanceof Flower && other instanceof Drop)) {
            let drop = instance instanceof Drop ? instance : other,
                player = instance instanceof Drop ? other : instance;
            if (player.inventory) {
                if (player.inventory.pickup(drop)) {
                    drop.kill();
                }
            } else {
                drop.kill();
            }
            continue;
        } else if (instance instanceof Drop || other instanceof Drop) {
            continue;
        }
        if (!instance.health.check() || !other.health.check() || instance.range <= 0 || other.range <= 0) {
            continue;
        }
        const angle = Math.atan2(instance.y - other.y, instance.x - other.x);
        instance.velocity.x += Math.cos(angle) * (other.size / instance.size) * instance.pushability;
        instance.velocity.y += Math.sin(angle) * (other.size / instance.size) * instance.pushability;
        other.velocity.x -= Math.cos(angle) * (instance.size / other.size) * other.pushability;
        other.velocity.y -= Math.sin(angle) * (instance.size / other.size) * other.pushability;
        instance.collisionArray.push(other.id);
        other.collisionArray.push(instance.id);
        if (instance instanceof Mob && other instanceof Mob) {
            continue;
        }
        instance.health.damage(other.damage);
        other.health.damage(instance.damage);
        if (instance.poisonToApply) {
            other.poisoned = {
                tick: 0,
                interval: instance.poisonToApply[0],
                time: instance.poisonToApply[1],
                intensity: instance.poisonToApply[2]
            };
        }
        if (other.poisonToApply) {
            instance.poisoned = {
                tick: 0,
                interval: other.poisonToApply[0],
                time: other.poisonToApply[1],
                intensity: other.poisonToApply[2]
            };
        }
        /*if (!instance.health.check()) {
            instance.kill();
        }
        if (!other.health.check()) {
            other.kill();
        }*/
    }
    purge();
    world.mspt = (performance.now() - start).toFixed(1);
    world.frames ++;
    gameLoopDelta = Date.now();
}, gameLoopTick);

const app = express();
app.use(cors());
expressWS(app);

app.get("/", (function() {
    const build = require("./build.js");
    const src = build({
        js: {
            "INBOUND_KEYS": `INBOUND_KEYS = ${JSON.stringify(protocol.keys.outboundKeys)}`,
            "OUTBOUND_KEYS": `OUTBOUND_KEYS = ${JSON.stringify(protocol.keys.inboundKeys)}`,
            "XKEY": `XKEY = BigInt(${protocol.keys.x})`,
            "YKEY": `YKEY = BigInt(${protocol.keys.y})`,
            "MODKEY": `MODKEY = BigInt(${protocol.keys.mod})`,
            "PETAL_CONFIG": `PETAL_CONFIG = JSON.parse(\`${JSON.stringify(clientboundPetals)}\`)`,
            "MOB_CONFIG": `MOB_CONFIG = JSON.parse(\`${JSON.stringify(clientboundMobs)}\`)`
        }
    });
    return function(request, response) {
        response.sendFile(src);
    }
})());

app.use(express.static(__dirname + "/public"));
app.ws("/", sockets.connect);
app.listen(world.port, () => console.log("Server listening on port", world.port));

discord.addCommand("players", function(message, args, bot) {
    message.channel.send({
        embeds: [discord.createEmbed({
            title: `Playerlist (${sockets.clients.length})`,
            fields: sockets.clients.map(r => {
                return {
                    name: r.identification,
                    value: r.body ? r.body.health.percent + "% Health" : "Not spawned in"
                };
            })
        })]
    });
});

discord.addCommand("ping", function(message, args, bot) {
    message.channel.send({
        embeds: [discord.createEmbed({
            title: `Ping`,
            fields: [{
                name: "Players",
                value: sockets.clients.length + ""
            }, {
                name: "Entities",
                value: Object.keys(entities).length + ""
            }, {
                name: "Tick Speed",
                value: world.mspt + "ms"
            }, {
                name: "Server (FPS)",
                value: world.fps + ""
            }, {
                name: "Total Bandwidth Usage",
                value: `${world.bandwidth.total.in.toFixed(3)}MB In | ${world.bandwidth.total.out.toFixed(3)}MB Out`
            }, {
                name: "Bandwidth Usage (Per Second)",
                value: `${world.bandwidth.second.in}B In | ${world.bandwidth.second.out}B Out`
            }]
        })]
    });
});

discord.addCommand("clearBuilds", function(message, args, bot) {
    if (discord.checkPermissions(message) !== 3) {
        return discord.unauth(message);
    }
    let files = fs.readdirSync(__dirname + "/builds"),
        success = [];
    for (let file of files) {
        try {
            fs.unlinkSync(__dirname + "/builds/" + file);
            success.push(file);
        } catch(e) {}
    }
    message.channel.send({
        embeds: [discord.createEmbed({
            title: "clearBuilds",
            fields: [{
                name: "Files removed",
                value: success.length + ""
            }, {
                name: "File names",
                value: success.join(", ") + ""
            }]
        })]
    });
});

/*discord.addCommand("compile", function(message, args, bot) {
    let start = performance.now();
    let compileResult = compile(args[0], args[1]);
    let end = performance.now() - start;
    message.channel.send({
        embeds: [discord.createEmbed({
            title: `Compile`,
            fields: [{
                name: "Success",
                value: !!compileResult + ""
            }, {
                name: "Time (ms)",
                value: end.toFixed(3) + ""
            }]
        })]
    });
});*/