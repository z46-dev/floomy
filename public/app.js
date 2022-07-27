(function () {
    Math.TAU = Math.PI * 2;
    Math.HPI = Math.PI / 2;
    function mixColors(colorA, colorB, amount) {
        const [rA, gA, bA] = colorA.match(/\w\w/g).map((c) => parseInt(c, 16));
        const [rB, gB, bB] = colorB.match(/\w\w/g).map((c) => parseInt(c, 16));
        const r = Math.round(rA + (rB - rA) * amount).toString(16).padStart(2, '0');
        const g = Math.round(gA + (gB - gA) * amount).toString(16).padStart(2, '0');
        const b = Math.round(bA + (bB - bA) * amount).toString(16).padStart(2, '0');
        return '#' + r + g + b;
    }
    const colors = {
        blue: "#00b0e1",
        cyan: "#00e1e1",
        red: "#f04f54",
        green: "#00e06c",
        purple: "#be7ff5",
        gold: "#ffe46b",
        pink: "#f177dd",
        grey: "#999999",
        barGreen: "#86c280",
        barGrey: "#545454",
        neonGreen: "#8aff69",
        petalWhite: "#eeeeee",
        black: "#555555",
        hit: "#FF8888",
        backgroundA: mixColors("#00e06c", "#000000", 0.2),
        backgroundB: mixColors("#00e06c", "#000000", 0.3),
        backgroundZones: {
            easy: {
                light: "#1ea761",
                dark: "#1b9757"
            },
            medium: {
                light: "#decf7c",
                dark: "#c8bb70"
            },
            hard: {
                light: "#b06655",
                dark: "#9f5c4d"
            },
            unknown: {
                light: "#4d5e56",
                dark: "#45544d"
            }
        }
    };
    let PETAL_CONFIG, MOB_CONFIG, global = {
        gameStart: false,
        rarityColors: {
            "Common": mixColors(colors.green, "#FFFFFF", .25),
            "Unusual": mixColors(colors.gold, "#FFFFFF", .25),
            "Rare": mixColors(colors.blue, "#FFFFFF", .25),
            "Epic": mixColors(colors.purple, "#FFFFFF", .25),
            "Legendary": mixColors(colors.red, "#FFFFFF", .25),
            "Mythical": mixColors(colors.cyan, "#FFFFFF", .25),
            "Unique": mixColors(colors.pink, "#FFFFFF", .25)
        },
        screenRatio: window.innerWidth * devicePixelRatio / 1920
    };

    function wait(time) {
        return new Promise(resolve => {
            setTimeout(resolve, time);
        });
    }

    window.onload = async function () {
        await wait(Math.random() * 3000);
        document.body.classList.add("loaded");
        document.getElementsByClassName("holder")[0].classList.add("animating");
        document.querySelector(".loadingDiv").style.display = "none";
        document.querySelector(".mainMenu").style.display = "block";
        document.getElementById("playerNameInput").value = localStorage.playerName || "";
        // Background
        if (storage) {
            let canvas = document.getElementById("menuCanvas"),
                ctx = canvas.getContext("2d");

            function onResize() {
                canvas.width = innerWidth * devicePixelRatio;
                canvas.height = innerHeight * devicePixelRatio;
                global.screenRatio = window.innerWidth * devicePixelRatio / 1920;
            }

            onResize();

            window.addEventListener("resize", onResize);

            let petals = [],
                choices = storage.get("unlockedPetals") || ["Basic-Common"],
                petalID = 0,
                rarityTable = {
                    "Common": 100,
                    "Unusual": 40,
                    "Rare": 25,
                    "Epic": 10,
                    "Legendary": 5,
                    "Mythical": 1,
                    "Unique": .1
                },
                raritySeed = 10;

            choices = choices.filter(choice => PETAL_CONFIG.findIndex(petal => [petal.name, petal.rarity].join("-") === choice) > -1);

            choices = (() => {
                let output = [];
                for (let choice of choices) {
                    let rarity = choice.split("-").pop();
                    if (rarityTable[rarity]) {
                        for (let i = 0; i < rarityTable[rarity] * raritySeed; i++) {
                            output.push(choice);
                        }
                    }
                }
                return output;
            })();

            function draw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (petals.length < 150) {
                    let sort = false;
                    for (let i = 0; i < 150 - petals.length; i++) {
                        if (Math.random() > .999) {
                            let choice = choices[Math.random() * choices.length | 0],
                                y = Math.random() * canvas.height;
                            petals.push({
                                id: petalID++,
                                x: -10,
                                y: y,
                                yy: y,
                                z: Math.random() * 5,
                                yDir: Math.random() > .5 ? 1 : -1,
                                speed: 1 + Math.random() * 1.5,
                                angle: 0,
                                _petal: PETAL_CONFIG.find(r => [r.name, r.rarity].join("-") === choice)
                            });
                            sort = true;
                        }
                    }
                    if (sort) {
                        petals = petals.sort((a, b) => a.z - b.z);
                    }
                }
                for (let petal of petals) {
                    petal.x += petal.speed;
                    if (petal.x >= canvas.width + 10) {
                        petals = petals.filter(other => other.id !== petal.id);
                        continue;
                    }
                    if (Math.abs((petal.y + petal.yDir) - petal.yy) > ((petal.z + 1) / 5 * 50) * (petal._petal.size || .8) * 2) {
                        petal.yDir *= -1;
                    }
                    petal.y += petal.yDir * .1;
                    petal.angle += .025 * (petal.speed * .667);
                    drawPolygon(ctx, petal.x, petal.y, petal._petal.shape || 0, ((petal.z + 1) / 5 * 40) * (petal._petal.size || .8), petal.angle, colors[petal._petal.color || "petalWhite"], mixColors(colors[petal._petal.color || "petalWhite"], "#000000", .25), petal.id);
                }
                requestAnimationFrame(draw);
            }
            if (!global.gameStart) {
                setTimeout(draw, 3000);
            }
        }
    }
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    function onResize() {
        canvas.width = innerWidth * devicePixelRatio;
        canvas.height = innerHeight * devicePixelRatio;
    }

    onResize();

    window.addEventListener("resize", onResize);

    document.getElementById("playButton").onclick = () => {
        global.gameStart = true;
        document.querySelector(".mainMenu").style.display = "none";
        canvas.style.display = "block";
        gameLoop();
        class Writer {
            constructor(littleEndian) {
                this.writer = true;
                this.tmpBuf = new DataView(new ArrayBuffer(8));
                this._e = littleEndian;
                this.reset();
                return this;
            }
            reset(littleEndian = this._e) {
                this._e = littleEndian;
                this._b = [];
                this._o = 0;
            }
            setUint8(a) {
                if (a >= 0 && a < 256) this._b.push(a);
                return this;
            }
            setInt8(a) {
                if (a >= -128 && a < 128) this._b.push(a);
                return this;
            }
            setUint16(a) {
                this.tmpBuf.setUint16(0, a, this._e);
                this._move(2);
                return this;
            }
            setInt16(a) {
                this.tmpBuf.setInt16(0, a, this._e);
                this._move(2);
                return this;
            }
            setUint32(a) {
                this.tmpBuf.setUint32(0, a, this._e);
                this._move(4);
                return this;
            }
            setInt32(a) {
                this.tmpBuf.setInt32(0, a, this._e);
                this._move(4);
                return this;
            }
            setFloat32(a) {
                this.tmpBuf.setFloat32(0, a, this._e);
                this._move(4);
                return this;
            }
            setFloat64(a) {
                this.tmpBuf.setFloat64(0, a, this._e);
                this._move(8);
                return this;
            }
            _move(b) {
                for (let i = 0; i < b; i++) this._b.push(this.tmpBuf.getUint8(i));
            }
            setStringUTF8(s) {
                const bytesStr = unescape(encodeURIComponent(s));
                for (let i = 0, l = bytesStr.length; i < l; i++) this._b.push(bytesStr.charCodeAt(i));
                this._b.push(0);
                return this;
            }
            build() {
                return new Uint8Array(this._b);
            }
        }

        class Reader {
            constructor(view, offset, littleEndian) {
                this.reader = true;
                this._e = littleEndian;
                if (view) this.repurpose(view, offset);
            }
            repurpose(view, offset) {
                this.view = view;
                this._o = offset || 0;
            }
            getUint8() {
                return this.view.getUint8(this._o++, this._e);
            }
            getInt8() {
                return this.view.getInt8(this._o++, this._e);
            }
            getUint16() {
                return this.view.getUint16((this._o += 2) - 2, this._e);
            }
            getInt16() {
                return this.view.getInt16((this._o += 2) - 2, this._e);
            }
            getUint32() {
                return this.view.getUint32((this._o += 4) - 4, this._e);
            }
            getInt32() {
                return this.view.getInt32((this._o += 4) - 4, this._e);
            }
            getFloat32() {
                return this.view.getFloat32((this._o += 4) - 4, this._e);
            }
            getFloat64() {
                return this.view.getFloat64((this._o += 8) - 8, this._e);
            }
            getStringUTF8() {
                let s = '',
                    b;
                while ((b = this.view.getUint8(this._o++)) !== 0) s += String.fromCharCode(b);
                return decodeURIComponent(escape(s));
            }
        }
        let INBOUND_KEYS, OUTBOUND_KEYS, XKEY, YKEY, MODKEY;
        class CRYPTO {
            constructor() {
                if (arguments[0] instanceof Array) {
                    this.key = arguments[0][0];
                    this.add = arguments[0][1];
                    this.multiply = arguments[0][2];
                    this.modulo = arguments[0][3];
                } else if (typeof arguments[0] === "string") {
                    const args = arguments[0].split(",").map(r => +r);
                    this.key = args[0];
                    this.add = args[1];
                    this.multiply = args[2];
                    this.modulo = args[3];
                } else {
                    this.key = arguments[0];
                    this.add = arguments[1];
                    this.multiply = arguments[2];
                    this.modulo = arguments[3];
                }
            }
            changePacket(packet) {
                for (let i = 0, packetlength = packet.length; i < packetlength; i++) {
                    packet[i] = packet[i] ^ (Number(this.key) % 256);
                    this.key = this.changeKey(this.key, this.add, this.multiply, this.modulo);
                }
                return packet;
            }
            changeKey(originalKey, multiply, modulo, add) {
                return ((BigInt(originalKey) + BigInt(add)) * BigInt(multiply)) % BigInt(modulo);
            }
        }
        const cryptoOut = new CRYPTO(OUTBOUND_KEYS);
        const cryptoIn = new CRYPTO(INBOUND_KEYS);
        let playerNameInput = document.getElementById("playerNameInput");
        localStorage.playerName = playerNameInput.value;
        let socket = new WebSocket(`${location.protocol.replace("http", "ws")}//${location.host}/?name=${playerNameInput.value}`);
        world.socket = socket;
        socket.binaryType = "arraybuffer";
        socket.open = false;
        socket.onopen = function () {
            socket.open = true;
            socket.onclose = function () {
                socket.open = false;
                world.animationDirection = 0;
            }
            socket.talk = function (type, ...data) {
                if (!socket.open) {
                    return;
                }
                const writer = new Writer(true);
                writer.setInt8(type);
                switch (type) {
                    case 0:
                        writer.setFloat32(data[0]);
                        writer.setFloat32(data[1]);
                        break;
                    case 1:
                        writer.setInt8(data[0]);
                        break;
                    case 2:
                        writer.setInt8(data[0]);
                        writer.setInt8(data[1]);
                        break;
                }
                let output = new Uint8Array(writer.build().buffer);
                world.bandwidth.outbound += output.byteLength;
                socket.send(cryptoOut.changePacket(output));
            }
            socket.onmessage = function (message) {
                world.bandwidth.inbound += message.data.byteLength;
                const reader = new Reader(new DataView(cryptoIn.changePacket(new Uint8Array(message.data)).buffer), 0, true);
                switch (reader.getInt8()) {
                    case 0: {
                        world.playerID = +reader.getStringUTF8();
                        let flowers = [],
                            mobs = [],
                            drops = [],
                            flowerAmount = reader.getUint8(),
                            mobAmount = reader.getUint16(),
                            dropAmount = reader.getUint16();
                        for (let i = 0; i < flowerAmount; i++) {
                            let id = +reader.getStringUTF8(),
                                index = world.flowers.findIndex(entity => entity.id === id);
                            if (index > -1) { // Update
                                let flowerFlags = reader.getUint8();
                                world.flowers[index].hit = flowerFlags & 1;
                                world.flowers[index].poisoned = flowerFlags & 2;
                                world.flowers[index].rx = reader.getInt16();
                                world.flowers[index].ry = reader.getInt16();
                                world.flowers[index].size = reader.getUint8();
                                world.flowers[index].health.real = reader.getUint8() / 100;
                                world.flowers[index].fade = Math.min(1, world.flowers[index].fade + .2);
                                let petals = reader.getUint8(),
                                    projectiles = reader.getUint8(),
                                    projectileIDs = [],
                                    petalIDs = [];
                                for (let j = 0; j < petals; j++) {
                                    let id2 = +reader.getStringUTF8(),
                                        index2 = world.flowers[index].petals.findIndex(petal => petal.id === id2);
                                    if (index2 > -1) { // Update
                                        let petalFlags = reader.getUint8();
                                        world.flowers[index].petals[index2].hit = petalFlags & 1;
                                        world.flowers[index].petals[index2].rx = reader.getInt16();
                                        world.flowers[index].petals[index2].ry = reader.getInt16();
                                        world.flowers[index].petals[index2].size = reader.getUint8();
                                        world.flowers[index].petals[index2].fade = Math.min(1, world.flowers[index].petals[index2].fade + .2);
                                        let index3 = reader.getInt8();
                                        if (world.flowers[index].petals[index2]._petal.index !== index3) {
                                            world.flowers[index].petals[index2].index = PETAL_CONFIG[index3] || PETAL_CONFIG[0];
                                        }
                                    } else { // New info
                                        let petalFlags = reader.getUint8(),
                                            hit = petalFlags & 1,
                                            rx = reader.getInt16(),
                                            ry = reader.getInt16();
                                        world.flowers[index].petals.push({
                                            id: id2,
                                            x: rx,
                                            rx: rx,
                                            y: ry,
                                            ry: ry,
                                            hit: hit,
                                            size: reader.getUint8(),
                                            _petal: PETAL_CONFIG[reader.getInt8()] || PETAL_CONFIG[0],
                                            fade: .1,
                                            creation: Date.now()
                                        });
                                    }
                                    petalIDs.push(id2);
                                }
                                for (let j = 0; j < projectiles; j++) {
                                    let id2 = +reader.getStringUTF8(),
                                        index2 = world.flowers[index].projectiles.findIndex(petal => petal.id === id2);
                                    if (index2 > -1) { // Update
                                        let petalFlags = reader.getUint8();
                                        world.flowers[index].projectiles[index2].hit = petalFlags & 1;
                                        world.flowers[index].projectiles[index2].rx = reader.getInt16();
                                        world.flowers[index].projectiles[index2].ry = reader.getInt16();
                                        world.flowers[index].projectiles[index2].size = reader.getUint8();
                                        world.flowers[index].projectiles[index2].rangle = reader.getFloat32();
                                        world.flowers[index].projectiles[index2].fade = Math.min(1, world.flowers[index].projectiles[index2].fade + .2);
                                        world.flowers[index].projectiles[index2].projectile = (PETAL_CONFIG[reader.getInt8()] || PETAL_CONFIG[0]).frag;
                                    } else { // New info
                                        let projectile = {};
                                        projectile.id = id2;
                                        let projectileFlags = reader.getUint8();
                                        projectile.hit = projectileFlags & 1;
                                        projectile.x = projectile.rx = reader.getInt16();
                                        projectile.y = projectile.ry = reader.getInt16();
                                        projectile.size = reader.getUint8();
                                        projectile.angle = projectile.rangle = reader.getFloat32();
                                        projectile.fade = .1;
                                        projectile.creation = Date.now();
                                        projectile.projectile = (PETAL_CONFIG[reader.getInt8()] || PETAL_CONFIG[0]).frag;
                                        world.flowers[index].projectiles.push(projectile);
                                    }
                                    projectileIDs.push(id2);
                                }
                                for (let j = 0, l = world.flowers[index].projectiles.length; j < l; j++) {
                                    if (!projectileIDs.includes(world.flowers[index].projectiles[j].id)) {
                                        world.flowers[index].projectiles[j].fade -= .1;
                                    }
                                }
                                world.flowers[index].projectiles = world.flowers[index].projectiles.filter(projectile => projectile.fade > 0);
                                for (let j = 0, l = world.flowers[index].petals.length; j < l; j++) {
                                    if (!petalIDs.includes(world.flowers[index].petals[j].id)) {
                                        world.flowers[index].petals[j].fade -= .1;
                                    }
                                }
                                world.flowers[index].petals = world.flowers[index].petals.filter(petal => petal.fade > 0);
                            } else { // New
                                let flowerFlags = reader.getUint8(),
                                    rx = reader.getInt16(),
                                    ry = reader.getInt16(),
                                    projectileAmount = 0;
                                world.flowers.push({
                                    id: id,
                                    x: rx,
                                    rx: rx,
                                    y: ry,
                                    ry: ry,
                                    hit: flowerFlags & 1,
                                    poisoned: flowerFlags & 2,
                                    size: reader.getUint8(),
                                    health: (() => {
                                        let amount = reader.getUint8() / 100;
                                        return {
                                            fade: amount < .995,
                                            real: amount,
                                            display: amount
                                        };
                                    })(),
                                    petals: (() => { // fix cache
                                        let output = [],
                                            amount = reader.getUint8();
                                            projectileAmount = reader.getUint8();
                                        for (let i = 0; i < amount; i++) {
                                            let petal = {};
                                            petal.id = +reader.getStringUTF8();
                                            let petalFlags = reader.getUint8();
                                            petal.hit = petalFlags & 1;
                                            petal.x = petal.rx = reader.getInt16();
                                            petal.y = petal.ry = reader.getInt16();
                                            petal.size = reader.getUint8();
                                            petal._petal = PETAL_CONFIG[reader.getInt8()] || PETAL_CONFIG[0];
                                            petal.fade = .1;
                                            petal.creation = Date.now();
                                            output.push(petal);
                                        }
                                        return output;
                                    })(),
                                    projectiles: (() => {
                                        let output = [],
                                            amount = projectileAmount;
                                        for (let i = 0; i < amount; i++) {
                                            let projectile = {};
                                            projectile.id = +reader.getStringUTF8();
                                            let projectileFlags = reader.getUint8();
                                            projectile.hit = projectileFlags & 1;
                                            projectile.x = projectile.rx = reader.getInt16();
                                            projectile.y = projectile.ry = reader.getInt16();
                                            projectile.size = reader.getUint8();
                                            projectile.angle = projectile.rangle = reader.getFloat32();
                                            projectile.projectile = (PETAL_CONFIG[reader.getInt8()] || PETAL_CONFIG[0]).frag;
                                            projectile.fade = .1;
                                            projectile.creation = Date.now();
                                            output.push(projectile);
                                        }
                                        return output;
                                    })(),
                                    fade: .1
                                });
                            }
                            // Add it so we can filter those who shouldn't be alive
                            flowers.push(id);
                        }
                        for (let i = 0; i < mobAmount; i++) {
                            let id = +reader.getStringUTF8(),
                                index = world.mobs.findIndex(mob => mob.id === id),
                                flags = reader.getUint8();
                            if (index > -1) { // Update
                                world.mobs[index].hit = flags & 1;
                                world.mobs[index].poisoned = flags & 2;
                                world.mobs[index].rx = reader.getInt16();
                                world.mobs[index].ry = reader.getInt16();
                                world.mobs[index].size = reader.getUint8();
                                world.mobs[index]._mob = MOB_CONFIG[reader.getUint8()] || MOB_CONFIG[0];
                                world.mobs[index].rangle = reader.getFloat32();
                                world.mobs[index].fade = Math.min(1, world.mobs[index].fade + .2);
                                let projectiles = reader.getUint8(),
                                    projectileIDs = [];
                                for (let j = 0; j < projectiles; j++) {
                                    let id2 = +reader.getStringUTF8(),
                                        index2 = world.mobs[index].projectiles.findIndex(petal => petal.id === id2);
                                    if (index2 > -1) { // Update
                                        let petalFlags = reader.getUint8();
                                        world.mobs[index].projectiles[index2].hit = petalFlags & 1;
                                        world.mobs[index].projectiles[index2].rx = reader.getInt16();
                                        world.mobs[index].projectiles[index2].ry = reader.getInt16();
                                        world.mobs[index].projectiles[index2].size = reader.getUint8();
                                        world.mobs[index].projectiles[index2].rangle = reader.getFloat32();
                                        world.mobs[index].projectiles[index2].fade = Math.min(1, world.mobs[index].projectiles[index2].fade + .2);
                                    } else { // New info
                                        let projectile = {};
                                        projectile.id = id2;
                                        let projectileFlags = reader.getUint8();
                                        projectile.hit = projectileFlags & 1;
                                        projectile.x = projectile.rx = reader.getInt16();
                                        projectile.y = projectile.ry = reader.getInt16();
                                        projectile.size = reader.getUint8();
                                        projectile.angle = projectile.rangle = reader.getFloat32();
                                        projectile.fade = .1;
                                        projectile.creation = Date.now();
                                        world.mobs[index].projectiles.push(projectile);
                                    }
                                    projectileIDs.push(id2);
                                }
                                for (let j = 0, l = world.mobs[index].projectiles.length; j < l; j++) {
                                    if (!projectileIDs.includes(world.mobs[index].projectiles[j].id)) {
                                        world.mobs[index].projectiles[j].fade -= .1;
                                    }
                                }
                                world.mobs[index].projectiles = world.mobs[index].projectiles.filter(projectile => projectile.fade > 0);
                            } else { // New
                                let x = reader.getInt16(),
                                    y = reader.getInt16();
                                world.mobs.push({
                                    id: id,
                                    x: x,
                                    y: y,
                                    rx: x,
                                    ry: y,
                                    hit: flags & 1,
                                    poisoned: flags & 2,
                                    size: reader.getUint8(),
                                    fade: .1,
                                    _mob: MOB_CONFIG[reader.getUint8()] || MOB_CONFIG[0],
                                    angle: 0,
                                    rangle: reader.getFloat32(),
                                    projectiles: (() => {
                                        let output = [],
                                            amount = reader.getUint8();
                                        for (let i = 0; i < amount; i++) {
                                            let projectile = {};
                                            projectile.id = +reader.getStringUTF8();
                                            let projectileFlags = reader.getUint8();
                                            projectile.hit = projectileFlags & 1;
                                            projectile.x = projectile.rx = reader.getInt16();
                                            projectile.y = projectile.ry = reader.getInt16();
                                            projectile.size = reader.getUint8();
                                            projectile.angle = projectile.rangle = reader.getFloat32();
                                            projectile.fade = .1;
                                            projectile.creation = Date.now();
                                            output.push(projectile);
                                        }
                                        return output;
                                    })()
                                });
                            }
                            mobs.push(id);
                        }
                        for (let i = 0; i < dropAmount; i++) {
                            let id = +reader.getStringUTF8(),
                                index = world.drops.findIndex(drop => drop.id === id);
                            if (index > -1) { // Update
                                world.drops[index].rx = reader.getInt16();
                                world.drops[index].ry = reader.getInt16();
                                world.drops[index].size = reader.getUint8();
                                world.drops[index].index = reader.getUint8();
                                world.drops[index].fade = Math.min(1, world.mobs[index].fade + .2);
                            } else { // New
                                let x = reader.getInt16(),
                                    y = reader.getInt16();
                                world.drops.push({
                                    id: id,
                                    x: x,
                                    y: y,
                                    rx: x,
                                    ry: y,
                                    size: reader.getUint8(),
                                    index: reader.getUint8(),
                                    fade: .1,
                                    angle: -Math.PI * .175 + (Math.random() * .25) * Math.PI,
                                    creation: Date.now()
                                });
                            }
                            drops.push(id);
                        }
                        world.flowers = world.flowers.filter(entry => flowers.includes(entry.id));
                        world.mobs = world.mobs.filter(entry => mobs.includes(entry.id));
                        world.drops = world.drops.filter(entry => drops.includes(entry.id));
                    } break;
                    case 1: {
                        world.serverEntities = reader.getUint16();
                        world.mspt = reader.getStringUTF8();
                        world.latency = Date.now() - world.lastUplink - 500;
                        world.lastUplink = Date.now();
                    } break;
                    case 2: {
                        world.width = reader.getUint16();
                        world.height = reader.getUint16();
                        world.zones = [];
                        for (let i = 0, l = reader.getInt8(); i < l; i++) {
                            world.zones.push({
                                type: reader.getStringUTF8(),
                                start: reader.getUint16(),
                                end: reader.getUint16()
                            });
                        }
                    } break;
                    case 3: {
                        let maxActive = reader.getInt8(),
                            maxStored = reader.getInt8();
                        world.inventory.active = new Array(maxActive).fill(0).map(() => reader.getInt8());
                        world.inventory.stored = new Array(maxStored).fill(0).map(() => reader.getInt8());
                    } break;
                }
            }
            document.addEventListener("mousemove", function (event) {
                world.mouse = {
                    x: event.x * devicePixelRatio,
                    y: event.y * devicePixelRatio
                };
            });
            document.addEventListener("mousedown", function (event) {
                let regionClicked = false;
                for (let region of world.clickableRegions) {
                    let x = event.clientX * devicePixelRatio,
                        y = event.clientY * devicePixelRatio;
                    if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) {
                        regionClicked = true;
                        region.click();
                    }
                }
                if (!regionClicked) {
                    switch (event.button) {
                        case 0:
                            socket.talk(1, 1);
                            break;
                        case 2:
                            socket.talk(1, 2);
                            break;
                    }
                }
            });
            document.addEventListener("mouseup", function () {
                socket.talk(1, 0);
            });
            document.addEventListener("keydown", function(event) {
                // I DON'T CARE IT'S DEPRICATIONED
                if (Math.min(57, Math.max(48, event.keyCode)) === event.keyCode) {
                    // Hey it's an inventory key
                    switch (world.inventory.state) {
                        case 0: // Not in inventory state
                            if (event.keyCode - 48 > -1 && event.keyCode - 48 < world.inventory.stored.length) {
                                world.inventory.state = 1;
                                world.inventory.myIndex = event.keyCode - 48;
                            }
                            break;
                        case 1: // In inventory half-state
                            if (event.keyCode - 48 > -1 && event.keyCode - 48 < world.inventory.active.length) {
                                world.inventory.state = 0;
                                socket.talk(2, world.inventory.myIndex - 1, event.keyCode - 49);
                            }
                            break;
                    }
                } else if (event.keyCode === 8) {
                    if (world.inventory.state === 1) {
                        socket.talk(2, world.inventory.myIndex, -1);
                    }
                }
            });

            setInterval(() => {
                if (world.mouse) {
                    socket.talk(0, Math.atan2(canvas.height / 2 - world.mouse.y, canvas.width / 2 - world.mouse.x) + Math.PI, Math.min(getDistance({
                        x: world.mouse.x,
                        y: world.mouse.y
                    }, {
                        x: canvas.width / 2,
                        y: canvas.height / 2
                    }) / (Math.min(canvas.width, canvas.height) * .334), 1));
                }
            }, 1000 / 30);
        }
    }

    let player = {
        body: null,
        camera: {
            x: 0,
            y: 0,
            ratio: 1
        }
    };

    let storage = (() => {
        const caesarEncoded = (s, n) => {
            let alphabet = 'abcdefghijklmnopqrstuvwxyz';
            let lc = alphabet.replace(/\s/g, '').toLowerCase().split('');
            let uc = alphabet.replace(/\s/g, '').toUpperCase().split('');
            return Array.from(s).map((v) => {
                if (lc.indexOf(v.toLowerCase()) === -1 || uc.indexOf(v.toUpperCase()) === -1) {
                    return v;
                }
                const lcEncryptIndex = (lc.indexOf(v.toLowerCase()) + n) % alphabet.length;
                const lcEncryptedChar = lc[lcEncryptIndex];
                const ucEncryptIndex = (uc.indexOf(v.toUpperCase()) + n) % alphabet.length;
                const ucEncryptedChar = uc[ucEncryptIndex];
                return lc.indexOf(v) !== -1 ? lcEncryptedChar : ucEncryptedChar;
            }).join('');
        }
        const caesarDecoded = (s, n) => {
            let alphabet = 'abcdefghijklmnopqrstuvwxyz';
            let lc = alphabet.replace(/\s/g, '').toLowerCase().split('');
            let uc = alphabet.replace(/\s/g, '').toUpperCase().split('');
            return Array.from(s).map((v) => {
                if (lc.indexOf(v.toLowerCase()) === -1 || uc.indexOf(v.toUpperCase()) === -1) {
                    return v;
                }
                let lcEncryptIndex = (lc.indexOf(v.toLowerCase()) - n) % alphabet.length;
                lcEncryptIndex = lcEncryptIndex < 0 ? lcEncryptIndex + alphabet.length : lcEncryptIndex;
                const lcEncryptedChar = lc[lcEncryptIndex];
                let ucEncryptIndex = (uc.indexOf(v.toUpperCase()) - n) % alphabet.length;
                ucEncryptIndex = ucEncryptIndex < 0 ? ucEncryptIndex + alphabet.length : ucEncryptIndex;
                const ucEncryptedChar = uc[ucEncryptIndex];
                return lc.indexOf(v) !== -1 ? lcEncryptedChar : ucEncryptedChar;
            }).join('');
        }
        let hash = (string, key) => {
            string = string.split("").reverse().map(char => {
                if (char === char.toLowerCase()) {
                    char = char.toUpperCase();
                } else {
                    char = char.toLowerCase();
                }
                return char;
            }).join("");
            return btoa(caesarEncoded(string, key));
        };
        let unhash = (string, key) => {
            string = caesarDecoded(atob(string), key);
            string = string.split("").reverse().map(char => {
                if (char === char.toLowerCase()) {
                    char = char.toUpperCase();
                } else {
                    char = char.toLowerCase();
                }
                return char;
            }).join("");
            return string;
        }
        return {
            get: item => {
                let value = localStorage[hash(item, 28)];
                return value ? JSON.parse(unhash(value, 46)) : null;
            },
            set: (item, value) => {
                localStorage[hash(item, 28)] = hash(JSON.stringify(value), 46);
            }
        };
    })();

    let world = {
        width: 6500,
        height: 6500,
        zones: [],
        flowers: [],
        mobs: [],
        drops: [],
        clickableRegions: [],
        gridInterval: 50,
        playerID: -1,
        latency: 0,
        lastUplink: Date.now(),
        fps: 0,
        frames: 0,
        bandwidth: {
            outbound: 0,
            inbound: 0,
            out: 0,
            in: 0
        },
        inventory: {
            active: [],
            stored: [],
            state: 0
        },
        beetleAnimation: {
            angle: 0,
            add: Math.PI * .0025
        },
        seenPetals: storage.get("unlockedPetals") || [],
        animation: 0,
        animationDirection: 1,
        rockShapes: new Array(50).fill([]).map(() => new Array(8 + Math.random() * 5 | 0).fill(0).map(r => Math.min(1.05, Math.max(.95, Math.random() * .3 + .85))))
    };

    setInterval(function updateBandwidthUsage() {
        world.bandwidth.out = world.bandwidth.outbound;
        world.bandwidth.in = world.bandwidth.inbound;
        world.fps = world.frames;
        world.bandwidth.outbound = 0;
        world.bandwidth.inbound = 0;
        world.frames = 0;
    }, 1000);

    function lerp(start, to, strength = 0.1) {
        return start + strength * (to - start);
    }

    function lerpAngle(is, to, amount = 0.1) {
        var normal = {
            x: Math.cos(is),
            y: Math.sin(is)
        };
        var normal2 = {
            x: Math.cos(to),
            y: Math.sin(to)
        };
        var res = {
            x: lerp(normal.x, normal2.x, amount),
            y: lerp(normal.y, normal2.y, amount)
        };
        return Math.atan2(res.y, res.x);
    }

    function getDistance(a, b) {
        const xDist = b.x - a.x;
        const yDist = b.y - a.y;
        return Math.sqrt(xDist * xDist + yDist * yDist);
    }

    // Draw a polygon. It's simple.
    function drawPolygon(ctx, x, y, sides, radius, angle, fill, stroke, id) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle - Math.PI / 2);
        ctx.lineWidth = 0.2;
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        if (typeof s === "string") {
            let path = new Path2D(sides);
            ctx.save();
            ctx.scale(radius, radius);
            ctx.lineWidth = 7.5;
            ctx.stroke(path);
            ctx.fill(path);
            ctx.restore();
        } else if (sides instanceof Array) {
            ctx.beginPath();
            for (let point of sides) {
                let x = point[0] * radius,
                    y = point[1] * radius;
                ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.lineWidth = 7.5;
            ctx.stroke();
            ctx.fill();
        } else switch (true) {
            case sides === 0:
                ctx.beginPath();
                ctx.arc(0, 0, radius + 7.5 / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fillStyle = stroke;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fillStyle = fill;
                ctx.fill();
                break;
            case sides === 20: // Mishapen thing
                world.misshapenArray = world.misshapenArray || new Array(12).fill(0).map(() => Math.random() * 4 + 1);
                ctx.beginPath();
                let turn = Date.now() / 300;
                ctx.rotate(-(turn / 10) % Math.TAU);
                let rad = radius + Math.sin((turn * world.misshapenArray[0]) % Math.TAU) * 2;
                ctx.lineTo(rad, 0);
                for (let n = 1; n < 12; n++) {
                    let rad = radius + Math.sin((turn * world.misshapenArray[n]) % Math.TAU) * 2;
                    ctx.lineTo(Math.cos(Math.PI / 6 * n) * rad, Math.sin(Math.PI / 6 * n) * rad);
                }
                ctx.closePath();
                ctx.lineWidth = 7.5;
                ctx.stroke();
                ctx.fill();
                break;
            case sides === 21: // Rock
                ctx.beginPath();
                let rockShape = world.rockShapes[id % world.rockShapes.length];
                for (let i = 0; i < rockShape.length; i++) {
                    let angle = Math.PI * 2 / rockShape.length * i;
                    ctx.lineTo(Math.cos(angle) * (rockShape[i] * radius), Math.sin(angle) * (rockShape[i] * radius));
                }
                ctx.closePath();
                ctx.lineWidth = 7.5;
                ctx.stroke();
                ctx.fill();
                break;
            case sides === 22: // Ladybug
                ctx.rotate(Math.PI / 2);
                drawPolygon(ctx, radius * .5, 0, 0, radius * .5, 0, colors.black, mixColors(colors.black, "#000000", .25));
                ctx.beginPath();
                ctx.ellipse(0, 0, radius, radius, 0, Math.PI * .2, -Math.PI * .2);
                ctx.lineCap = ctx.lineJoin = "round";
                {
                    let a = -Math.PI * .2,
                        b = Math.PI * .2;
                    ctx.bezierCurveTo(radius * Math.cos(a), radius * Math.sin(a), 0, 0, radius * Math.cos(b), radius * Math.sin(b));
                }
                ctx.closePath();
                ctx.lineWidth = 7.5;
                ctx.stroke();
                ctx.fill();
                if (id) {
                    for (let i = 2; i > -1; i--) {
                        let angle = (Math.PI * .2) + (Math.PI * .6) * (i * (id % 5)),
                            dist = (radius * .7) * ((i + 1) / 3);
                        drawPolygon(ctx, Math.cos(angle) * dist, Math.sin(angle) * dist, 0, radius * .1 * ((i + 1) / 2), colors.black, mixColors(colors.black, "#000000", .25));
                    }
                }
                break;
            case sides === 23: // Bee
                ctx.rotate(Math.PI / 2);
                ctx.lineCap = ctx.lineJoin = "round";
                drawPolygon(ctx, -radius * 1.275, 0, 3, radius * .4, -Math.PI / 6, colors.black, mixColors(colors.black, "#000000", .25));
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.5, radius * .95, 0, 0, Math.PI * 2);
                ctx.clip();
                ctx.closePath();
                ctx.fill();
                ctx.save();
                ctx.fillStyle = colors.black;
                ctx.fillRect(radius * .7, -radius, radius * .4, radius * 2);
                ctx.fillRect(-radius * .4, -radius, radius * .55, radius * 2);
                ctx.fillRect(-radius * 1.5, -radius, radius * .55, radius * 2);
                ctx.restore();
                ctx.lineWidth = 7.5;
                ctx.stroke();
                ctx.restore();
                ctx.strokeStyle = ctx.fillStyle = colors.black;
                ctx.lineWidth = radius / 6.66666666667;
                ctx.beginPath();
                ctx.bezierCurveTo(
                    radius * 1.2, -radius * .2,
                    radius * 1.55, -radius * .4,
                    radius * 1.85, -radius * .8
                );
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(radius * 1.85, -radius * .8, radius / 5, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.bezierCurveTo(
                    radius * 1.2, radius * .2,
                    radius * 1.55, radius * .4,
                    radius * 1.85, radius * .8
                );
                ctx.stroke();
                ctx.closePath();
                ctx.beginPath();
                ctx.arc(radius * 1.85, radius * .8, radius / 5, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
                break;
            case sides === 24: // Hornet
                ctx.rotate(Math.PI / 2);
                ctx.lineCap = ctx.lineJoin = "round";
                drawPolygon(ctx, -radius * 1.45, 0, [
                    [-2, 0],
                    [1, -1],
                    [1, 1]
                ], radius * .4, Math.PI / 2, colors.black, mixColors(colors.black, "#000000", .25));
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.5, radius * .95, 0, 0, Math.PI * 2);
                ctx.clip();
                ctx.closePath();
                ctx.fill();
                ctx.save();
                ctx.fillStyle = colors.black;
                ctx.fillRect(radius * .7, -radius, radius * .4, radius * 2);
                ctx.fillRect(-radius * .4, -radius, radius * .55, radius * 2);
                ctx.fillRect(-radius * 1.5, -radius, radius * .55, radius * 2);
                ctx.restore();
                ctx.lineWidth = 7.5;
                ctx.stroke();
                ctx.restore();
                ctx.strokeStyle = ctx.fillStyle = colors.black;
                ctx.lineWidth = radius / 5;
                ctx.beginPath();
                ctx.bezierCurveTo(
                    radius * 1.225, -radius * .2,
                    radius * 1.6, -radius * .2,
                    radius * 2, -radius * .8
                );
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
                ctx.beginPath();
                ctx.bezierCurveTo(
                    radius * 1.225, radius * .2,
                    radius * 1.6, radius * .2,
                    radius * 2, radius * .8
                );
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
                break;
            case sides === 25: // Cactus
                let points = Math.max(6, Math.floor(radius / 4) + sides % 2);
                ctx.strokeStyle = colors.black;
                ctx.lineWidth = 7.5;
                for (let i = 0; i < points; i ++) {
                    let angle = (Math.PI * 2) / points * i + (Math.PI * 2) / (points * 2);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(angle) * radius * 1.15, Math.sin(angle) * radius * 1.15);
                    ctx.closePath();
                    ctx.stroke();
                }
                drawPolygon(ctx, 0, 0, -points, radius, angle, fill, stroke, id);
                break;
            case sides === 26: // Beetle
                ctx.rotate(Math.PI / 2);
                ctx.lineCap = ctx.lineJoin = "round";
                ctx.save();
                ctx.fillStyle = colors.black;
                ctx.strokeStyle = mixColors(colors.black, "#000000", .25);
                ctx.lineWidth = 7.5;
                ctx.beginPath();
                ctx.rotate(-world.beetleAnimation.angle);
                ctx.bezierCurveTo(radius, -radius * .6, radius * 1.8, -radius * .85, radius * 2.5, -radius * .3);
                ctx.bezierCurveTo(radius * 2.5, -radius * .3, radius * 1.8, -radius * .5, radius, -radius * .4);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
                ctx.beginPath();
                ctx.rotate(world.beetleAnimation.angle * 2);
                ctx.bezierCurveTo(radius, radius * .6, radius * 1.8, radius * .85, radius * 2.5, radius * .3);
                ctx.bezierCurveTo(radius * 2.5, radius * .3, radius * 1.8, radius * .5, radius, radius * .4);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
                ctx.restore();
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 1.5, radius, 0, 0, Math.PI * 2);
                ctx.closePath();
                ctx.lineWidth = 7.5;
                ctx.stroke();
                ctx.fill();
                ctx.save();
                ctx.beginPath();
                for (let i = 0; i < 3; i ++) {
                    ctx.moveTo(-radius * .8 + (i % 3) / 2 * radius * 1.6, radius * .4);
                    ctx.arc(-radius * .8 + (i % 3) / 2 * radius * 1.6, radius * .4, radius * .175, 0, Math.PI * 2);
                    ctx.moveTo(-radius * .8 + (i % 3) / 2 * radius * 1.6, -radius * .4);
                    ctx.arc(-radius * .8 + (i % 3) / 2 * radius * 1.6, -radius * .4, radius * .175, 0, Math.PI * 2);
                }
                ctx.closePath();
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fill();
                ctx.beginPath();
                ctx.bezierCurveTo(-radius * .6, 0, 0, id % 2 ? -radius * .2 : radius * .2, radius * .6, 0);
                ctx.stroke();
                ctx.closePath();
                ctx.restore();
                break;
            case sides === 27: // Peas
                for (let i = 0; i < 4; i ++) {
                    let angle = Math.PI / 2 * i,
                        dist = radius / 1.5;
                    drawPolygon(ctx, dist * Math.cos(angle), dist * Math.sin(angle), 0, radius / 3, angle, fill, stroke, id);
                }
                break;
            case (sides < 0 && sides > -17): {
                ctx.beginPath();
                angle += sides % 2 ? 0 : Math.PI / sides;
                let dip = 1 - 10 / sides / sides;
                sides = -sides;
                ctx.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
                for (let i = 0; i < sides; i++) {
                    var theta = ((i + 1) / sides) * 2 * Math.PI;
                    var htheta = ((i + 0.5) / sides) * 2 * Math.PI;
                    var c = {
                        x: radius * dip * Math.cos(htheta + angle),
                        y: radius * dip * Math.sin(htheta + angle)
                    };
                    var p = {
                        x: radius * Math.cos(theta + angle),
                        y: radius * Math.sin(theta + angle)
                    };
                    ctx.quadraticCurveTo(c.x, c.y, p.x, p.y);
                }
                ctx.closePath();
                ctx.lineWidth = 7.5;
                ctx.stroke();
                ctx.fill();
            } break;
            case (sides > 100 && sides < 150): {
                sides -= 100;
                sides = -sides;
                ctx.beginPath();
                angle += sides % 2 ? 0 : Math.PI / sides;
                let dip = 1 + 15 / sides / sides;
                sides = -sides;
                ctx.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
                for (let i = 0; i < sides; i++) {
                    var theta = ((i + 1) / sides) * 2 * Math.PI;
                    var htheta = ((i + 0.5) / sides) * 2 * Math.PI;
                    var c = {
                        x: radius * dip * Math.cos(htheta + angle),
                        y: radius * dip * Math.sin(htheta + angle)
                    };
                    var p = {
                        x: radius * Math.cos(theta + angle),
                        y: radius * Math.sin(theta + angle)
                    };
                    ctx.quadraticCurveTo(c.x, c.y, p.x, p.y);
                }
                ctx.closePath();
                ctx.lineWidth = 7.5;
                ctx.stroke();
                ctx.fill();
            } break;
            case (sides < 17 && sides > 2): {
                ctx.beginPath();
                let angle = 0;
                angle += (sides % 2 ? 0 : Math.PI / sides) - Math.PI;
                for (let i = 0; i < sides; i++) {
                    let theta = (i / sides) * 2 * Math.PI;
                    let x = (radius * 1.25) * Math.cos(theta + angle);
                    let y = (radius * 1.25) * Math.sin(theta + angle);
                    ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.lineWidth = 7.5;
                ctx.stroke();
                ctx.fill();
            } break;
        }
        ctx.restore();
    }

    function drawText(ctx, text, x, y, size, align = "center", fill = "#ffffff", stroke = "#000000") {
        ctx.save();
        ctx.font = "bold " + (size * (canvas.width / canvas.height)) + "px Ubuntu";
        ctx.lineWidth = size / 5;
        let offX = align === "center" ? ctx.measureText(text).width / 2 : 0;
        let offY = ctx.measureText("M").width / 2;
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.strokeText(text, x - offX, y + offY);
        ctx.fillText(text, x - offX, y + offY);
        ctx.restore();
    }

    const minimap = (function () {
        let objects = [],
            x = 20,
            y = 20;
        function draw() {
            let w = 100 * world.zones.length,
                h = (world.height / world.width) * w;
            ctx.save();
            ctx.translate(canvas.width - x - w, canvas.height - y - h);
            if (world.zones.length) {
                for (let zone of world.zones) {
                    ctx.fillStyle = colors.backgroundZones[zone.type].light;
                    ctx.fillRect(zone.start / world.width * w, 0, (zone.end - zone.start) / world.width * w, h);
                }
            }
            ctx.beginPath();
            ctx.arc(player.camera.x / world.width * w, player.camera.y / world.height * h, 8, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = colors.gold;
            ctx.fill();
            ctx.strokeStyle = colors.black;
            ctx.lineWidth = 5;
            ctx.strokeRect(0, 0, w, h);
            ctx.restore();
        }
        return {
            draw: draw
        }
    })();

    function gameLoop() {
        world.clickableRegions = [];
        if (Math.abs(world.beetleAnimation.angle + world.beetleAnimation.add) > Math.PI * .025) {
            world.beetleAnimation.add *= -1;
        }
        world.beetleAnimation.angle += world.beetleAnimation.add;
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(1 / global.screenRatio, 1 / global.screenRatio);
        if (world.zones.length) {
            let i = world.zones.length;
            while (i > 0) {
                i--;
                let zone = world.zones[i];
                ctx.fillStyle = colors.backgroundZones[zone.type].dark;
                ctx.fillRect(0, 0, i === world.zones.length - 1 ? canvas.width : -player.camera.x + canvas.width / 2 + zone.end, canvas.height);
            }
            for (let zone of world.zones) {
                ctx.fillStyle = colors.backgroundZones[zone.type].light;
                ctx.fillRect(-player.camera.x + canvas.width / 2 + zone.start, -player.camera.y + canvas.height / 2, zone.end - zone.start, world.height);
            }
        } else {
            ctx.fillStyle = colors.backgroundB;
            ctx.fillRect(0, 0, innerWidth, innerHeight);
            ctx.fillStyle = colors.backgroundA;
            ctx.fillRect(-player.camera.x + canvas.width / 2, -player.camera.y + canvas.height / 2, world.width, world.height);
        }
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.globalAlpha = .05;
        ctx.strokeStyle = "black";
        let gridsize = world.gridInterval;
        let px = player.camera.x;
        let py = player.camera.y;
        for (let x = (canvas.width / 2 - px) % gridsize; x < canvas.width; x += gridsize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
        for (let y = (canvas.height / 2 - py) % gridsize; y < canvas.height; y += gridsize) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
        ctx.restore();
        for (let object of world.drops) {
            object.x = lerp(object.x, object.rx, .175);
            object.y = lerp(object.y, object.ry, .175);
            if (Math.abs(object.x - player.camera.x) > canvas.width / 1.5 || Math.abs(object.y - player.camera.y) > canvas.height / 1.5) {
                continue;
            }
            const _petal = PETAL_CONFIG[object.index] || PETAL_CONFIG[0];
            ctx.save();
            ctx.translate((object.x - player.camera.x) + canvas.width / 2, (object.y - player.camera.y) + canvas.height / 2);
            ctx.rotate(object.angle);
            ctx.globalAlpha = object.fade;
            drawPolygon(ctx, 0, 0, 4, object.size, 0, global.rarityColors[_petal.rarity], mixColors(global.rarityColors[_petal.rarity], "#000000", .25));
            if (_petal.spawn > 1) {
                for (let i = 0; i < _petal.spawn; i ++) {
                    let size = object.size / 1.334 * _petal.size,
                        angle = Math.PI * 2 / _petal.spawn * i;
                    drawPolygon(ctx, size * 2 * Math.cos(angle), size * 2 * Math.sin(angle), _petal.shape || 0, size, 0, colors[_petal.color || "petalWhite"], mixColors(colors[_petal.color || "petalWhite"], "#000000", 0.25), object.id);
                }
            } else {
                drawPolygon(ctx, 0, 0, _petal.shape || 0, object.size / 1.334 * _petal.size, 0, colors[_petal.color || "petalWhite"], mixColors(colors[_petal.color || "petalWhite"], "#000000", 0.25), object.id);
            }
            drawText(ctx, _petal.name, 0, object.size - 7.5, 6, "center");
            ctx.restore();
        }
        for (let object of world.mobs) {
            object.x = lerp(object.x, object.rx, .175);
            object.y = lerp(object.y, object.ry, .175);
            object.angle = lerpAngle(object.angle, object.rangle, .175);
            if (Math.abs(object.x - player.camera.x) > canvas.width / 1.5 || Math.abs(object.y - player.camera.y) > canvas.height / 1.5) {
                continue;
            }
            const _projectile = object._mob.projectile;
            object.projectiles.forEach(projectile => {
                projectile.x = lerp(projectile.x, projectile.rx, .175);
                projectile.y = lerp(projectile.y, projectile.ry, .175);
                projectile.angle = lerpAngle(projectile.angle, projectile.rangle, .175);
                ctx.save();
                ctx.globalAlpha = projectile.fade;
                ctx.translate((projectile.x - player.camera.x) + canvas.width / 2, (projectile.y - player.camera.y) + canvas.height / 2);
                let myColor = mixColors(colors[_projectile.color || "petalWhite"], colors.hit, +projectile.hit);
                drawPolygon(ctx, 0, 0, _projectile.shape || 0, projectile.size * (1 + (1 - projectile.fade)), projectile.angle + Math.PI / 2, myColor, mixColors(myColor, "#000000", 0.25), projectile.id);
                ctx.restore();
            });
            ctx.save();
            ctx.translate((object.x - player.camera.x) + canvas.width / 2, (object.y - player.camera.y) + canvas.height / 2);
            ctx.globalAlpha = object.fade;
            let myColor = mixColors(colors[object.poisoned ? "purple" : object._mob.color || "gold"], colors.hit, +object.hit * (object.poisoned ? .5 : 1));
            drawPolygon(ctx, 0, 0, object._mob.shape || 0, object.size * object.fade, object.angle, myColor, mixColors(myColor, "#000000", 0.25), object.id);
            ctx.restore();
        }
        for (let object of world.flowers) {
            object.x = lerp(object.x, object.rx, .175);
            object.y = lerp(object.y, object.ry, .175);
            object.health.fade = lerp(object.health.fade, +(object.health.display < .995), .05);
            object.health.display = lerp(object.health.display, object.health.real, .1);
            if ((Math.abs(object.x - player.camera.x) > canvas.width / 1.5 || Math.abs(object.y - player.camera.y) > canvas.height / 1.5) && object.id !== world.playerID) {
                continue;
            }
            if (object.id === world.playerID) {
                player.camera.x = object.x;
                player.camera.y = object.y;
                for (let petal of object.petals) { // It's better to have it here so we only unlock the ones WE GET
                    if (!world.seenPetals.includes([petal._petal.name, petal._petal.rarity].join("-"))) {
                        world.seenPetals.push([petal._petal.name, petal._petal.rarity].join("-"));
                        storage.set("unlockedPetals", world.seenPetals);
                    }
                }
            }
            object.petals.forEach(petal => {
                petal.x = lerp(petal.x, petal.rx, .175);
                petal.y = lerp(petal.y, petal.ry, .175);
                ctx.save();
                ctx.globalAlpha = petal.fade;
                ctx.translate((petal.x - player.camera.x) + canvas.width / 2, (petal.y - player.camera.y) + canvas.height / 2);
                let myColor = mixColors(colors[petal._petal.color || "petalWhite"], colors.hit, +petal.hit);
                drawPolygon(ctx, 0, 0, petal._petal.shape || 0, petal.size * (1 + (1 - petal.fade)), (Date.now() - petal.creation) / 334, myColor, mixColors(myColor, "#000000", 0.25), petal.id);
                ctx.restore();
            });
            object.projectiles.forEach(projectile => {
                const _projectile = projectile.projectile;
                projectile.x = lerp(projectile.x, projectile.rx, .175);
                projectile.y = lerp(projectile.y, projectile.ry, .175);
                projectile.angle = lerpAngle(projectile.angle, projectile.rangle, .175);
                ctx.save();
                ctx.globalAlpha = projectile.fade;
                ctx.translate((projectile.x - player.camera.x) + canvas.width / 2, (projectile.y - player.camera.y) + canvas.height / 2);
                let myColor = mixColors(colors[_projectile.color || "petalWhite"], colors.hit, +projectile.hit);
                drawPolygon(ctx, 0, 0, _projectile.shape || 0, projectile.size * (1 + (1 - projectile.fade)), projectile.angle + Math.PI / 2, myColor, mixColors(myColor, "#000000", 0.25), projectile.id);
                ctx.restore();
            });
            ctx.save();
            ctx.translate((object.x - player.camera.x) + canvas.width / 2, (object.y - player.camera.y) + canvas.height / 2);
            ctx.globalAlpha = object.fade;
            let myColor = mixColors(colors[object.poisoned ? "purple" : object.color || "gold"], colors.hit, +object.hit * (object.poisoned ? .5 : 1));
            drawPolygon(ctx, 0, 0, 0, object.size * object.fade, 0, myColor, mixColors(myColor, "#000000", 0.25), object.id);
            ctx.globalAlpha = object.health.fade;
            ctx.lineWidth = 10;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(-object.size, object.size * 1.5);
            ctx.lineTo(object.size, object.size * 1.5);
            ctx.closePath();
            ctx.strokeStyle = colors.barGrey;
            ctx.stroke();
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(-object.size, object.size * 1.5);
            ctx.lineTo(-object.size + object.health.display * object.size * 2, object.size * 1.5);
            ctx.closePath();
            ctx.strokeStyle = colors.barGreen;
            ctx.stroke();
            ctx.restore();
        }
        minimap.draw();
        let animationTo = world.animationDirection ? Math.max(canvas.width, canvas.height) : 0;
        if (Math.abs(animationTo - world.animation) > 5) {
            world.animation += (world.animationDirection ? 1 : -1) * (Math.max(canvas.width, canvas.height) * .0175);
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height), 0, 2 * Math.PI, true);
            ctx.arc(canvas.width / 2, canvas.height / 2, world.animation, 0, 2 * Math.PI, false);
            ctx.closePath();
            ctx.fillStyle = mixColors(colors.backgroundZones.easy.dark, colors.black, .1);
            ctx.stroke();
            ctx.lineWidth = Math.max(canvas.width, canvas.height) * .0175;
            ctx.strokeStyle = "#555555";
            ctx.fill();
        }
        drawText(ctx, "floomy.io", 20, 40, 15, "left");
        drawText(ctx, `${world.serverEntities} entities | ${world.mspt}ms tick`, 20, 75, 8, "left");
        drawText(ctx, `${world.bandwidth.in}bps in | ${world.bandwidth.out}bps out`, 20, 95, 8, "left");
        drawText(ctx, `${world.latency} ms | ${world.fps} FPS`, 20, 115, 8, "left");
        if (world.inventory) {
            let tileSize = 70,
                spacing = 20,
                x = canvas.width / 2,
                y = canvas.height - tileSize - spacing,
                defaultFill = colors.petalWhite,
                defaultStroke = mixColors(defaultFill, "#000000", .25),
                offX = x - tileSize * (world.inventory.active.length / 2) - spacing * (world.inventory.active.length / 2);
            for (let i = 0; i < world.inventory.active.length; i ++) {
                let petal = PETAL_CONFIG[world.inventory.active[i]];
                let xx = offX + tileSize * i + spacing * i;
                ctx.fillStyle = petal ? mixColors(global.rarityColors[petal.rarity], "#FFFFFF", (world.inventory.activeSelection === i) * .334) : defaultFill;
                ctx.strokeStyle = petal ? mixColors(mixColors(global.rarityColors[petal.rarity], "#000000", .25), "#FFFFFF", (world.inventory.activeSelection === i) * .334) : defaultStroke;
                ctx.lineWidth = 7.5;
                ctx.globalAlpha = .75;
                ctx.strokeRect(xx, y - tileSize, tileSize, tileSize);
                ctx.fillRect(xx, y - tileSize, tileSize, tileSize);
                world.clickableRegions.push({
                    x: xx,
                    y: y - tileSize,
                    w: tileSize,
                    h: tileSize,
                    click: () => {
                        if (world.inventory.activeSelection === i) {
                            world.inventory.activeSelection = -1;
                            return;
                        }
                        world.inventory.activeSelection = i;
                        if (world.inventory.storedSelection > -1) {
                            world.socket.talk(2, world.inventory.activeSelection, world.inventory.storedSelection);
                            world.inventory.activeSelection = world.inventory.storedSelection = -1;
                        }
                    }
                });
                ctx.globalAlpha = 1;
                if (petal) {
                    if (petal.spawn > 1) {
                        for (let i = 0; i < petal.spawn; i ++) {
                            let xxx = xx + tileSize / 2,
                                yy = y - tileSize / 2,
                                size = tileSize / 3 * petal.size,
                                angle = Math.PI * 2 / petal.spawn * i;
                            drawPolygon(ctx, xxx + size * 2 * Math.cos(angle), yy + size * 2 * Math.sin(angle), petal.shape || 0, size, 0, colors[petal.color || "petalWhite"], mixColors(colors[petal.color || "petalWhite"], "#000000", 0.25), i);
                        }
                    } else {
                        drawPolygon(ctx, xx + tileSize / 2, y - tileSize / 2, petal.shape || 0, tileSize / 3 * petal.size, 0, colors[petal.color || "petalWhite"], mixColors(colors[petal.color || "petalWhite"], "#000000", 0.25), i);
                    }
                    drawText(ctx, petal.name, xx + tileSize / 2, y - tileSize / 7.5, tileSize / 10, "center");
                }
            }
            tileSize *= .75;
            y += tileSize + spacing;
            offX = x - tileSize * ((world.inventory.stored.length + 1) / 2) - spacing * ((world.inventory.stored.length + 1) / 2);
            for (let i = 0; i < world.inventory.stored.length; i ++) {
                let petal = PETAL_CONFIG[world.inventory.stored[i]];
                let xx = offX + tileSize * i + spacing * i;
                ctx.fillStyle = petal ? mixColors(global.rarityColors[petal.rarity], "#FFFFFF", (world.inventory.storedSelection === i) * .334) : defaultFill;
                ctx.strokeStyle = petal ? mixColors(mixColors(global.rarityColors[petal.rarity], "#000000", .25), "#FFFFFF", (world.inventory.storedSelection === i) * .334) : defaultStroke;
                ctx.lineWidth = 7.5;
                ctx.globalAlpha = .75;
                ctx.strokeRect(xx, y - tileSize, tileSize, tileSize);
                ctx.fillRect(xx, y - tileSize, tileSize, tileSize);
                world.clickableRegions.push({
                    x: xx,
                    y: y - tileSize,
                    w: tileSize,
                    h: tileSize,
                    click: () => {
                        if (world.inventory.storedSelection === i) {
                            world.inventory.storedSelection = -1;
                            return;
                        }
                        world.inventory.storedSelection = i;
                        if (world.inventory.activeSelection > -1) {
                            world.socket.talk(2, world.inventory.activeSelection, world.inventory.storedSelection);
                            world.inventory.activeSelection = world.inventory.storedSelection = -1;
                        }
                    }
                });
                ctx.globalAlpha = 1;
                if (petal) {
                    if (petal.spawn > 1) {
                        for (let i = 0; i < petal.spawn; i ++) {
                            let xxx = xx + tileSize / 2,
                                yy = y - tileSize / 2,
                                size = tileSize / 3 * petal.size,
                                angle = Math.PI * 2 / petal.spawn * i;
                            drawPolygon(ctx, xxx + size * 2 * Math.cos(angle), yy + size * 2 * Math.sin(angle), petal.shape || 0, size, 0, colors[petal.color || "petalWhite"], mixColors(colors[petal.color || "petalWhite"], "#000000", 0.25), i);
                        }
                    } else {
                        drawPolygon(ctx, xx + tileSize / 2, y - tileSize / 2, petal.shape || 0, tileSize / 3 * petal.size, 0, colors[petal.color || "petalWhite"], mixColors(colors[petal.color || "petalWhite"], "#000000", 0.25), i);
                    }
                    drawText(ctx, petal.name, xx + tileSize / 2, y - tileSize / 7.5, tileSize / 7.5, "center");
                }
            }
            { // DELETUS
                let xx = offX + tileSize * world.inventory.stored.length + spacing * world.inventory.stored.length;
                ctx.fillStyle = global.rarityColors["Legendary"];
                ctx.strokeStyle = mixColors(global.rarityColors["Legendary"], "#000000", .25);
                ctx.lineWidth = 7.5;
                ctx.globalAlpha = .75;
                ctx.strokeRect(xx, y - tileSize, tileSize, tileSize);
                ctx.fillRect(xx, y - tileSize, tileSize, tileSize);
                world.clickableRegions.push({
                    x: xx,
                    y: y - tileSize,
                    w: tileSize,
                    h: tileSize,
                    click: () => {
                        if (world.inventory.storedSelection > -1) {
                            world.socket.talk(2, -1, world.inventory.storedSelection);
                            world.inventory.activeSelection = world.inventory.storedSelection = -1;
                        }
                    }
                });
                ctx.globalAlpha = 1;
            }
        }
        world.frames++;
        requestAnimationFrame(gameLoop);
    }
})();