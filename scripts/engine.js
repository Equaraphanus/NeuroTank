"use strict";

var display = document.getElementById("display");
display.width = display.clientWidth;
display.height = display.clientHeight;

document.body.onresize = function(evt) {
	display.width = display.clientWidth;
	display.height = display.clientHeight;
};

const KeyCode = {
	Backspace: 8,
	Tab: 9,
	Return: 13,
	Shift: 16,
	Ctrl: 17,
	Alt: 18,
	Pause: 19,
	CapsLk: 20,
	Esc: 27,
	Space: 32,
	PgUp: 33,
	PgDn: 34,
	End: 35,
	Home: 36,
	ArrowLeft: 37,
	ArrowUp: 38,
	ArrowRight: 39,
	ArrowDown: 40,
	Insert: 45,
	Del: 46,
	Num0: 48,
	Num1: 49,
	Num2: 50,
	Num3: 51,
	Num4: 52,
	Num5: 53,
	Num6: 54,
	Num7: 55,
	Num8: 56,
	Num9: 57,
	A: 65,
	B: 66,
	C: 67,
	D: 68,
	E: 69,
	F: 70,
	G: 71,
	H: 72,
	I: 73,
	J: 74,
	K: 75,
	L: 76,
	M: 77,
	N: 78,
	O: 79,
	P: 80,
	Q: 81,
	R: 82,
	S: 83,
	T: 84,
	U: 85,
	V: 86,
	W: 87,
	X: 88,
	Y: 89,
	Z: 90,
	Window: 91,
	Window_Right: 92,
	Select: 93,
	Numpad0: 96,
	Numpad1: 97,
	Numpad2: 98,
	Numpad3: 99,
	Numpad4: 100,
	Numpad5: 101,
	Numpad6: 102,
	Numpad7: 103,
	Numpad8: 104,
	Numpad9: 105,
	NumpadMultiply: 106,
	NumpadAdd: 107,
	NumpadSubstruct: 109,
	NumpadDecimal: 110,
	NumpadDivide: 111,
	F1: 112,
	F2: 113,
	F3: 114,
	F4: 115,
	F5: 116,
	F6: 117,
	F7: 118,
	F8: 119,
	F9: 120,
	F10: 121,
	F11: 122,
	F12: 123,
	NumLk: 144,
	ScrollLk: 145,
	Semicolon: 186,
	Equals: 187,
	Comma: 188,
	Dash: 189,
	Period: 190,
	Slash: 191,
	Tild: 192,
	LeftBracket: 219,
	BackSlash: 220,
	RightBracket: 221,
	Quote: 222
};

const MouseButton = {
	Left: 0,
	Middle: 1,
	Right: 2
};

var SysHandledKeys = [KeyCode.F5, KeyCode.F11, KeyCode.F12];

function Rect(x, y, width, height) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
}

Rect.prototype.normalize = function() {
	if(this.width < 0) {
		this.x += this.width;
		this.width = -this.width;
	}
	if(this.height < 0) {
		this.y += this.height;
		this.height = -this.height;
	}
	return this;
};

Rect.prototype.normalized = function() {
	return (new Rect(this.x, this.y, this.width, this.height)).normalize();
}

Rect.prototype.contains = function(point) {
	var rect = this.normalized();
	return point.x > rect.x && point.x <= rect.x + rect.width && point.y > rect.y && point.y <= rect.y + rect.height;
}

function Game() {
	this.lastTime = 0;
	this.timeStamps = [];
	this.fps = 0;
	this.upd = 0;
	this.fixedUpdateAccum = 0;
	//this.paused = false;
	this.loop = this.loop.bind(this);
	
	this.context = display.getContext("2d");
	//this.webGL = display.getContext("webgl");
	
	this.keyState = new Array(256).fill(false);
	this.keyStateOld = this.keyState.slice();
	this.mouseState = 0;
	this.mouseStateOld = 0;
	this.mousePos = {x: -1, y: -1};
	
	window.addEventListener('resize', this.resizeHandler.bind(this), false);
	document.addEventListener('keydown', this.keyDownHandler.bind(this), false);
	document.addEventListener('keyup', this.keyUpHandler.bind(this), false);
	display.addEventListener('mousedown', this.mouseDownHandler.bind(this), false);
	display.addEventListener('mouseup', this.mouseUpHandler.bind(this), false);
	display.addEventListener('mousemove', this.mouseMoveHandler.bind(this), false);
}

Game.prototype.resizeHandler = function(evt) {
	this.resized = true;
};

Game.prototype.keyDownHandler = function(evt) {
	this.keyState[evt.keyCode] = true;
	if(!SysHandledKeys.includes(evt.keyCode)) evt.preventDefault();
	evt.stopPropagation();
};

Game.prototype.keyUpHandler = function(evt) {
	this.keyState[evt.keyCode] = false;
	if(!SysHandledKeys.includes(evt.keyCode)) evt.preventDefault();
	evt.stopPropagation();
};

Game.prototype.mouseDownHandler = function(evt) {
	this.mouseState |= 1 << evt.button;
	evt.preventDefault();
	evt.stopPropagation();
};

Game.prototype.mouseUpHandler = function(evt) {
	this.mouseState &= ~(1 << evt.button);
	evt.preventDefault();
	evt.stopPropagation();
};

Game.prototype.mouseMoveHandler = function(evt) {
	this.mousePos = {x: evt.offsetX, y: evt.offsetY};
	evt.preventDefault();
	evt.stopPropagation();
};

Game.prototype.getButtonDown = function(keyCode) {
	return this.keyState[keyCode] && !this.keyStateOld[keyCode];
};

Game.prototype.getButton = function(keyCode) {
	return this.keyState[keyCode] == true;
};

Game.prototype.getButtonUp = function(keyCode) {
	return !this.keyState[keyCode] && this.keyStateOld[keyCode];
};

Game.prototype.getMouseButtonDown = function(button) {
	return this.mouseState & 1 << button && !(this.mouseStateOld & 1 << button);
};

Game.prototype.getMouseButton = function(button) {
	return this.mouseState & 1 << button > 0;
};

Game.prototype.getMouseButtonUp = function(button) {
	return !(this.mouseState & 1 << button) && this.mouseStateOld & 1 << button;
};

Game.prototype.start = function(update, fixedUpdate = function() {}, fixedTimestep = 1 / 128) {
	preloader.classList.add("gone");
	this.update = update;
	this.fixedUpdate = fixedUpdate;
	this.fixedTimestep = fixedTimestep;
	requestAnimationFrame(this.loop);
};

Game.prototype.loop = function(time) {
	requestAnimationFrame(this.loop);
	let dt = (time - this.lastTime) / 1000;
	this.fixedUpdateAccum += Math.min(dt, 1);
	this.upd = 0;
	while(this.fixedUpdateAccum >= this.fixedTimestep) {
		this.fixedUpdate();
		this.fixedUpdateAccum -= this.fixedTimestep;
		this.upd++;
	}
	this.update(dt);
	this.keyStateOld = this.keyState.slice();
	this.mouseStateOld = this.mouseState;
	this.resized = false;
	while(this.timeStamps.length > 0 && this.timeStamps[0] <= time - 1000)
		this.timeStamps.shift();
	this.timeStamps.push(time); // Move before counting timestamps?
	this.fps = this.timeStamps.length;
	this.lastTime = time;
};