"use strict";

function mapNumber(v, a0, b0, a1, b1) {
    return a1 + (b1 - a1) * ((v - a0) / (b0 - a0));
}

function interpolateCos(a, b, x) {
    var f = (1 - Math.cos(x * Math.PI)) * 0.5;
    return a * (1 - f) + b * f;
}

var Random = {
    seed: 0,
    nextFloat: function(min, max) {
        min = min || 0;
        max = max || 1;
        this.seed = (this.seed * 9301 + 49297) % 233280;
        var rnd = this.seed / 233280;
        return min + rnd * (max - min);
    },
    nextInt: function(min, max) {
        min = min || 0;
        max = max || 2;
        return Math.floor(this.nextFloat(min, max));
    }
}

function generateNoise(length, octaves, seed) {
    length = Math.max(length || 2, 2);
    octaves = Math.max(octaves || 3, 2);
    Random.seed = seed >= 0 ? seed : +new Date();
    var noise = [];
    var ret = [];
    for(var i = 0; i < length; i++) {
        noise[i] = Random.nextFloat();
    }
    for(var i = 0; i < length; i++) {
        ret[i] = 0;
        var scale = 1;
        var scaleAcc = 0;
        for(var j = 0; j < octaves; j++) {
            var pitch = length >> j;
            var sample1 = Math.floor(i / pitch) * pitch;
            var sample2 = (sample1 + pitch) % length;
            var blend = (i - sample1) / pitch;
            ret[i] += scale * ((1 - blend) * noise[sample1] + blend * noise[sample2]);
            scaleAcc += scale;
            scale /= 2;
        }
        ret[i] /= scaleAcc;
    }
    return ret;
}

function toRadians(deg) {
    return Math.PI / 180 * deg;
}

function toDegrees(rad) {
    return 180 / Math.PI * rad;
}

function loadJSONAsync(path, callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open("GET", path, true);
    xobj.onreadystatechange = function() {
        if(xobj.readyState == 4 && xobj.status == "200") callback(xobj.responseText);
    };
    xobj.send();
}

function distanceSquared(ax, ay, bx, by) {
    return (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
}

function distance(ax, ay, bx, by) {
    return Math.sqrt(distanceSquared(ax, ay, bx, by));
}

function checkLineVsRay(ax, ay, bx, by, rx, ry, angle) {
    var a1 = Math.atan2(ax - rx, ay - ry);
    var a2 = Math.atan2(bx - rx, by - ry);
    return (a1 <= angle && angle <= a2) || (a1 >= angle && angle >= a2);
}

function checkRectVsCircle(w, h, x, y, r) {
    x = Math.abs(x);
    y = Math.abs(y);
    if(x > w / 2 + r) return false;
    if(y > h / 2 + r) return false;
    if(x <= w / 2) return true;
    if(y <= h / 2) return true;
    return (x - w / 2) ** 2 + (y - h / 2) ** 2 <= r * r;
}