/*
* Poison: [every x ticks, for y times, deal z damage]
* Healing: [every x ticks, health y damage] (If x ticks is -1, it's continuous)
*/

module.exports = {
    "Common": {
        "Basic": {
            "health": 10,
            "damage": 10,
            "recharge": 2500,
            "size": .334,
            "tip": "A nice petal, not too strong but not too weak"
        },
        "Fast": {
            "health": 8,
            "damage": 8,
            "recharge": 500,
            "size": .275,
            "tip": "Weaker than most petals, but recharges quickly"
        },
        "Heavy": {
            "health": 20,
            "damage": 15,
            "recharge": 5500,
            "color": "grey",
            "size": .425,
            "tip": "Very resilient and deals more damage, but recharges very slowly"
        }
    },
    "Unusual": {
        "Iris": {
            "health": 5,
            "damage": 5,
            "recharge": 6000,
            "size": .3,
            "color": "purple",
            "poison": [5, 10, .03],
            "tip": "Very poisonous, but takes a little while to do its work"
        },
        "Stinger": {
            "health": 8,
            "damage": 35,
            "recharge": 4000,
            "size": .255,
            "shape": 3,
            "color": "black",
            "tip": "It really hurts, but it's very fragile"
        },
        "Rose": {
            "health": 5,
            "damage": 5,
            "recharge": 3500,
            "size": .334,
            "color": "pink",
            "healing": 1 / 9,
            "tip": "Its healing properties are amazing. Not so good at combat though"
        },
        "Twin": {
            "spawn": 2,
            "health": 5,
            "damage": 8,
            "recharge": 500,
            "size": .275,
            "tip": "Why stop at one? Why not TWO?!"
        }
    },
    "Rare": {
        "Rock": {
            "health": 25,
            "damage": 20,
            "recharge": 7500,
            "size": .45,
            "shape": 21,
            "color": "grey",
            "tip": "Extremely durable, but takes a long time to recharge"
        },
        "Cactus": {
            "health": 20,
            "damage": 15,
            "recharge": 7500,
            "size": .4,
            "shape": 25,
            "color": "green",
            "damageResist": .15,
            "tip": "Not too strong, but somehow makes you more resistant to damage"
        },
        "Peas": {
            "health": 16,
            "damage": 16,
            "recharge": 5000,
            "size": .5,
            "shape": 27,
            "color": "green",
            "tip": "4 in 1 deal!",
            "frag": {
                "amount": 4,
                "damage": 8,
                "speed": 25,
                "size": 1 / 4,
                "range": 75,
                "color": "green",
                "shape": 0
            }
        }
    },
    "Epic": {
        "Rose": {
            "health": 5,
            "damage": 5,
            "recharge": 3500,
            "size": .3,
            "shape": 103,
            "color": "pink",
            "healing": 1 / 3,
            "tip": "Extremely powerful rose, almost unheard of"
        },
        "Triplet": {
            "spawn": 3,
            "health": 5,
            "damage": 8,
            "recharge": 1000,
            "size": .275,
            "tip": "How about THREE?!"
        },
        "Peas": {
            "health": 16,
            "damage": 16,
            "recharge": 5000,
            "size": .5,
            "shape": 27,
            "color": "purple",
            "tip": "4 in 1 deal! (With poison)",
            "poison": [5, 10, .03],
            "frag": {
                "amount": 4,
                "damage": 8,
                "speed": 25,
                "size": 1 / 4,
                "range": 75,
                "poison": [5, 10, .03],
                "color": "purple",
                "shape": 0
            }
        }
    },
    "Legendary": {
        "Stinger": {
            "health": 100,
            "damage": 12,
            "recharge": 5500,
            "size": .275,
            "shape": 3,
            "color": "black",
            "tip": "It really hurts, but it's very fragile"
        },
        "Quad": {
            "spawn": 4,
            "health": 5,
            "damage": 8,
            "recharge": 1250,
            "size": .25,
            "tip": "How about FOUR??!!"
        }
    },
    "Mythical": {
        "Orb": {
            "health": 600,
            "damage": 6,
            "recharge": 2500,
            "size": .5,
            "shape": 20,
            "color": "blue",
            "tip": "Scary, but somehow intriguing"
        },
        "Penta": {
            "spawn": 5,
            "health": 3,
            "damage": 7,
            "recharge": 1334,
            "size": .25,
            "tip": "How about FIVE??!!"
        }
    },
    "Unique": {
        "Square": {
            "health": 25,
            "damage": 25,
            "recharge": 500,
            "size": .4,
            "shape": 4,
            "color": "gold",
            "tip": "This seems... odd..."
        },
        "Penta": {
            "spawn": 5,
            "health": 8,
            "damage": 10,
            "recharge": 500,
            "size": .25,
            "tip": "How about FIVE??!! (Now in more flavors)"
        }
    }
};

let index = 0;
for (let rarity in module.exports) {
    for (let petal in module.exports[rarity]) {
        module.exports[rarity][petal].index = index ++;
        module.exports[rarity][petal].rarity = rarity;
        module.exports[rarity][petal].name = petal;
    }
}