"use strict";

// "Client" part of the game.
// Implements game rendering
// and client interactions.

var game = new Game();
var ctx = game.context;

var Camera = {
	x: 0,
	y: 0,
	zoom: 1,
	invZoom: 1,
	moveSpeed: 256,
	zoomSpeed: 1,
	minZoom: 0.1,
	maxZoom: 2,
	screenToWorld: function(x, y) {
		return {
			x: (x - display.width * 0.5) * this.invZoom + this.x,
			y: (y - display.height * 0.5) * this.invZoom + this.y
		};
	},
	worldToScreen: function(x, y) {
		return {
			x: (x - this.x) * this.zoom + display.width * 0.5,
			y: (y - this.y) * this.zoom + display.height * 0.5
		};
	},
	update: function(dt) {
		if(game.getButton(KeyCode.W)) {
			this.y -= this.moveSpeed * this.invZoom * dt;
		}
		if(game.getButton(KeyCode.S)) {
			this.y += this.moveSpeed * this.invZoom * dt;
		}
		if(game.getButton(KeyCode.A)) {
			this.x -= this.moveSpeed * this.invZoom * dt;
		}
		if(game.getButton(KeyCode.D)) {
			this.x += this.moveSpeed * this.invZoom * dt;
		}
		if(game.getButton(KeyCode.Q)) {
			this.zoom -= this.zoomSpeed * this.zoom * dt;
		}
		if(game.getButton(KeyCode.E)) {
			this.zoom += this.zoomSpeed * this.zoom * dt;
		}
		this.zoom = Math.min(Math.max(this.zoom, this.minZoom), this.maxZoom);
		this.invZoom = 1 / this.zoom;
	}
};

var debug = false;
var stepPhysics = true;
var wantStep = false;
var turboUpdate = false;
var selection = null;

var Turbo = {
	ready: true,
	simulationSteps: 0,
	
	snapshotTimer: 0,
}

// Worker with server code
// TODO: custom events (onStart, onStop, onAssigned...)
var turboServer = new Worker('scripts/servertask.js');
turboServer.onmessage = function(msg) {
	let response = msg.data;
	console.log(response);
	switch(response.type) {
	case 'started':
		Turbo.ready = false;
		break;
	case 'finished':
		turboServer.postMessage({
			type: 'getState'
		});
		Turbo.ready = true;
		break;
	case 'assigned':
		TurboServer.postMessage({
			type: 'start',
			data: turboSimulationSteps
		});
		break;
	case 'state':
		unpackState(response.data);
		break; 
	case 'error':
		console.log(response.data);
		break;
	default:
		console.log(`Unknown response type: ${response.type}`);
		break;
	}
}

// Wrapper for communication
function engageTurbo(steps = Infinity) {
	if(!Turbo.ready)
		return;
	turboSimulationSteps = steps;
	turboServer.postMessage({
		type: 'setState',
		data: packState()
	});
}

var backgroundFar = "#182838";
var background = backgroundFar;
let bgImage = new Image();
bgImage.src = "data/bgtile.png";
bgImage.onload = function() {
	background = ctx.createPattern(bgImage, "repeat");
}
var tankSprite = new Sprite("data/tank.png");
var bulletSprite = new Sprite("data/bullet.png");

var Overlay = {
	margin: 8,
	padding: 8,
	inspectorWidth: 300,
	inspectorHeight: 500,
	inspectorBgColor: "rgba(0,0,0,0.75)",
	textColor: "#fff",
	font: "16px monospace",
	lineHeight: 16,
	pointingLineColor: "#fff",
	viewCircleColor: "#00ff80",
	decimalPlaces: 2,
	neuronRadius: 16,
	drawHelp: function(g) {
		g.fillStyle = this.textColor;
		g.font = this.font;
		g.textAlign = "left";
		g.textBaseline = "bottom";
		let y = 64;
		g.fillText('[W], [A], [S], [D] - Move', this.margin, y);
		y += this.lineHeight;
		g.fillText('[Q], [E] - Zoom', this.margin, y);
		y += this.lineHeight;
		if(!turboUpdate) {
			g.fillText('[Space] - ' + (stepPhysics ? 'Real time' : 'Pause'), this.margin, y);
			y += this.lineHeight;
			if(stepPhysics) {
				g.fillText("[Enter] - Step forward", this.margin, y);
				y += this.lineHeight;
			}
		}

		g.fillText("[End] - Toggle Turbo (WIP)", this.margin, y);
		y += this.lineHeight;
		g.fillText('[LMB] - Select object', this.margin, y);
	},
	drawStats: function(g) {
		g.fillStyle = this.textColor;
		g.font = this.font;
		g.textAlign = "left";
		g.textBaseline = "bottom";
		let y = display.height - this.margin;
		let alive = 0;
		population.forEach(function(ent) {
			if(entities.indexOf(ent) >= 0)
				alive++;
		});
		g.fillText(`Agents remaining: ${alive}`, this.margin, y);
		y -= this.lineHeight;
		g.fillText(`Agents: ${population.length}`, this.margin, y);
		y -= this.lineHeight;
		g.fillText(`Time: ${Math.floor(timePassed / 60)}m ${(timePassed % 60).toFixed(3)}s`, this.margin, y);
		y -= this.lineHeight;
		g.fillText(`Generation: ${generation}`, this.margin, y);
	},
	drawWorldQuad: function(g, x, y, color = '#ff8000', lineWidth = 3) {
		let zoomedQuadSize = quadSize * Camera.zoom;
		let pos = Camera.worldToScreen(x * quadSize, y * quadSize);
		g.lineWidth = lineWidth;
		g.strokeStyle = color;
		g.setLineDash([]);
		g.beginPath();
		g.moveTo(pos.x, pos.y + 8);
		g.lineTo(pos.x, pos.y);
		g.lineTo(pos.x + 8, pos.y);
		g.moveTo(pos.x + zoomedQuadSize, pos.y + 8);
		g.lineTo(pos.x + zoomedQuadSize, pos.y);
		g.lineTo(pos.x + zoomedQuadSize - 8, pos.y);
		g.moveTo(pos.x, pos.y + zoomedQuadSize - 8);
		g.lineTo(pos.x, pos.y + zoomedQuadSize);
		g.lineTo(pos.x + 8, pos.y + zoomedQuadSize);
		g.moveTo(pos.x + zoomedQuadSize, pos.y + zoomedQuadSize - 8);
		g.lineTo(pos.x + zoomedQuadSize, pos.y + zoomedQuadSize);
		g.lineTo(pos.x + zoomedQuadSize - 8, pos.y + zoomedQuadSize);
		//g.strokeRect(pos.x, pos.y, zoomedQuadSize, zoomedQuadSize);
		g.stroke();
	},
	drawBrain: function(g, x, y, height, brain, inLabels = [], outLabels = []) {
		//g.strokeRect(x, y, this.inspectorWidth - this.padding * 2, height);
		y += this.neuronRadius;
		x += this.neuronRadius;
		let width = this.inspectorWidth - (this.padding + this.neuronRadius) * 2;
		height -= this.neuronRadius * 2;
		//g.strokeRect(x, y, width, height);
		g.strokeStyle = this.pointingLineColor;
		g.setLineDash([]);
		let layerWidth = width / brain.layers.length;
		let neuronHeight = height / (brain.weights[0][0].length - 1);
		let layerX = x;
		let prevLayerX = x;
		brain.weights.forEach(function(l) {
			layerX += layerWidth;
			let prevNeuronHeight = neuronHeight;
			neuronHeight = height / (l.length - 1);
			for(let i = 0; i < l.length; i++) {
				for(let j = 0; j < l[i].length; j++) {
					let w = l[i][j];
					g.lineWidth = 1 + Math.abs(w) * 5;
					//w *= 128;
					g.strokeStyle = `hsl(${w > 0 ? 15 : 195},${Math.abs(w) * 100}%,50%)`;
					g.beginPath();
					g.moveTo(prevLayerX, y + prevNeuronHeight * j);
					g.lineTo(layerX, y + neuronHeight * i);
					g.stroke();
				}
			}
			prevLayerX = layerX;
		}, this);
		// Draw input neurons
		layerX = x;
		neuronHeight = height / (brain.weights[0][0].length - 1);
		for(let i = 0; i < brain.weights[0][0].length; i++) {
			// TODO: display biases
			g.beginPath();
			g.arc(layerX, y + neuronHeight * i, this.neuronRadius, 0, Math.PI * 2);
			g.fill();
			// TODO: display labels
			if(inLabels[i]) {
				
			}
		}
		// Draw other neurons
		brain.layers.forEach(function(l) {
			layerX += layerWidth;
			neuronHeight = height / (l.length - 1);
			for(let i = 0; i < l.length; i++) {
				g.beginPath();
				g.arc(layerX, y + neuronHeight * i, this.neuronRadius, 0, Math.PI * 2);
				g.fill();
			}
		}, this);
	},
	drawInspector: function(g) {
		if(!selection)
			return;
		if(entities.indexOf(selection) < 0)
			return;

		// Draw selection quad
		this.drawWorldQuad(g, selection.quad[0], selection.quad[1]);

		// Draw pointing line
		let pos = Camera.worldToScreen(selection.x, selection.y);
		let cornerX = display.width - this.inspectorWidth - this.margin;
		let cornerY = this.inspectorHeight + this.margin;
		let dx = pos.x - cornerX;
		let dy = pos.y - cornerY;
		let d = Math.min(Math.abs(dx), Math.abs(dy));
		dx = dx < 0 ? -d : d;
		dy = dy < 0 ? -d : d;
		g.lineWidth = 2;
		g.strokeStyle = this.pointingLineColor;
		g.setLineDash([]);
		g.beginPath();
		g.moveTo(cornerX, cornerY);
		g.lineTo(cornerX + dx, cornerY + dy);
		g.lineTo(pos.x, pos.y);
		g.stroke();
		g.beginPath();
		g.arc(pos.x, pos.y, selection.r * Camera.zoom + 2, 0, Math.PI * 2);
		g.stroke();
		if(selection instanceof AITank) {
			// Draw view circle
			let r = selection.view * Camera.zoom;
			let dash = r * Math.PI / 90;
			g.strokeStyle = this.viewCircleColor;
			g.setLineDash([dash, dash]);
			g.beginPath();
			g.arc(pos.x, pos.y, r, 0, Math.PI * 2);
			g.stroke();
		}
		
		// Draw information
		let left = display.width - this.margin - this.inspectorWidth;
		g.fillStyle = this.inspectorBgColor;
		g.fillRect(left, this.margin, this.inspectorWidth, this.inspectorHeight);		
		g.fillStyle = this.textColor;
		g.font = this.font;
		g.textAlign = "center";
		g.textBaseline = "bottom";
		let y = this.margin + this.padding + this.lineHeight;
		g.fillText('Inspector', left + this.inspectorWidth * 0.5, y);
		y += this.lineHeight;
		left += this.padding;
		g.textAlign = "left";
		g.fillText(`Type: ${selection.constructor.name}`, left, y);
		y += this.lineHeight;
		g.fillText(`Quad: ${selection.quad}`, left, y);
		y += this.lineHeight;
		g.fillText(`Position: (${selection.x.toFixed(this.decimalPlaces)}, ${selection.y.toFixed(this.decimalPlaces)})`, left, y);
		y += this.lineHeight;
		g.fillText(`Angle: ${toDegrees(selection.angle).toFixed(this.decimalPlaces)}\u00b0`, left, y);
		y += this.lineHeight;
		g.fillText(`Radius: ${selection.r.toFixed(this.decimalPlaces)}`, left, y);
		if(selection instanceof Tank) {
			y += this.lineHeight;
			g.fillText(`Speed: ${selection.speed.toFixed(this.decimalPlaces)}`, left, y);
			y += this.lineHeight;
			g.fillText(`Turn speed: ${toDegrees(selection.turnSpeed).toFixed(this.decimalPlaces)}\u00b0/s`, left, y);
			y += this.lineHeight;
			g.fillText(`Cooldown: ${selection.cooldown.toFixed(this.decimalPlaces)}s`, left, y);
			y += this.lineHeight;
			g.fillText('Gun state: ' + (selection.cooldownTimer > 0 ? `${selection.cooldownTimer.toFixed(this.decimalPlaces)}s remaining` : 'Ready'), left, y);
			y += this.lineHeight;
			g.fillText(`HP: ${selection.hp}`, left, y);
			if(selection instanceof AITank) {
				y += this.lineHeight;
				g.fillText(`View range: ${selection.view.toFixed(this.decimalPlaces)}`, left, y);
				y += this.lineHeight;
				g.fillText('Brain:', left, y);
				this.drawBrain(g, left, y, cornerY - y - this.padding, selection.brain, ['d', 's', 'c', 'v', '\u03c9', '?'], ['v', '\u03c9', '!']);
			}
			// TODO: Draw actions
			// Little tank scheme with directions and decisions
			// (Forward, Turn, Shoot)
		} else if(selection instanceof Bullet) {
			y += this.lineHeight;
			g.fillText(`Velocity: ${selection.velocity.toFixed(this.decimalPlaces)}`, left, y);
			y += this.lineHeight;
			g.fillText(`Life: ${selection.lifeTimer.toFixed(this.decimalPlaces)}s`, left, y);
		}
	},
	draw: function(g) {
		let pos = Camera.screenToWorld(game.mousePos.x, game.mousePos.y);
		this.drawWorldQuad(g, Math.floor(pos.x / quadSize), Math.floor(pos.y / quadSize), '#80ff00', 2);
		this.drawInspector(g);
		this.drawHelp(g);
		this.drawStats(g);
	}
};

Entity.prototype.draw = function(g) {
	g.strokeStyle = "#f0f";
	g.lineWidth = 3;
	g.setLineDash([]);
	g.beginPath();
	g.arc(this.x, this.y, this.r, 0, Math.PI * 2);
	g.stroke();
};

Bullet.prototype.draw = function(g) {
	//Entity.prototype.draw.call(this, g);
	this.sprite.draw(g, this.x, this.y, 0, 0, this.angle);
}

Tank.prototype.draw = function(g) {
	//Entity.prototype.draw.call(this, g);
	this.sprite.draw(g, this.x, this.y, 0, 0, this.angle, 0, 16);
};

AITank.prototype.draw = function(g) {
	Tank.prototype.draw.call(this, g);
}


// var tank1 = new AITank(-100, -100);
// var tank2 = new AITank(100, 100);
// new Tank(500, 500);
let positionVariation = 4096;
for(let i = 0; i < 50; i++) {
	population.push(new AITank((Math.random() - 0.5) * positionVariation, (Math.random() - 0.5) * positionVariation));
}
new Entity(0, 0, 0, 8);

game.start(function(dt) { // Render
	if(game.getButtonDown(KeyCode.Space)) {
		stepPhysics = !stepPhysics;
	}
	if(game.getButtonDown(KeyCode.End)) {
		turboUpdate = !turboUpdate;
	}

	Camera.update(dt);

	if(game.getMouseButtonDown(MouseButton.Left)) {
		let pos = Camera.screenToWorld(game.mousePos.x, game.mousePos.y);
		selection = null;
		for(let i = 0; i < entities.length; i++) {
			let ent = entities[i];
			let dx = pos.x - ent.x;
			let dy = pos.y - ent.y;
			if(dx * dx + dy * dy <= ent.r * ent.r) {
				selection = ent;
				break;
			}
		}
	}

	wantStep = game.getButtonUp(KeyCode.Return);

	ctx.clearRect(0, 0, display.width, display.height);

	// Draw bacground
	ctx.save();
	ctx.scale(Camera.zoom, Camera.zoom);
	ctx.translate(
		(Camera.invZoom * (display.width * 0.5) - Camera.x) % bgImage.width,
		(Camera.invZoom * (display.height * 0.5) - Camera.y) % bgImage.height
	);
	ctx.fillStyle = Camera.zoom > 0.5 ? background : backgroundFar;//"#182838";
	ctx.fillRect(-bgImage.width, -bgImage.height, display.width * Camera.invZoom + bgImage.width * 2, display.height * Camera.invZoom + bgImage.height * 2);
	ctx.restore();

	// Draw entities
	ctx.save();
	ctx.translate(display.width * 0.5, display.height * 0.5);
	ctx.scale(Camera.zoom, Camera.zoom);
	ctx.translate(-Camera.x, -Camera.y);
	entities.forEach(function(ent) {
		ent.update(dt);
	});
	entities.forEach(function(ent) {
		ent.draw(ctx);
	});
	ctx.restore();

	Overlay.draw(ctx);
	FPSCounter.draw(ctx);
}, function() { // Physics
	if(turboUpdate) {
		turboServer.postMessage({
			type: 'getState'
		});
	} else if(!stepPhysics || wantStep) {
		fixedUpdate(game.fixedTimestep);
		wantStep = false;
	}
}, 1 / 128);
