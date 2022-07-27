module.exports = (function() {
    let events = {},
        childProcess = require("child_process"),
        restrictedEvents = ["close"];
    class Child {
        constructor(fileName) {
            this.fileName = fileName;
            this.events = {};
            this.fork = childProcess.fork(__dirname + fileName);
            this.fork.on("message", data => {
                if (this.events[data[0]]) {
                    this.events[data[0]]([...data.slice(1)]);
                }
            })
        }
        emit(event, ...data) {
            if (restrictedEvents.indexOf(event) > -1) {
                throw new TypeError("Cannot emit restricted event " + event);
            }
            this.fork.send([event, ...data]);
        }
        on(event, callback) {
            this.events[event] = callback;
        }
        close() {
            this.fork.kill();
            if (this.events.close) {
                this.events.close();
            }
        }
    }
    process.on("message", data => {
        if (events[data[0]]) {
            events[data[0]](...data.slice(1));
        }
    });
    return {
        emit: (event, ...data) => {
            process.send([event, ...data]);
        },
        on: (event, callback) => {
            events[event] = callback;
        },
        createThread: fileName => {
            return new Child(fileName);
        }
    }
})();