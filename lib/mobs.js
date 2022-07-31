/* Drops
{
    "chance": 80, // Math.random() > 1 - (x / 100)
    "maximum": 1, // Math.random() * (x - 1) + 1
    "choices": {
        "Rarity": ["List", "of", "petals", "that", "drop", "at", "this", "rarity"]
    }
}
*/

module.exports = {
    "Common": {
        "Rock": {
            "health": 100,
            "damage": 3,
            "pushability": 0,
            "size": [30, 150],
            "color": "grey",
            "shape": 21,
            "drops": {
                "chance": 80,
                "maximum": 1,
                "choices": {
                    "Common": ["Heavy", "Fast"],
                    "Rare": ["Rock"]
                }
            }
        },
        "Cactus": {
            "health": 75,
            "damage": 50,
            "pushability": 0,
            "size": [30, 60],
            "color": "green",
            "shape": 25,
            "drops": {
                "chance": 70,
                "maximum": 1,
                "choices": {
                    "Unusual": ["Stinger", "Twin"],
                    "Rare": ["Cactus"]
                }
            }
        },
        "Ladybug": {
            "health": 10,
            "damage": 15,
            "size": 20,
            "color": "red",
            "aiType": "passive",
            "shape": 22,
            "speed": 5,
            "drops": {
                "chance": 90,
                "maximum": 1,
                "choices": {
                    "Common": ["Fast"],
                    "Unusual": ["Rose", "Twin"]
                }
            }
        },
        "Bee": {
            "health": 10,
            "damage": 30,
            "size": 20,
            "color": "gold",
            "aiType": "passive",
            "shape": 23,
            "speed": 10,
            "drops": {
                "chance": 80,
                "maximum": 1,
                "choices": {
                    "Common": ["Fast"],
                    "Unusual": ["Stinger", "Iris"]
                }
            }
        }
    },
    "Unusual": {
        "Hornet": {
            "health": 10,
            "damage": 50,
            "size": 30,
            "color": "gold",
            "aiType": "hostileDistance",
            "shape": 24,
            "speed": 12,
            "projectile": {
                "reload": 2500,
                "damage": 12.5,
                "speed": 15,
                "size": 1 / 3,
                "range": 75,
                "color": "black",
                "shape": [
                    [2, 0],
                    [-1, -1],
                    [-1, 1]
                ]
            },
            "drops": {
                "chance": 75,
                "maximum": 1,
                "choices": {
                    "Unusual": ["Stinger", "Twin"],
                    "Epic": ["Triplet"]
                }
            }
        }
    },
    "Rare": {
        "Beetle": {
            "health": 60,
            "damage": 30,
            "size": 30,
            "color": "purple",
            "aiType": "hostile",
            "shape": 26,
            "speed": 27.5,
            "drops": {
                "chance": 80,
                "maximum": 1,
                "choices": {
                    "Unusual": ["Iris"],
                    "Rare": ["Peas"]
                }
            }
        }
    },
    "Epic": {
        "Giant Ladybug": {
            "health": 200,
            "damage": 25,
            "size": 80,
            "color": "red",
            "aiType": "passive",
            "shape": 22,
            "speed": 4,
            "dropRate": .8,
            "drops": {
                "chance": 85,
                "maximum": 2,
                "choices": {
                    "Unusual": ["Twin"],
                    "Epic": ["Triplet", "Rose"]
                }
            }
        }
    },
    "Legendary": {
        "Legendary Hornet": {
            "health": 350,
            "damage": 10,
            "size": 50,
            "color": "darkGold",
            "aiType": "hostileDistance",
            "shape": 24,
            "speed": 12,
            "projectile": {
                "reload": 750,
                "damage": 5,
                "speed": 20,
                "size": 1 / 5,
                "range": 250,
                "color": "black",
                "shape": [
                    [2, 0],
                    [-1, -1],
                    [-1, 1]
                ]
            },
            "drops": {
                "chance": 95,
                "maximum": 2,
                "choices": {
                    "Legendary": ["Quad", "Stinger"],
                    "Mythical": ["Penta"]
                }
            }
        },
        "Legendary Beetle": {
            "health": 200,
            "damage": 20,
            "size": 50,
            "color": "purple",
            "aiType": "hostile",
            "shape": 26,
            "speed": 25,
            "drops": {
                "chance": 95,
                "maximum": 2,
                "choices": {
                    "Epic": ["Peas"],
                    "Legendary": ["Quad", "Stinger"]
                }
            }
        }
    },
    "Mythical": {
        "Mythical Ladybug": {
            "health": 500,
            "damage": 25,
            "size": 150,
            "color": "blue",
            "aiType": "hostile",
            "shape": 22,
            "speed": 8,
            "drops": {
                "chance": 100,
                "maximum": 3,
                "choices": {
                    "Epic": ["Triplet", "Rose"],
                    "Legendary": ["Quad"],
                    "Mythical": ["Orb", "Penta"]
                }
            }
        }
    },
    "Unique": {
        "Square": {
            "health": 8,
            "damage": 8,
            "size": 10,
            "color": "gold",
            "aiType": "square",
            "shape": 4,
            "speed": 20,
            "drops": {
                "chance": 100,
                "maximum": 5,
                "choices": {
                    "Epic": ["Triplet", "Rose"],
                    "Legendary": ["Quad"],
                    "Mythical": ["Orb", "Penta"],
                    "Unique": ["Square", "Penta"]
                }
            }
        }
    }
};

let index = 0;
for (let rarity in module.exports) {
    for (let mob in module.exports[rarity]) {
        module.exports[rarity][mob].index = index ++;
        module.exports[rarity][mob].rarity = rarity;
        module.exports[rarity][mob].name = mob;
    }
}