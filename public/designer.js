(function () {
    Math.TAU = Math.PI * 2;
    Math.HPI = Math.PI / 2;

    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");

    function onResize() {
        canvas.width = innerWidth * devicePixelRatio;
        canvas.height = innerHeight * devicePixelRatio;
    }

    onResize();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    window.addEventListener("resize", onResize);

    let world = {
        beetleAnimation: {
            angle: 0,
            add: Math.PI * .0025
        }
    };

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
            }
        }
    };

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
            ctx.lineWidth = 10
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
                for(let n = 1; n < 12; n ++){
                    let rad = radius + Math.sin((turn * world.misshapenArray[n]) % Math.TAU) * 2;
                    ctx.lineTo(Math.cos(Math.PI / 6 * n) * rad, Math.sin(Math.PI / 6 * n) * rad);
                }
                ctx.closePath();
                ctx.lineWidth = radius * .75;
                ctx.stroke();
                ctx.fill();
                break;
            case sides === 21: // Rock
                world.rockShape = world.rockShape || new Array(8).fill(0).map(r => .75 + Math.random());
                ctx.beginPath();
                for (let i = 0; i < world.rockShape.length; i ++) {
                    let angle = Math.PI * 2 / world.rockShape.length * i;
                    ctx.lineTo(Math.cos(angle) * (world.rockShape[i] * radius), Math.sin(angle) * (world.rockShape[i] * radius));
                }
                ctx.closePath();
                ctx.lineWidth = radius * .75;
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
                    for (let i = 2; i > -1; i --) {
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
                let points = Math.floor(radius / 4) + sides % 2;
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
                        dist = radius / 2;
                    drawPolygon(ctx, dist * Math.cos(angle), dist * Math.sin(angle), 0, radius / 4, angle, fill, stroke, id);
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
    const id = Math.random() * 10000 | 0;
    setInterval(() => {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (Math.abs(world.beetleAnimation.angle + world.beetleAnimation.add) > Math.PI * .025) {
            world.beetleAnimation.add *= -1;
        }
        world.beetleAnimation.angle += world.beetleAnimation.add;
        ctx.save();
        drawPolygon(ctx, canvas.width / 2, canvas.height / 2, 26, 45, 0, colors.purple, mixColors(colors.purple, "#000000", .25), id);
        ctx.restore();
    }, 1000 / 60);
})();