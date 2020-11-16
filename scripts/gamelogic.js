"use strict";

// "Server" part of the game.
// Implements game logic.

var population = [];
var generation = 0;
var timePassed = 0;
var entities = [];
var quadMap = {};
const quadSize = 256;
const tankBrainArch = [6, 3];

function getQuadId(x, y) {
	return [Math.floor(x / quadSize), Math.floor(y / quadSize)];
}

function addToQuadMap(ent, quad) {
	if(!(quad in quadMap)) {
		quadMap[quad] = [];
	}
	quadMap[quad].push(ent);
}

// Base Entity
function Entity(x = 0, y = 0, angle = 0, r = 4) {
	entities.push(this);
	this.x = x;
	this.y = y;
	this.quad = getQuadId(x, y);
	addToQuadMap(this, this.quad);
	this.angle = angle;
	this.r = r;
}

Entity.prototype.removeFrom = function(list) {
	list.splice(list.indexOf(this), 1);
}

Entity.prototype.die = function() {
	this.removeFrom(entities);
	this.removeFrom(quadMap[this.quad]);
}

Entity.prototype.update = function(dt) {};

Entity.prototype.fixedUpdate = function(timeStep) {};


// Bullet
function Bullet(x = 0, y = 0, angle = 0, lifeTime = 1, velocity = 1024, sprite = bulletSprite) {
	//bullets.push(this);
	Entity.call(this, x, y, angle, 6);
	this.sprite = sprite;
	this.lifeTimer = lifeTime;
	this.velocity = velocity;
}
Bullet.prototype = Object.create(Entity.prototype);
Bullet.prototype.constructor = Bullet;

Bullet.prototype.die = function() {
	Entity.prototype.die.call(this);
	//this.removeFrom(bullets);
}

Bullet.prototype.fixedUpdate = function(timeStep) {
	this.lifeTimer -= timeStep;
	if(this.lifeTimer <= 0) {
		this.die();
	}
	this.x += this.velocity * Math.sin(this.angle) * timeStep;
	this.y -= this.velocity * Math.cos(this.angle) * timeStep;
}


// Basic Tank
function Tank(x = 0, y = 0, angle = 0, speed = 64, turnSpeed = Math.PI, cooldown = 1, sprite = tankSprite) {
	//tanks.push(this);
	Entity.call(this, x, y, angle, 32);
	this.sprite = sprite;
	this.speed = speed;
	this.turnSpeed = turnSpeed;
	this.cooldown = cooldown;
	this.forward = 0;
	this.turn = 0;
	this.cooldownTimer = 0;
	this.hp = 1;
}
Tank.prototype = Object.create(Entity.prototype);
Tank.prototype.constructor = Tank;

Tank.prototype.die = function() {
	Entity.prototype.die.call(this);
	//this.removeFrom(tanks);
}

Tank.prototype.fixedUpdate = function(timeStep) {
	this.angle += this.turn * this.turnSpeed * timeStep;
	if(this.angle >= Math.PI * 2)
		this.angle -= Math.PI * 2;
	let forward = this.forward * this.speed * timeStep;
	this.x += forward * Math.sin(this.angle);
	this.y -= forward * Math.cos(this.angle);
	this.cooldownTimer -= timeStep;
	for(let y = this.quad[1] - 1; y <= this.quad[1] + 1; y++) {
		for(let x = this.quad[0] - 1; x <= this.quad[0] + 1; x++) {
			let sector = quadMap[[x,y]];
			if(!sector)
				continue;
			for(let i = 0; i < sector.length; i++) {
				let ent = sector[i];
				if(!(ent instanceof Bullet))
					continue;
				let dx = ent.x - this.x;
				let dy = ent.y - this.y;
				let r = this.r + ent.r;
				if(dx * dx + dy * dy > r * r)
					continue;
				ent.die();
				this.hp -= 1;
			}
		}
	}
	if(this.hp <= 0) {
		this.die();
	}
}

Tank.prototype.shoot = function() {
	if(this.cooldownTimer > 0)
		return;
	this.cooldownTimer = this.cooldown;
	// Move bullet forward to place it inside the gun
	const offset = 48;
	new Bullet(this.x + offset * Math.sin(this.angle), this.y - offset * Math.cos(this.angle), this.angle);	
}


// Tank controlled by ANN
function AITank(x = 0, y = 0, angle = 0, view = 256, speed = 64, turnSpeed = Math.PI, cooldown = 1, sprite = tankSprite) {
	Tank.call(this, x, y, angle, speed, turnSpeed, cooldown, sprite);
	this.view = view;
	this.brain = new ANNetwork(tankBrainArch);
	this.lifeTime = 0;
}
AITank.prototype = Object.create(Tank.prototype);
AITank.prototype.constructor = AITank;

AITank.prototype.fixedUpdate = function(timeStep) {
	let nearest = this.getNearestEnemy();
	let angle = nearest.entity ? (Math.atan2(nearest.entity.x - this.x, this.y - nearest.entity.y) - this.angle) : 0;
	let output = this.brain.getOutputs([nearest.distance, Math.sin(angle), Math.cos(angle), this.forward, this.turn, this.cooldownTimer > 0 ? 0 : 1]);
	this.forward = output[0];
	this.turn = output[1];
	Tank.prototype.fixedUpdate.call(this, timeStep);
	if(output[2] > 0.5) {
		this.shoot();
	}
	this.lifeTime += timeStep;
}

AITank.prototype.getNearestEnemy = function() {
	let minDist = Infinity;
	let nearest = null;
	for(let y = this.quad[1] - 1; y <= this.quad[1] + 1; y++) {
		for(let x = this.quad[0] - 1; x <= this.quad[0] + 1; x++) {
			let sector = quadMap[[x,y]];
			if(!sector)
				continue;
			for(let i = 0; i < sector.length; i++) {
				let ent = sector[i];
				if(!(ent instanceof Tank) || ent === this)
					continue;
				let dx = ent.x - this.x;
				let dy = ent.y - this.y;
				let dist = dx * dx + dy * dy;
				let view = this.view + ent.r;
				view *= view;
				if(dist > view)
					continue;
				if(dist < minDist) {
					minDist = dist;
					nearest = ent;
				}
			}
		}
	}
	return {
		entity: nearest, 
		distance: nearest ? Math.sqrt(minDist) / this.view : 1
	};
}

function unpackState(packed) {
	generation = packed.generation;
	timePassed = packed.timePassed;
	population = [];
	entities = [];
	quadMap = {};
	// Process all AITanks
	// TODO: Make separate function for unpacking individual entity
	packed.population.forEach(function(o) {
		let ent = new AITank(o.x, o.y, o.angle, o.view, o.speed, o.turnSpeed, o.cooldown, new Sprite(o.spritePath));
		ent.r = o.r;
		ent.forward = o.forward;
		ent.turn = o.turn;
		ent.cooldownTimer = o.cooldownTimer;
		ent.hp = o.hp;
		ent.lifeTime = o.lifeTime;
		ent.brain = new ANNetwork(tankBrainArch);
		ent.brain.weights = o.brainWeights;
		for(let i = 0; i < ent.brain.layers.length; i++) {
			for(let j = 0; j < ent.brain.layers[i].length; j++) {
				ent.brain.layers[i][j].bias = o.brainLayers[i][j];
			}
		}
		if(ent.hp <= 0) {
			ent.die();
		}
		population.push(ent);
	})
	packed.entities.forEach(function(o) {
		switch(o.type) {
		case 'Bullet':
		{
			let ent = new Bullet(o.x, o.y, o.angle, o.lifeTimer, o.velocity, new Sprite(o.spritePath));
			ent.r = o.r;
		}
			break;
		case 'Tank':
		{
			let ent = new Tank(o.x, o.y, o.angle, o.speed, o.turnSpeed, o.cooldown, new Sprite(o.spritePath));
			ent.r = o.r;
			ent.forward = o.forward;
			ent.turn = o.turn;
			ent.cooldownTimer = o.cooldownTimer;
			ent.hp = o.hp;
		}
			break;
		case 'AITank':
			// Already processed in population
			// TODO: May be check if AITank is in population?
			break;
		default:
			new Entity(o.x, o.y, o.angle, o.r);
		}
	});
}

function packEntities(ents) {
	return ents.map(function(ent) {
		let o = { type: ent.constructor.name, x: ent.x, y: ent.y, angle: ent.angle, r: ent.r };
		if(ent.sprite) {
			o.spritePath = ent.sprite.img.src;
		}
		if(ent instanceof Tank) {
			o.speed = ent.speed;
			o.turnSpeed = ent.turnSpeed;
			o.cooldown = ent.cooldown;
			o.forward = ent.forward;
			o.turn = ent.turn;
			o.cooldownTimer = ent.cooldownTimer;
			o.hp = ent.hp;
			if(ent instanceof AITank) {
				o.view = ent.view;
				o.brainLayers = ent.brain.layers.map(function(l) {
					return l.map(function(n) {
						return n.bias;
					});
				});
				o.brainWeights = ent.brain.weights;
				o.lifeTime = ent.lifeTime;
				//o.type = 'AITank';
			} else {
				//o.type = 'Tank';
			}
		} else if(ent instanceof Bullet) {
			o.lifeTimer = ent.lifeTimer;
			o.velocity = ent.velocity;
			//o.type = 'Bullet';
		} else {
			//o.type = 'Entity';
		}
		return o;
	});
}

function packState() {
	return {
		generation: generation,
		timePassed: timePassed,
		population: packEntities(population),
		entities: packEntities(entities)
	};
}

function fixedUpdate(timeStep) {
	for(let i = entities.length - 1; i >= 0; i--) {
		entities[i].fixedUpdate(timeStep);
	}
	// for(let i = tanks.length - 1; i >= 0; i--) {
	// 	tanks[i].fixedUpdate(timeStep);
	// }
	// for(let i = bullets.length - 1; i >= 0; i--) {
	// 	bullets[i].fixedUpdate(timeStep);
	// }
	entities.forEach(function(ent) {
		let quad = getQuadId(ent.x, ent.y);
		if(quad == ent.quad)
			return;
		ent.removeFrom(quadMap[ent.quad]);
		addToQuadMap(ent, quad);
		ent.quad = quad;
	});
	timePassed += timeStep;
}