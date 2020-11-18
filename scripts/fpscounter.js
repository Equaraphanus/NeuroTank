var FPSCounter = {
    stamps: [],
    stampsCount: 30,
    last: 0,
    x: 4,
    y: 4,
    blockWidth: 6,
    blockHeight: 32,
    blockOffset: 2,
    bgColor: "rgba(68,73,57,0.75)",
    blockColor: "#c0ff40",
    textColor: "#00eeff",
    shadowColor: "#4000c0",
    font: "bold 16px sans-serif",
    draw: function(g) {
        if(game.lastTime - this.last >= 1000) {
            this.last = game.lastTime;
            this.stamps.push(game.fps);
            this.stamps.shift();
        }
        g.save();
        g.fillStyle = this.bgColor;
        var w = this.blockOffset + this.stampsCount * (this.blockWidth + this.blockOffset);
        var h = this.blockHeight + this.blockOffset * 2;
        g.fillRect(this.x, this.y, w, h);
        var maxFps = Math.max.apply(null, this.stamps);
        var minFps = Math.min.apply(null, this.stamps);
        g.fillStyle = this.blockColor;
        for(var i = 0; i < this.stampsCount; i++) {
            var a = mapNumber(this.stamps[i], Math.max(0, minFps - 1), maxFps + 1, 0, this.blockHeight);
            g.fillRect(this.x + this.blockOffset + i * (this.blockWidth + this.blockOffset), this.y + this.blockOffset + this.blockHeight - a, this.blockWidth, a);
        }
        g.fillStyle = this.textColor;
        g.strokeStyle = this.shadowColor;
        g.font = this.font;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineWidth = 1.5;
        var text = "FPS: " + minFps + " \u2264 " + game.fps + " \u2264 " + maxFps + " | UPD: " + game.upd;
        var x = this.x + w / 2;
        var y = this.y + h / 2;
        g.strokeText(text, x, y);
        g.shadowColor = this.shadowColor;
        g.shadowBlur = 3;
        g.fillText(text, x, y);
        g.restore();
    }
};
for(var i = 0; i < FPSCounter.stampsCount; i++)
    FPSCounter.stamps.push(0);