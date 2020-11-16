function Sprite(path) {
	this.img = new Image();
	this.img.src = path;
}

Sprite.prototype.draw = function (g, x, y, w, h, angle = 0, cx = 0, cy = 0) {
	g.save();
	//g.setTransform(1, 0, 0, 1, x, y);
	g.translate(x, y);
	g.rotate(angle);
	w = w ? w : this.img.width;
	h = h ? h : this.img.height;
	g.drawImage(this.img, -w / 2 - cx, -h / 2 - cy, w, h);
	//g.setTransform(1, 0, 0, 1, 0, 0);
	g.restore();
}