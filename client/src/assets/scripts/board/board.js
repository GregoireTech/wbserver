import pathPolyfill from './path-data-polyfill';
import toolScript from './toolsScript';

const board = (socket, boardId) => {

	// Define the canvas real size
	
	const MAX_HEIGHT = 3000;
	const MAX_WIDTH = 1.6*MAX_HEIGHT;

	pathPolyfill();
	var Tools = {};
	Tools.board = document.getElementById("board");
	Tools.svg = document.getElementById("canvas");
	Tools.socket = socket;
	Tools.curTool = null;
	Tools.boardName = boardId;

	Tools.setScale = function setScale(scale) {
		if (isNaN(scale)) scale = 1;
		scale = Math.max(0.1, Math.min(10, scale));
		Tools.svg.style.willChange = 'transform';
		Tools.svg.style.transform = 'scale(' + scale + ')';


		Tools.scale = scale;
		return scale;
	}


	Tools.list = {}; // An array of all known tools. {"toolName" : {toolObject}}

	Tools.add = function (newTool) {
		if (newTool.name in Tools.list) {
			//console.log("Tools.add: The tool '" + newTool.name + "' is already" +	"in the list. Updating it...");
		}

		//Add event listener for the tool's icon
		const button = document.getElementById(newTool.name);
		if (button) {
			button.addEventListener('click', function () {
				Tools.change(button.id);
			});
		}

		//Format the new tool correctly
		Tools.applyHooks(Tools.toolHooks, newTool);

		//Add the tool to the list
		Tools.list[newTool.name] = newTool;

		//There may be pending messages for the tool
		var pending = Tools.pendingMessages[newTool.name];
		if (pending) {
			//console.log("Drawing pending messages for '%s'.", newTool.name);
			var msg;
			while (msg = pending.shift()) {
				//Transmit the message to the tool (precising that it comes from the network)
				newTool.draw(msg, false);
			}
		}
	};

	Tools.change = function (toolName) {
		if (!(toolName in Tools.list)) {
			//console.log("Trying to select a tool that has never been added!");
		}

		var newtool = Tools.list[toolName];


		//There is not necessarily already a curTool
		if (Tools.curTool != null) {
			//It's useless to do anything if the new tool is already selected
			if (newtool === Tools.curTool) return;

			//Remove the old event listeners
			for (var event in Tools.curTool.compiledListeners) {
				var listener = Tools.curTool.compiledListeners[event];
				Tools.board.removeEventListener(event, listener);
			}

			//Call the callbacks of the old tool
			Tools.curTool.onquit(newtool);
		}

		//Add the new event listeners
		for (event in newtool.compiledListeners) {
			listener = newtool.compiledListeners[event];
			Tools.board.addEventListener(event, listener, {
				'passive': false
			});
		}

		//Call the start callback of the new tool 
		newtool.onstart(Tools.curTool);
		Tools.curTool = newtool;
	};

	Tools.send = function (data, toolName) {
		toolName = toolName || Tools.curTool.name;
		var d = data;
		d.tool = toolName;
		Tools.applyHooks(Tools.messageHooks, d);
		var message = {
			"board": Tools.boardName,
			"data": d
		}
		Tools.socket.emit('broadcast', message);
	};

	Tools.drawAndSend = function (data) {
		Tools.curTool.draw(data, true);
		Tools.send(data);
	};

	//Object containing the messages that have been received before the corresponding tool
	//is loaded. keys : the name of the tool, values : array of messages for this tool
	Tools.pendingMessages = {};

	// Send a message to the corresponding tool
	function messageForTool(message) {
		var name = message.tool,
			tool = Tools.list[name];
		if (tool) {
			Tools.applyHooks(Tools.messageHooks, message);
			tool.draw(message, false);
		} else {
			///We received a message destinated to a tool that we don't have
			//So we add it to the pending messages
			if (!Tools.pendingMessages[name]) Tools.pendingMessages[name] = [message];
			else Tools.pendingMessages[name].push(message);
		}
	}

	// Apply the function to all arguments by batches
	function batchCall(fn, args) {
		var BATCH_SIZE = 1024;
		if (args.length > 0) {
			var batch = args.slice(0, BATCH_SIZE);
			var rest = args.slice(BATCH_SIZE);
			for (var i = 0; i < batch.length; i++) fn(batch[i]);
			requestAnimationFrame(batchCall.bind(null, fn, rest));
		}
	}

	// Call messageForTool recursively on the message and its children
	function handleMessage(message) {
		//Check if the message is in the expected format
		if (message.tool) messageForTool(message);
		if (message._children) batchCall(handleMessage, message._children);
		if (!message.tool && !message._children) {
			console.error("Received a badly formatted message (no tool). ", message);
		}
	}

	//Receive draw instructions from the server
	Tools.socket.on("broadcast", handleMessage);

	Tools.messageHooks = [];

	// Tools.scale = 1.0;
	// var scaleTimeout = null;

	Tools.getScale = function getScale() {
		return Tools.scale;
	}

	//List of hook functions that will be applied to tools before adding them
	Tools.toolHooks = [
		function checkToolAttributes(tool) {
			if (typeof (tool.name) !== "string") throw "A tool must have a name";
			if (typeof (tool.listeners) !== "object") {
				tool.listeners = {};
			}
			if (typeof (tool.onstart) !== "function") {
				tool.onstart = function () {};
			}
			if (typeof (tool.onquit) !== "function") {
				tool.onquit = function () {};
			}
		},
		function compileListeners(tool) {
			//compile listeners into compiledListeners
			var listeners = tool.listeners;

			//A tool may provide precompiled listeners
			var compiled = tool.compiledListeners || {};
			tool.compiledListeners = compiled;

			function compile(listener) { //closure
				const xOffset = document.getElementById('boardContainer').offsetLeft;
				const yOffset = document.getElementById('boardContainer').offsetTop;

				return (function listen(evt) {
					var x = (evt.pageX - xOffset) / Tools.getScale(),
						y = (evt.pageY - yOffset) / Tools.getScale();
					return listener(x, y, evt, false);
				});
			}

			function compileTouch(listener) { //closure
				const xOffset = document.getElementById('boardContainer').offsetLeft;
				const yOffset = document.getElementById('boardContainer').offsetTop;
				return (function touchListen(evt) {
					//Currently, we don't handle multitouch
					if (evt.changedTouches.length === 1) {
						//evt.preventDefault();
						var touch = evt.changedTouches[0];
						var x = (touch.pageX - xOffset) / Tools.getScale(),
							y = (touch.pageY - yOffset) / Tools.getScale();
						return listener(x, y, evt, true);
					}
					return true;
				});
			}

			if (listeners.press) {
				compiled["mousedown"] = compile(listeners.press);
				compiled["touchstart"] = compileTouch(listeners.press);
			}
			if (listeners.move) {
				compiled["mousemove"] = compile(listeners.move);
				compiled["touchmove"] = compileTouch(listeners.move);
			}
			if (listeners.release) {
				var release = compile(listeners.release),
					releaseTouch = compileTouch(listeners.release);
				compiled["mouseup"] = release;
				compiled["mouseleave"] = release;
				compiled["touchleave"] = releaseTouch;
				compiled["touchend"] = releaseTouch;
				compiled["touchcancel"] = releaseTouch;
			}
		}
	];

	Tools.applyHooks = function (hooks, object) {
		//Apply every hooks on the object
		hooks.forEach(function (hook) {
			hook(object);
		});
	};


	// Utility functions

	Tools.generateUID = function (prefix, suffix) {
		var uid = Date.now().toString(36); //Create the uids in chronological order
		uid += (Math.round(Math.random() * 36)).toString(36); //Add a random character at the end
		if (prefix) uid = prefix + uid;
		if (suffix) uid = uid + suffix;
		return uid;
	};

	Tools.createSVGElement = function (name) {
		return document.createElementNS(Tools.svg.namespaceURI, name);
	};

	Tools.positionElement = function (elem, x, y) {
		elem.style.top = y + "px";
		elem.style.left = x + "px";
	};

	Tools.getColor = (function color() {
		var chooser = document.getElementById("chooseColor");
		// Init with a random color
		var clrs = ["#001f3f", "#0074D9", "#7FDBFF", "#39CCCC", "#3D9970",
			"#2ECC40", "#01FF70", "#FFDC00", "#FF851B", "#FF4136",
			"#85144b", "#F012BE", "#B10DC9", "#111111", "#AAAAAA"
		];
		chooser.value = clrs[Math.random() * clrs.length | 0];
		return function () {
			return chooser.value;
		};
	})();

	Tools.getSize = (function size() {
		var chooser = document.getElementById("chooseSize");

		function update() {
			if (chooser.value < 1 || chooser.value > 50) {
				chooser.value = 3;
			}
		}
		update();

		chooser.onchange = update;
		return function () {
			return chooser.value;
		};
	})();

	Tools.getOpacity = (function opacity() {
		var chooser = document.getElementById("chooseOpacity");
		return function () {
			return Math.max(0.1, Math.min(1, chooser.value));
		};
	})();

	// Set scale depending on screen size
	const setCanvasScale = () => {
		//console.log('set canvas scale');
		let scaleToSet;
		const sizeRatio = MAX_HEIGHT / MAX_WIDTH;
		// Get screen size
		const canvasContainer = document.getElementById('boardContainer');
		const containerWidth = canvasContainer.clientWidth;
		const containerHeight = canvasContainer.clientHeight;

		// if screen size is bigger than canvas size => scale = 1
		if (containerHeight >= MAX_HEIGHT && containerWidth >= MAX_WIDTH) {
			scaleToSet = 1;
		} else {
			// Determine whether to scale based on width or height	
			if ((containerHeight / containerWidth) <= sizeRatio) {
				// Scale on height
				scaleToSet = containerHeight / MAX_HEIGHT;
			} else {
				// Scale on width
				scaleToSet = containerWidth / MAX_WIDTH;
			}
		}
		// Set canvas size to screen size
		Tools.svg.width.baseVal.value = MAX_WIDTH;
		Tools.svg.height.baseVal.value = MAX_HEIGHT;
		Tools.setScale(scaleToSet);
		// Correct the position back to top left corner
		Tools.svg.style.top = `-${(1-scaleToSet)*0.5*MAX_HEIGHT}`;
		Tools.svg.style.left = `-${(1-scaleToSet)*0.5*MAX_WIDTH}`;
	}

	// Listen for any window size change
	window.addEventListener('resize', setCanvasScale);
	//Scale the canvas on load
	setCanvasScale();
	//Get the board once the canvas is scaled
	Tools.socket.emit("getboard", Tools.boardName);



	/***********  Polyfills  ***********/
	if (!window.performance || !window.performance.now) {
		window.performance = {
			"now": Date.now
		}
	}
	if (!Math.hypot) {
		Math.hypot = function (x, y) {
			//The true Math.hypot accepts any number of parameters
			return Math.sqrt(x * x + y * y);
		}
	}

	// Set up the tools
	toolScript(Tools);


}

export default board;



/**
What does a "tool" object look like?
newtool = {
	"name" : "SuperTool",
	"listeners" : {
		"press" : function(x,y,evt){...},
		"move" : function(x,y,evt){...},
		"release" : function(x,y,evt){...},
	},
	"draw" : function(data, isLocal){
		//Print the data on Tools.svg
	},
	"onstart" : function(oldTool){...},
	"onquit" : function(newTool){...},
	"stylesheet" : "style.css",
}
*/