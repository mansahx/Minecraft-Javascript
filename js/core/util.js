// Core namespace + small utilities. Shared modules (used by both the main thread and the
// terrain worker) are registered as functions in MC.Shared so the worker can be built from
// their source text (Chrome forbids file:// workers, so the worker is a Blob).
var MC = window.MC || {};
window.MC = MC;
MC.Shared = MC.Shared || [];
// Shared definers run immediately on the main thread (with MC as the namespace) and are also
// serialized into the worker source.
MC.Shared.push = function (fn) { Array.prototype.push.call(this, fn); fn(MC); };
MC.VERSION = '0.0.1 Alpha by Kelompok 8bit';

MC.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
MC.lerp = function (a, b, t) { return a + (b - a) * t; };
MC.smoothstep = function (a, b, t) { t = MC.clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
MC.mod = function (a, n) { return ((a % n) + n) % n; };
MC.floor = Math.floor;

// Deterministic RNG (mulberry32)
MC.rng = function (seed) {
  var s = (seed | 0) || 1;
  var f = function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    var t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  f.int = function (n) { return Math.floor(f() * n); };
  f.range = function (a, b) { return a + f() * (b - a); };
  f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
  return f;
};

MC.hashStr = function (str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

// Position hash (for per-block random offsets etc)
MC.hash3 = function (x, y, z) {
  var h = (x * 3129871) ^ (z * 116129781) ^ y;
  h = h * h * 42317861 + h * 11;
  return (h >>> 0);
};

MC.now = function () { return performance.now(); };

MC.rgb = function (r, g, b) { return 'rgb(' + r + ',' + g + ',' + b + ')'; };
MC.hex = function (h) { return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; };
MC.mix = function (c1, c2, t) { return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t]; };

MC.formatSeed = function (s) {
  if (s === '' || s === undefined || s === null) return String((Math.random() * 4294967295) | 0);
  return String(s);
};
MC.seedToInt = function (s) {
  s = String(s).trim();
  if (/^-?\d+$/.test(s)) return parseInt(s, 10) | 0;
  return MC.hashStr(s) | 0;
};

// Simple event emitter
MC.Emitter = function () { this.l = {}; };
MC.Emitter.prototype.on = function (n, f) { (this.l[n] = this.l[n] || []).push(f); return this; };
MC.Emitter.prototype.emit = function (n, a, b, c) { var l = this.l[n]; if (l) for (var i = 0; i < l.length; i++) l[i](a, b, c); };

MC.Storage = {
  get: function (k, def) { try { var v = localStorage.getItem('mc:' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  set: function (k, v) { try { localStorage.setItem('mc:' + k, JSON.stringify(v)); } catch (e) { } },
  del: function (k) { try { localStorage.removeItem('mc:' + k); } catch (e) { } },
  keys: function (prefix) {
    var out = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf('mc:' + prefix) === 0) out.push(k.slice(3)); } } catch (e) { }
    return out;
  }
};

MC.query = (function () {
  var q = {}; var s = location.search.replace(/^\?/, '').split('&');
  for (var i = 0; i < s.length; i++) { if (!s[i]) continue; var kv = s[i].split('='); q[decodeURIComponent(kv[0])] = kv.length > 1 ? decodeURIComponent(kv[1]) : '1'; }
  return q;
})();

MC.kitsuneImg = new Image();
MC.kitsuneImg.src = 'assets/kitsune.png';


MC.drawKitsuneLogo = function (ctx, cx, cy, size, color, eyeColor, glowColor) {
  color = color || '#ffffff';
  eyeColor = eyeColor || '#0a0a0c';
  var s = size / 200;

  ctx.save();
  ctx.translate(cx, cy);

  if (glowColor) {
    var grad = ctx.createRadialGradient(0, 0, size * 0.05, 0, 0, size * 0.7);
    grad.addColorStop(0, glowColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.scale(s, s);

  if (!MC._kitsunePaths) {
    MC._kitsunePaths = {
      body: new Path2D('M -16,-96 C 5,-98 45,-90 68,-72 C 96,-50 100,-10 96,30 C 92,65 65,95 25,98 C -15,100 -60,90 -78,65 C -98,35 -98,-10 -76,-45 C -65,-25 -65,-5 -52,35 C -35,70 10,75 38,50 C 62,25 45,-20 10,-28 C -15,-32 -35,-10 -40,2 C -50,-8 -60,-10 -66,-14 C -52,-35 -48,-48 -32,-58 C -40,-68 -44,-88 -44,-88 C -38,-78 -25,-66 -18,-68 C -15,-80 -16,-96 -16,-96 Z'),
      eye: new Path2D('M -44,-34 Q -32,-44 -22,-36 Q -32,-28 -44,-34 Z'),
      tailCut: new Path2D('M -76,-45 C -95,-15 -90,10 -72,40 L -64,30 L -58,35 L -66,20 L -56,12 L -68,2 L -62,-8 L -72,-16 C -74,-28 -76,-38 -76,-45 Z')
    };
  }

  ctx.fillStyle = color;
  ctx.fill(MC._kitsunePaths.body);

  ctx.fillStyle = eyeColor;
  ctx.fill(MC._kitsunePaths.eye);

  ctx.fillStyle = eyeColor;
  ctx.fill(MC._kitsunePaths.tailCut);

  ctx.restore();
};

