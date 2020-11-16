"use strict";

// Sigmoid function
function sigmoid(x) {
	return 1 / (1 + Math.exp(-x));
}
// Sigmoid derivative
function sigmoid_d(x) {
	return sigmoid(x) * (1 - sigmoid(x));
}

// Neurons:

function Neuron(bias = 0, activate = sigmoid, activate_d = sigmoid_d) {
	this.bias = bias;
	this.disabled = false;
	this.activate = activate;
	this.activate_d = activate_d;
}

Neuron.prototype.getOutput = function(x) {
	return this.disabled ? 0 : this.activate(x + this.bias);
}

// TODO: Error correction
// Neuron.prototype.correctError = function(target, rate = 0.3) {
// 	this.
// }


// Networks:

// TODO: Activation function parameter (for each layer or entire network)
function ANNetwork(layers) {
	this.layers = [];
	this.weights = [];
	// Layer #0 -- Inputs
	for(let i = 0; i < layers.length - 1; i++) {
		this.layers.push([]);
		this.weights.push([]);
		for(let j = 0; j < layers[i + 1]; j++) {
			let neuron = new Neuron(Math.random() * 2 - 1);
			this.layers[i].push(neuron);
			this.weights[i].push([]);
			for(let k = 0; k < layers[i]; k++) {
				this.weights[i][j].push(Math.random() * 2 - 1);
			}
		}
	}
}

ANNetwork.prototype.getOutputs = function(inputs) {
	//let outputs = inputs.slice();
	let outputs;
	for(let i = 0; i < this.layers.length; i++) {
		let layer = this.layers[i];
		outputs = [];
		for(let j = 0; j < layer.length; j++) {
			let weights = this.weights[i][j];
			let inp = 0;
			for(let k = 0; k < weights.length; k++) {
				//console.log(`${inputs} ${i} ${j} ${k} ${inputs[k]} ${this.weights[i][j][k]}`);
				inp += inputs[k] * weights[k];
			}
			outputs.push(layer[j].getOutput(inp));
		}
		inputs = outputs;
	}
	return outputs;
}

ANNetwork.prototype.clone = function() {
	// let layers = this.layers.map(function(l) {
	// 	return l.length;
	// });
	// layers.unshift(this.weights[0][0].length);
	// let clone = new ANNetwork(layers);
	
	let clone = Object.assign(Object.setPrototypeOf({}, ANNetwork.prototype), this);
	clone.layers = this.layers.map(function(l) {
		return l.map(function(n) {
			return new Neuron(n.bias);
		});
	});
	clone.weights = this.weights.map(function(weights) {
		return weights.map(function(w) {
			return w.slice();
		});
	});

	return clone;
}

