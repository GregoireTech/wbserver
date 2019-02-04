const toolScript = (Tools) => {

	//////////////////////////////////////////////////////////////////////////////////////
	/////////////////    PENCIL    ////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////

	(function () { //Code isolation

		//Indicates the id of the line the user is currently drawing or an empty string while the user is not drawing
		var curLineId = "",
			lastTime = performance.now(); //The time at which the last point was drawn

		//The data of the message that will be sent for every new point
		function PointMessage(x, y) {
			this.type = 'child';
			this.parent = curLineId;
			this.x = x;
			this.y = y;
		}

		function startLine(x, y, evt) {

			//Prevent the press from being interpreted by the browser
			evt.preventDefault();

			curLineId = Tools.generateUID("l"); //"l" for line

			Tools.drawAndSend({
				'type': 'line',
				'id': curLineId,
				'color': Tools.getColor(),
				'size': Tools.getSize(),
				'opacity': Tools.getOpacity()
			});

			//Immediatly add a point to the line
			continueLine(x, y);
		}

		function continueLine(x, y, evt) {
			/*Wait 70ms before adding any point to the currently drawing line.
			This allows the animation to be smother*/
			if (curLineId !== "" && performance.now() - lastTime > 70) {
				Tools.drawAndSend(new PointMessage(x, y));
				lastTime = performance.now();
			}
			if (evt) evt.preventDefault();
		}

		function stopLine(x, y) {
			//Add a last point to the line
			continueLine(x, y);
			curLineId = "";
		}

		var renderingLine = {};

		function draw(data) {
			switch (data.type) {
				case "line":
					renderingLine = createLine(data);
					break;
				case "child":
					var line = (renderingLine.id === data.parent) ? renderingLine : svg.getElementById(data.parent);
					if (!line) {
						console.error("Pencil: Hmmm... I received a point of a line that has not been created (%s).", data.parent);
						line = renderingLine = createLine({
							"id": data.parent
						}); //create a new line in order not to loose the points
					}
					addPoint(line, data.x, data.y);
					break;
				case "endline":
					//TODO?
					break;
				default:
					console.error("Pencil: Draw instruction with unknown type. ", data);
					break;
			}
		}

		function dist(x1, y1, x2, y2) {
			//Returns the distance between (x1,y1) and (x2,y2)
			return Math.hypot(x2 - x1, y2 - y1);
		}

		var pathDataCache = {};

		function getPathData(line) {
			var pathData = pathDataCache[line.id];
			if (!pathData) {
				pathData = line.getPathData();
				pathDataCache[line.id] = pathData;
			}
			return pathData;
		}

		var svg = Tools.svg;

		function addPoint(line, x, y) {
			var pts = getPathData(line), //The points that are already in the line as a PathData
				nbr = pts.length; //The number of points already in the line
			switch (nbr) {
				case 0: //The first point in the line
					//If there is no point, we have to start the line with a moveTo statement
					var npoint = {
						type: "M",
						values: [x, y]
					};
					break;
				case 1: //There is only one point.
					//Draw a curve that is segment between the old point and the new one
					npoint = {
						type: "C",
						values: [
							pts[0].values[0], pts[0].values[1],
							x, y,
							x, y,
						]
					};
					break;
				default: //There are at least two points in the line
					//We add the new point, and smoothen the line
					var ANGULARITY = 3; //The lower this number, the smoother the line
					var prev_values = pts[nbr - 1].values; // Previous point
					var ante_values = pts[nbr - 2].values; // Point before the previous one
					var prev_x = prev_values[prev_values.length - 2];
					var prev_y = prev_values[prev_values.length - 1];
					var ante_x = ante_values[ante_values.length - 2];
					var ante_y = ante_values[ante_values.length - 1];


					//We don't want to add the same point twice consecutively
					if ((prev_x === x && prev_y === y) ||
						(ante_x === x && ante_y === y)) return;

					var vectx = x - ante_x,
						vecty = y - ante_y;
					var norm = Math.hypot(vectx, vecty);
					var dist1 = dist(ante_x, ante_y, prev_x, prev_y) / norm,
						dist2 = dist(x, y, prev_x, prev_y) / norm;
					vectx /= ANGULARITY;
					vecty /= ANGULARITY;
					//Create 2 control points around the last point
					var cx1 = prev_x - dist1 * vectx,
						cy1 = prev_y - dist1 * vecty, //First control point
						cx2 = prev_x + dist2 * vectx,
						cy2 = prev_y + dist2 * vecty; //Second control point
					prev_values[2] = cx1;
					prev_values[3] = cy1;

					npoint = {
						type: "C",
						values: [
							cx2, cy2,
							x, y,
							x, y,
						]
					};
			}
			pts.push(npoint);
			line.setPathData(pts);
		}

		function createLine(lineData) {
			//Creates a new line on the canvas, or update a line that already exists with new information
			var line = svg.getElementById(lineData.id) || Tools.createSVGElement("path");
			line.id = lineData.id;
			//If some data is not provided, choose default value. The line may be updated later
			line.setAttribute("stroke", lineData.color || "black");
			line.setAttribute("stroke-width", lineData.size || 10);
			line.setAttribute("opacity", Math.max(0.1, Math.min(1, lineData.opacity)) || 1);
			svg.appendChild(line);
			return line;
		}

		Tools.add({ //The new tool
			"name": "Pencil",
			"listeners": {
				"press": startLine,
				"move": continueLine,
				"release": stopLine,
			},
			"draw": draw
		});

	})(); //End of code isolation


	//////////////////////////////////////////////////////////////////////////////////////
	/////////////////    LINE    ////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////

	(function () { //Code isolation
		//Indicates the id of the line the user is currently drawing or an empty string while the user is not drawing
		var curLineId = "",
			lastTime = performance.now(); //The time at which the last point was drawn

		//The data of the message that will be sent for every update
		function UpdateMessage(x, y) {
			this.type = 'update';
			this.id = curLineId;
			this.x2 = x;
			this.y2 = y;
		}

		function startLine(x, y, evt) {

			//Prevent the press from being interpreted by the browser
			evt.preventDefault();

			curLineId = Tools.generateUID("s"); //"s" for straight line

			Tools.drawAndSend({
				'type': 'straight',
				'id': curLineId,
				'color': Tools.getColor(),
				'size': Tools.getSize(),
				'opacity': Tools.getOpacity(),
				'x': x,
				'y': y
			});
		}

		function continueLine(x, y, evt) {
			/*Wait 70ms before adding any point to the currently drawing line.
			This allows the animation to be smother*/
			if (curLineId !== "") {
				if (performance.now() - lastTime > 70) {
					Tools.drawAndSend(new UpdateMessage(x, y));
					lastTime = performance.now();
				} else {
					draw(new UpdateMessage(x, y));
				}
			}
			if (evt) evt.preventDefault();
		}

		function stopLine(x, y) {
			//Add a last point to the line
			continueLine(x, y);
			curLineId = "";
		}

		function draw(data) {
			switch (data.type) {
				case "straight":
					createLine(data);
					break;
				case "update":
					var line = svg.getElementById(data['id']);
					if (!line) {
						console.error("Straight line: Hmmm... I received a point of a line that has not been created (%s).", data['id']);
						createLine({ //create a new line in order not to loose the points
							"id": data['id'],
							"x": data['x2'],
							"y": data['y2']
						});
					}
					updateLine(line, data);
					break;
				default:
					console.error("Straight Line: Draw instruction with unknown type. ", data);
					break;
			}
		}

		var svg = Tools.svg;

		function createLine(lineData) {
			//Creates a new line on the canvas, or update a line that already exists with new information
			var line = svg.getElementById(lineData.id) || Tools.createSVGElement("line");
			line.id = lineData.id;
			line.x1.baseVal.value = lineData['x'];
			line.y1.baseVal.value = lineData['y'];
			line.x2.baseVal.value = lineData['x2'] || lineData['x'];
			line.y2.baseVal.value = lineData['y2'] || lineData['y'];
			//If some data is not provided, choose default value. The line may be updated later
			line.setAttribute("stroke", lineData.color || "black");
			line.setAttribute("stroke-width", lineData.size || 10);
			line.setAttribute("opacity", Math.max(0.1, Math.min(1, lineData.opacity)) || 1);
			svg.appendChild(line);
			return line;
		}

		function updateLine(line, data) {
			line.x2.baseVal.value = data['x2'];
			line.y2.baseVal.value = data['y2'];
		}

		Tools.add({ //The new tool
			"name": "Straight line",
			"listeners": {
				"press": startLine,
				"move": continueLine,
				"release": stopLine,
			},
			"draw": draw
		});

	})(); //End of code isolation



	//////////////////////////////////////////////////////////////////////////////////////
	/////////////////    RECTANGLE    ////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////

	(function () { //Code isolation
		//Indicates the id of the shape the user is currently drawing or an empty string while the user is not drawing
		var curId = "",
			curUpdate = { //The data of the message that will be sent for every new point
				'type': 'update',
				'id': "",
				'x': 0,
				'y': 0,
				'x2': 0,
				'y2': 0
			},
			lastTime = performance.now(); //The time at which the last point was drawn

		function start(x, y, evt) {

			//Prevent the press from being interpreted by the browser
			evt.preventDefault();

			curId = Tools.generateUID("r"); //"r" for rectangle

			Tools.drawAndSend({
				'type': 'rect',
				'id': curId,
				'color': Tools.getColor(),
				'size': Tools.getSize(),
				'opacity': Tools.getOpacity(),
				'x': x,
				'y': y,
				'x2': x,
				'y2': y
			});

			curUpdate.id = curId;
			curUpdate.x = x;
			curUpdate.y = y;
		}

		function move(x, y, evt) {
			/*Wait 70ms before adding any point to the currently drawing shape.
			This allows the animation to be smother*/
			if (curId !== "") {
				curUpdate['x2'] = x;
				curUpdate['y2'] = y;
				if (performance.now() - lastTime > 70) {
					Tools.drawAndSend(curUpdate);
					lastTime = performance.now();
				} else {
					draw(curUpdate);
				}
			}
			if (evt) evt.preventDefault();
		}

		function stop(x, y) {
			//Add a last point to the shape
			move(x, y);
			curId = "";
		}

		function draw(data) {
			switch (data.type) {
				case "rect":
					createShape(data);
					break;
				case "update":
					var shape = svg.getElementById(data['id']);
					if (!shape) {
						console.error("Straight shape: Hmmm... I received a point of a rect that has not been created (%s).", data['id']);
						createShape({ //create a new shape in order not to loose the points
							"id": data['id'],
							"x": data['x2'],
							"y": data['y2']
						});
					}
					updateShape(shape, data);
					break;
				default:
					console.error("Straight shape: Draw instruction with unknown type. ", data);
					break;
			}
		}

		var svg = Tools.svg;

		function createShape(data) {
			//Creates a new shape on the canvas, or update a shape that already exists with new information
			var shape = svg.getElementById(data.id) || Tools.createSVGElement("rect");
			shape.id = data.id;
			updateShape(shape, data);
			//If some data is not provided, choose default value. The shape may be updated later
			shape.setAttribute("stroke", data.color || "black");
			shape.setAttribute("stroke-width", data.size || 10);
			shape.setAttribute("opacity", Math.max(0.1, Math.min(1, data.opacity)) || 1);
			svg.appendChild(shape);
			return shape;
		}

		function updateShape(shape, data) {
			shape.x.baseVal.value = Math.min(data['x2'], data['x']);
			shape.y.baseVal.value = Math.min(data['y2'], data['y']);
			shape.width.baseVal.value = Math.abs(data['x2'] - data['x']);
			shape.height.baseVal.value = Math.abs(data['y2'] - data['y']);
		}

		Tools.add({ //The new tool
			"name": "Rectangle",
			"listeners": {
				"press": start,
				"move": move,
				"release": stop,
			},
			"draw": draw
		});

	})(); //End of code isolation



	//////////////////////////////////////////////////////////////////////////////////////
	/////////////////    ERASER    ////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////

	(function eraser() { //Code isolation

		var erasing = false;

		function startErasing(x, y, evt) {
			//Prevent the press from being interpreted by the browser
			evt.preventDefault();
			erasing = true;
			erase(x, y, evt);
		}

		var msg = {
			"type": "delete",
			"id": ""
		};

		function erase(x, y, evt) {
			// evt.target should be the element over which the mouse is...
			var target = evt.target;
			if (evt.type === "touchmove") {
				// ... the target of touchmove events is the element that was initially touched,
				// not the one **currently** being touched
				var touch = evt.touches[0];
				target = document.elementFromPoint(touch.clientX, touch.clientY);
			}
			if (erasing && target !== Tools.svg) {
				msg.id = target.id;
				Tools.drawAndSend(msg);
			}
		}

		function stopErasing() {
			erasing = false;
		}

		function draw(data) {
			var elem;
			switch (data.type) {
				//TODO: add the ability to erase only some points in a line
				case "delete":
					elem = svg.getElementById(data.id);
					if (elem === null) console.error("Eraser: Tried to delete an element that does not exist.");
					else svg.removeChild(elem);
					break;
				default:
					console.error("Eraser: 'delete' instruction with unknown type. ", data);
					break;
			}
		}

		var svg = Tools.svg;

		Tools.add({ //The new tool
			"name": "Eraser",
			"listeners": {
				"press": startErasing,
				"move": erase,
				"release": stopErasing,
			},
			"draw": draw
		});

	})(); //End of code isolation



	//////////////////////////////////////////////////////////////////////////////////////
	/////////////////    TEXT    ////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////

	(function () { //Code isolation
		var board = Tools.board,
			svg = Tools.svg;

		var input = document.createElement("input");
		input.id = "textToolInput";
		input.setAttribute("autocomplete", "off");

		var curText = {
			"x": 0,
			"y": 0,
			"size": 0,
			"opacity": 1,
			"color": "#000",
			"id": 0,
			"sentText": "",
			"lastSending": 0
		};

		function clickHandler(x, y, evt) {
			if (evt.target === input) return;
			if (evt.target.tagName === "text") {
				editOldText(evt.target);
				evt.preventDefault();
				return;
			}
			curText.size = parseInt(Tools.getSize() * 1.5 + 12);
			curText.opacity = Tools.getOpacity();
			curText.color = Tools.getColor();
			curText.x = x;
			curText.y = y + curText.size / 2;

			drawCurText();
			evt.preventDefault();
		}

		function editOldText(elem) {
			curText.id = elem.id;
			curText.x = elem.x.baseVal[0].value;
			curText.y = elem.y.baseVal[0].value;
			curText.size = parseInt(elem.getAttribute("font-size"));
			curText.opacity = parseFloat(elem.getAttribute("opacity"));
			curText.color = elem.getAttribute("fill");
			startEdit();
			input.value = elem.textContent;
		}

		function drawCurText() {
			stopEdit();
			//If the user clicked where there was no text, then create a new text field
			curText.id = Tools.generateUID("t"); //"t" for text
			Tools.drawAndSend({
				'type': 'new',
				'id': curText.id,
				'color': curText.color,
				'size': curText.size,
				'opacity': curText.opacity,
				'x': curText.x,
				'y': curText.y
			});
			startEdit();
		}

		function startEdit() {
			if (!input.parentNode) board.appendChild(input);
			input.value = "";
			input.focus();
			input.addEventListener("keyup", textChangeHandler);
			input.addEventListener("blur", textChangeHandler);
		}

		function stopEdit() {
			input.blur();
			input.removeEventListener("keyup", textChangeHandler);
		}

		function textChangeHandler(evt) {
			if (evt.which === 13) {
				curText.y += 1.5 * curText.size;
				return drawCurText();
			}
			if (performance.now() - curText.lastSending > 100) {
				if (curText.sentText !== input.value) {
					Tools.drawAndSend({
						'type': "update",
						'id': curText.id,
						'txt': input.value.slice(0, 280)
					});
					curText.sentText = input.value;
					curText.lastSending = performance.now();
				}
			} else {
				clearTimeout(curText.timeout);
				curText.timeout = setTimeout(textChangeHandler, 500, evt);
			}
		}

		function draw(data, isLocal) {
			switch (data.type) {
				case "new":
					createTextField(data);
					break;
				case "update":
					var textField = document.getElementById(data.id);
					if (textField === null) {
						console.error("Text: Hmmm... I received text that belongs to an unknown text field");
						return false;
					}
					updateText(textField, data.txt);
					break;
				default:
					console.error("Text: Draw instruction with unknown type. ", data);
					break;
			}
		}

		function updateText(textField, text) {
			textField.textContent = text;
		}

		function createTextField(fieldData) {
			var elem = Tools.createSVGElement("text");
			elem.id = fieldData.id;
			elem.setAttribute("x", fieldData.x);
			elem.setAttribute("y", fieldData.y);
			elem.setAttribute("font-size", fieldData.size);
			elem.setAttribute("fill", fieldData.color);
			elem.setAttribute("opacity", Math.max(0.1, Math.min(1, fieldData.opacity)) || 1);
			if (fieldData.txt) elem.textContent = fieldData.txt;
			svg.appendChild(elem);
			return elem;
		}

		Tools.add({ //The new tool
			"name": "Text",
			"listeners": {
				"press": clickHandler,
			},
			"draw": draw
		});

	})(); //End of code isolation


	//////////////////////////////////////////////////////////////////////////////////////
	/////////////////    HAND   ////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////
/*
	(function () { //Code isolation

		var orig = {
			x: 0,
			y: 0
		};
		var pressed = false;

		function press(x, y, evt, isTouchEvent) {
			if (!isTouchEvent) {
				pressed = true;
				orig.x = window.scrollX + evt.clientX;
				orig.y = window.scrollY + evt.clientY;
			}
		}

		function move(x, y, evt, isTouchEvent) {
			if (pressed && !isTouchEvent) { //Let the browser handle touch to scroll
				window.scrollTo(orig.x - evt.clientX, orig.y - evt.clientY);
			}
		}

		function release() {
			pressed = false;
		}

		Tools.add({ //The new tool
			"name": "Hand",
			"listeners": {
				"press": press,
				"move": move,
				"release": release
			},
			"mouseCursor": "move"
		});

		//The hand tool is selected by default
		Tools.change("Hand");
	})(); //End of code isolation


	//////////////////////////////////////////////////////////////////////////////////////
	/////////////////    ZOOM    ////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////

	(function () { //Code isolation
		var ZOOM_FACTOR = .1;
		var origin = {
			scrollX: window.scrollX,
			scrollY: window.scrollY,
			x: 0.0,
			y: 0.0,
			clientY: 0,
			scale: 1.0
		};
		var moved = false,
			pressed = false;

		function zoom(origin, scale) {
			var oldScale = origin.scale;
			var newScale = Tools.setScale(scale);
			window.scrollTo(
				origin.scrollX + origin.x * (newScale - oldScale),
				origin.scrollY + origin.y * (newScale - oldScale)
			);
		}

		var animation = null;

		function animate(scale) {
			cancelAnimationFrame(animation);
			animation = requestAnimationFrame(function () {
				zoom(origin, scale);
			});
		}

		function setOrigin(x, y, evt, isTouchEvent) {
			origin.scrollX = window.scrollX;
			origin.scrollY = window.scrollY;
			origin.x = x;
			origin.y = y;
			origin.clientY = getClientY(evt, isTouchEvent);
			origin.scale = Tools.getScale();
		}

		function press(x, y, evt, isTouchEvent) {
			evt.preventDefault();
			setOrigin(x, y, evt, isTouchEvent);
			moved = false;
			pressed = true;
		}

		function move(x, y, evt, isTouchEvent) {
			if (pressed) {
				evt.preventDefault();
				var delta = getClientY(evt, isTouchEvent) - origin.clientY;
				var scale = origin.scale * (1 + delta * ZOOM_FACTOR / 100);
				if (Math.abs(delta) > 1) moved = true;
				animation = animate(scale);
			}
		}

		function onwheel(evt) {
			evt.preventDefault();
			if (evt.ctrlKey || Tools.curTool === zoomTool) {
				var scale = Tools.getScale();
				var x = evt.pageX / scale;
				var y = evt.pageY / scale;
				setOrigin(x, y, evt, false);
				animate((1 - evt.deltaY * ZOOM_FACTOR / 10) * Tools.getScale());
			} else {
				window.scrollTo(window.scrollX + evt.deltaX, window.scrollY + evt.deltaY);
			}
		}
		Tools.board.addEventListener("wheel", onwheel, {
			passive: false
		});

		Tools.board.addEventListener("touchmove", function ontouchmove(evt) {
			// 2-finger pan to zoom
			var touches = evt.touches;
			if (touches.length === 2) {
				var x0 = touches[0].clientX,
					x1 = touches[1].clientX,
					y0 = touches[0].clientY,
					y1 = touches[1].clientY,
					dx = x0 - x1,
					dy = y0 - y1;
				var x = (touches[0].pageX + touches[1].pageX) / 2 / Tools.getScale(),
					y = (touches[0].pageY + touches[1].pageY) / 2 / Tools.getScale();
				var distance = Math.sqrt(dx * dx + dy * dy);
				if (!pressed) {
					pressed = true;
					setOrigin(x, y, evt, true);
					origin.distance = distance;
				} else {
					var delta = distance - origin.distance;
					var scale = origin.scale * (1 + delta * ZOOM_FACTOR / 100);
					animate(scale);
				}
			}
		}, {
			passive: true
		});

		function touchend() {
			pressed = false;
		}
		Tools.board.addEventListener("touchend", touchend);
		Tools.board.addEventListener("touchcancel", touchend);

		function release(x, y, evt, isTouchEvent) {
			if (pressed && !moved) {
				var delta = (evt.shiftKey === true) ? -1 : 1;
				var scale = Tools.getScale() * (1 + delta * ZOOM_FACTOR);
				zoom(origin, scale);
			}
			pressed = false;
		}

		function key(down) {
			return function (evt) {
				if (evt.key === "Shift") {
					Tools.svg.style.cursor = "zoom-" + (down ? "out" : "in");
				}
			}
		}

		function getClientY(evt, isTouchEvent) {
			return isTouchEvent ? evt.changedTouches[0].clientY : evt.clientY;
		}

		var keydown = key(true);
		var keyup = key(false);

		function onstart() {
			window.addEventListener("keydown", keydown);
			window.addEventListener("keyup", keyup);
		}

		function onquit() {
			window.removeEventListener("keydown", keydown);
			window.removeEventListener("keyup", keyup);
		}

		var zoomTool = {
			"name": "Zoom",
			"listeners": {
				"press": press,
				"move": move,
				"release": release,
			},
			"onstart": onstart,
			"onquit": onquit,
			"mouseCursor": "zoom-in",
			"helpText": "Click to zoom in\nPress shift and click to zoom out",
		};
		Tools.add(zoomTool);
	})(); //End of code isolation
*/

}

export default toolScript;