const zero = '+[]';
const one = '+!![]';
const map = {};

const number = n => n === 0 ? zero : Array.from({ length: n }, () => one).join(" + ");

const fromString = string => string.split("").map(char => {
    if (char in map) {
        return map[char];
    }
    return `([]+[])[${fromString('constructor')}][${fromString('fromCharCode')}](${number(char.charCodeAt(0))})`;
}).join(" + ");

map.a = `(+{}+[])[${number(1)}]`;
map.b = `({}+[])[${number(2)}]`;
map.o = `({}+[])[${number(1)}]`;
map.e = `({}+[])[${number(4)}]`;
map.c = `({}+[])[${number(5)}]`;
map.t = `({}+[])[${number(6)}]`;
map[' '] = `({}+[])[${number(7)}]`;
map.f = `(![]+[])[${number(0)}]`;
map.s = `(![]+[])[${number(3)}]`;
map.r = `(!![]+[])[${number(1)}]`;
map.u = `(!![]+[])[${number(2)}]`;
map.i = `((+!![]/+[])+[])[${number(3)}]`;
map.n = `((+!![]/+[])+[])[${number(4)}]`;
map.S = `([]+([]+[])[${fromString('constructor')}])[${number(9)}]`;
map.g = `([]+([]+[])[${fromString('constructor')}])[${number(14)}]`;
map.p = `([]+(/-/)[${fromString('constructor')}])[${number(14)}]`;
map['\\'] = `(/\\\\/+[])[${number(1)}]`;
map.d = `(${number(13)})[${fromString('toString')}](${number(14)})`;
map.h = `(${number(17)})[${fromString('toString')}](${number(18)})`;
map.m = `(${number(22)})[${fromString('toString')}](${number(23)})`;
map.C = `((()=>{})[${fromString('constructor')}](${fromString('return escape')})()(${map['\\']}))[${number(2)}]`;

const compile = code => `(()=>{})[${fromString('constructor')}](${fromString(code)})()`;

const fs = require("fs");
module.exports = {
    files: function(target, destination) {
        const input = fs.readFileSync(target, "utf-8");
        fs.writeFileSync(destination, compile(input), "utf-8");
        return true;
    },
    raw: compile,
    string: fromString
}