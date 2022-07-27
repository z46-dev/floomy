(function(){
	'use strict';

	// - - -
	// # LZ77
	// ** A minimal LZ77 [de]compressor **
	var LZ77 = function(){
		// ##### Private Variables
		var
			self = {}
		,	settings = {
			refPrefix: '`',
			refIntBase: 96,
			refIntFloorCode: ' '.charCodeAt(0),
			refIntCeilCode: undefined,
			maxStringDistance: undefined,
			minStringLength: 5,
			maxStringLength: undefined,
			defaultWindow: 144,
			maxWindow: undefined,
			windowLength: undefined
		}
		;

		// ##### Public Variables

		// ##### Private Methods
		var setup = function(params) {
			params = params || {};
			settings = extend(settings, params);
	
			settings.refIntCeilCode = settings.refIntFloorCode + settings.refIntBase - 1;
			settings.maxStringDistance = Math.pow(settings.refIntBase, 2) - 1;
			settings.maxStringLength = Math.pow(settings.refIntBase, 1) - 1 + settings.minStringLength;
			settings.maxWindow = settings.maxStringDistance + settings.minStringLength;
		};

		// #### each()
		// >`@param obj [collection]` our source collection  
		// >`@param iterator [function]` the function that will be called for each element in the collection  
		// >`@param context [object]` the context our iterator should operate within  
		//
		// essentially copied from underscore.js
		var each = function(obj, iterator, context) {
			var breaker = {};
			if (obj === null) { return; }
			if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
				obj.forEach(iterator, context);
			} else if (obj.length === +obj.length) {
				for (var i = 0, l = obj.length; i < l; i++) {
					if (iterator.call(context, obj[i], i, obj) === breaker) { return; }
				}
			} else {
				for (var key in obj) {
					if (obj.hasOwnProperty(key)) {
						if (iterator.call(context, obj[key], key, obj) === breaker) { return; }
					}
				}
			}
		};

		// #### extend()
		// >`@param obj [object]` our destination object  
		// >`@params * [object(s)]` objects that will overwrite the data in the destination object, in order  
		//
		// essentially copied from underscore.js
		var extend = function(obj) {
			each(Array.prototype.slice.call(arguments, 1), function(source) {
				if (source) {
					for (var prop in source) {
						obj[prop] = source[prop];
					}
				}
			});
			return obj;
		};

		var encodeRefInt = function(value, width) {
			if ((value >= 0) && (value < (Math.pow(settings.refIntBase, width) - 1))) {
				var encoded = '';
				while (value > 0) {
					encoded = (String.fromCharCode((value % settings.refIntBase) + settings.refIntFloorCode)) + encoded;
					value = Math.floor(value / settings.refIntBase);
				}
				var missingLength = width - encoded.length;
				var i = 0;
				for (; i < missingLength; i++) {
					encoded = String.fromCharCode(settings.refIntFloorCode) + encoded;
				}
				return encoded;
			} else {
				throw 'Reference int out of range: ' + value + ' (width = ' + width + ')';
			}
		};

		var encodeRefLength = function(length) {
			return encodeRefInt(length - settings.minStringLength, 1);
		};

		var decodeRefInt = function(data, width) {
			var 
				value = 0
			,	charCode
			,	i = 0
			;
			for (; i < width; i++) {
				value *= settings.refIntBase;
				charCode = data.charCodeAt(i);
				if ((charCode >= settings.refIntFloorCode) && (charCode <= settings.refIntCeilCode)) {
					value += charCode - settings.refIntFloorCode;
				} else {
					throw 'Invalid char code in reference int: ' + charCode;
				}
			}
			return value;
		};

		var decodeRefLength = function(data) {
			return decodeRefInt(data, 1) + settings.minStringLength;
		};


		// ##### Public Methods

		// #### LZ77.compress()
		// >`@param source [string]` the source string we will be compressing  
		// >`@param params [object]` this allows us to overwrite defaults at call-time  
		//
		// This is our compression method, taking the input string (and allowing for call-time
		// paramters) and returning the compressed representation
		self.compress = function(source, params) {
			if (Object.prototype.toString.call(source) !== '[object String]') { return false; }
			
			setup(params);

			var windowLength = settings.windowLength || settings.defaultWindow;
			if (windowLength > settings.maxWindow) { throw 'Window length too large'; }

			var
				compressed = ''
			,	pos = 0
			,	lastPos = source.length - settings.minStringLength
			;
	
			while (pos < lastPos) {
				var
					searchStart = Math.max(pos - windowLength, 0)
				,	matchLength = settings.minStringLength
				,	foundMatch = false
				,	bestMatch = {
					distance: settings.maxStringDistance,
					length: 0
				}
				,	newCompressed = null
				,	isValidMatch
				,	realMatchLength
				;
		
				while ((searchStart + matchLength) < pos) {
					isValidMatch = ((source.substr(searchStart, matchLength) === source.substr(pos, matchLength)) && (matchLength < settings.maxStringLength));
					if (isValidMatch) {
						matchLength++;
						foundMatch = true;
					} else {
						realMatchLength = matchLength - 1;
						if (foundMatch && (realMatchLength > bestMatch.length)) {
							bestMatch.distance = pos - searchStart - realMatchLength;
							bestMatch.length = realMatchLength;
						}
						matchLength = settings.minStringLength;
						searchStart++;
						foundMatch = false;
					}
				}
		
				if (bestMatch.length) {
					newCompressed = settings.refPrefix + encodeRefInt(bestMatch.distance, 2) + encodeRefLength(bestMatch.length);
					pos += bestMatch.length;
				} else {
					if (source.charAt(pos) !== settings.refPrefix) {
						newCompressed = source.charAt(pos);
					} else {
						newCompressed = settings.refPrefix + settings.refPrefix;
					}
					pos++;
				}
				compressed += newCompressed;
			}

			return compressed + source.slice(pos).replace(/`/g, '``');
		};

		// #### LZ77.decompress()
		// >`@param source [string]` the source string of compressed data  
		// >`@param params [object]` this allows us to overwrite defaults at call-time  
		//
		// decompression method, taking the compressed data (as a string, and allowing for
		// call-time paramters) and returning the decompressed data
		self.decompress = function(source, params) {
			if (Object.prototype.toString.call(source) !== '[object String]') { return false; }
			
			var
				decompressed = ''
			,	pos = 0
			,	currentChar
			,	nextChar
			,	distance
			,	length
			;
	
			setup(params);
			while (pos < source.length) {
				currentChar = source.charAt(pos);
				if (currentChar !== settings.refPrefix) {
					decompressed += currentChar;
					pos++;
				} else {
					nextChar = source.charAt(pos + 1);
					if (nextChar !== settings.refPrefix) {
						distance = decodeRefInt(source.substr(pos + 1, 2), 2);
						length = decodeRefLength(source.charAt(pos + 3));
						decompressed += decompressed.substr(decompressed.length - distance - length, length);
						pos += settings.minStringLength - 1;
					} else {
						decompressed += settings.refPrefix;
						pos += 2;
					}
				}
			}
			return decompressed;
		};

		return self;
	}();

	if (typeof define !== 'undefined' && define.amd) {				// requirejs/amd
		define([], function() { return LZ77; });
	} else if (typeof module !== 'undefined' && module.exports) {	// node
		module.exports.LZ77 = LZ77;
	} else if (window !== undefined) {
		window.LZ77 = LZ77;
	}
    return LZ77
})();
module.exports.Writer = class Writer {
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

module.exports.Reader = class Reader {
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

module.exports.CRYPTO = class CRYPTO {
    constructor(key, add, multiply, modulo) {
        this.key = key;
        this.add = add;
        this.multiply = multiply;
        this.modulo = modulo;
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


const bounds = {
    // [Min, Max, Validate]
    Int8: [-128, 127, Math.round],
    Int16: [-32768, 32767, Math.round],
    Uint8: [0, 255, Math.round],
    Uint16: [0, 65535, Math.round]
};
module.exports.packetDebugger = function(packet, expected) {
    // Start debugging!
    for (const expectedKey in expected) {
        const reality = packet[expectedKey];
        // Check if it actually exists
        if (reality == null) {
            throw new Error(`PacketDebugger: Missing ${expectedKey} in packet ${JSON.stringify(packet)}`);
        }
        // Now we check to make sure it's of the proper data type!
        const dataType = bounds[expected[expectedKey]];
        if (dataType) {
            if (Math.min(dataType[1], Math.max(dataType[0], dataType[2](reality))) != reality) {
                throw new Error(`PacketDebugger: Expected ${expected[expectedKey]} data type but ${reality} is not valid! Key: ${expectedKey}. Packet: ${JSON.stringify(packet)}`);
            }
        }
        // So this part is good! Let's delete it from our packet and our expected packet.
        delete packet[expectedKey];
        delete expected[expectedKey];
    }
    if (JSON.stringify(packet) !== "{}") {
        throw new Error(`PacketDebugger: Given packet had extra data! Remaining data: ${JSON.stringify(packet)}`);
    }
    if (JSON.stringify(expected) !== "{}") {
        throw new Error(`PacketDebugger: Expected packet had extra data! Remaining data: ${JSON.stringify(expected)}`);
    }
}

const primes = ((min, max) => {
    const result = Array(max + 1).fill(0).map((_, i) => i);
    for (let i = 2; i <= Math.sqrt(max + 1); i++) {
        for (let j = i ** 2; j < max + 1; j += i) {
            delete result[j];
        }
    }
    return Object.values(result.slice(Math.max(min, 2)));
})(3, 750);

module.exports.keys = {
    inboundKeys: Array(4).fill(0).map(key => (Math.random() * 500000 | 0) + 500000),
    outboundKeys: Array(4).fill(0).map(key => (Math.random() * 500000 | 0) + 500000),
    x: BigInt(primes[Math.random() * 10 | 0]),
    y: BigInt(primes[Math.random() * 35 | 0 + 75]),
    mod: BigInt(16)
};