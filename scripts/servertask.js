"use strict";

// "Server" task worker.
// Runs in separate thread.
// Backend for "Turbo" mode.

// Import ANN module for game logic
importScripts('neuro.js');
// Import all game logic
importScripts('gamelogic.js');

// Stripped version of client-side Sprite
function Sprite(path) {
	this.img = { src: path };
}
var tankSprite = new Sprite("data/tank.png");
var bulletSprite = new Sprite("data/bullet.png");

const fixedTimestep = 1 / 128;

var simulationCounter = Infinity;

function runSimulation() {
	postMessage({
		type: 'started',
		data: 'Simulation successfully started'
	});
	while(simulationCounter > 0) {
		fixedUpdate(fixedTimestep);
		simulationCounter--;
	}
	postMessage({
		type: 'finished',
		data: 'Simulation successfully stopped'
	});
}

onmessage = function(evt) {
	let msg = evt.data;
	if(!(msg instanceof Object && msg.hasOwnProperty('type')))
		return;
	let response = {};
	switch(msg.type) {
	case 'start':
		simulationCounter = msg.data || Infinity;
		setTimeout(runSimulation, 0);
		break;
	case 'stop':
		simulationCounter = 0;
		console.log('Stopping...');
		break;
	case 'setState':
	{
		let response = {};
		try {
			unpackState(msg.data);
			response.type = 'assigned';
			response.data = 'State successfully set';
		} catch(err) {
			response.type = 'error';
			response.data = err.toString();
		}
		postMessage(response);
	}
		break;
	case 'getState':
		postMessage({
			type: 'state',
			data: packState(entities)
		});
		break;
	default:
		postMessage({
			type: 'error',
			data: `Unknown message type '${msg.type}'`
		});
	}
}

