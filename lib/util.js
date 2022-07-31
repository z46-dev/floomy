exports.lerp = function lerp(start, to, strength = 0.1) {
    return start + strength * (to - start);
}

exports.choose = function choose(array) {
    return array[Math.random() * array.length | 0];
}

exports.getDistance = function getDistance(a, b) {
    const xDist = b.x - a.x;
    const yDist = b.y - a.y;
    return Math.sqrt(xDist * xDist + yDist * yDist);
}

exports.getAngleDiff = function getAngleDiff(obj1, obj2) {
    return Math.atan2(obj2.y - obj1.y, obj2.x - obj1.x);
}

exports.getRarity = function getRarity(choices, exclude) {
    choices = choices || {
        "Common": 100,
        "Unusual": 60,
        "Rare": 30,
        "Epic": 15,
        "Legendary": 6,
        "Mythical": 1,
        "Unique": .1
    };
    if (exclude) {
        for (let key in choices) {
            if (!exclude.includes(key)) {
                delete choices[key];
            }
        }
    }
    if (Object.values(choices).findIndex(e => e === 100) === -1) {
        let lowest = Object.values(choices).sort((a, b) => a - b)[0],
            ratio = 100 - lowest;
        for (let key in choices) {
            choices[key] += (lowest / choices[key]) * ratio;
        }
    }
    let rarity,
        chance = 100,
        seed = Math.random();
    for (let key in choices) {
        if (seed > 1 - (choices[key] / 100) && choices[key] <= chance) {
            chance = choices[key];
            rarity = key;
        }
    }
    return rarity;
}

exports.generateLootTable = function generateLootTable(choices, rarities) {
    let min;
    while (min = Math.min(...Object.values(rarities)), min < 1) {
        for (let key in rarities) {
            rarities[key] *= 10;
        }
    }
    let output = [];
    for (let rarity in choices) {
        for (let i = 0; i < rarities[rarity]; i ++) {
            output.push(...Object.values(choices[rarity]));
        }
    }
    return output;
}

exports.cleanString = (string, length = -1) => {
    if (typeof string !== "string") {
        return "";
    }
    string = string.replace(/[\u0000\uFDFD\u202E\uD809\uDC2B\x00\x01\u200b\u200e\u200f\u202a-\u202e\ufdfd\ufffd-\uffff]/g, "").trim();
    if (length > -1) {
        string = string.slice(0, length);
    }
    return string;
}