/* gl.js — escape-time fractals on the GPU. z → z² + c, coloured by how fast z leaves. */
(function () {
  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "precision highp float;",
    "uniform vec2 res,ctr,jc;uniform float sc,rot,jul,sh;uniform int its;uniform vec3 pa,pb,pc,pd,ins;",
    "vec3 pal(float t){return pa+pb*cos(6.28318*(pc*t+pd));}",
    "void main(){",
    " vec2 q=(gl_FragCoord.xy-.5*res)/min(res.x,res.y)*sc;",
    " float cs=cos(rot),sn=sin(rot);q=vec2(cs*q.x-sn*q.y,sn*q.x+cs*q.y);",
    " vec2 z=ctr+q,c=z;",
    " if(jul>.5){c=jc;}else{",
    "  float x=z.x-.25,y2=z.y*z.y,qq=x*x+y2;",
    "  if(qq*(qq+x)<.25*y2||(z.x+1.)*(z.x+1.)+y2<.0625){gl_FragColor=vec4(ins,1.);return;}",
    " }",
    " float n=-1.;",
    " for(int i=0;i<4000;i++){if(i>=its)break;z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+c;if(dot(z,z)>256.){n=float(i);break;}}",
    " if(n<0.){gl_FragColor=vec4(ins,1.);return;}",
    " float s=n+1.-log2(.5*log2(dot(z,z)));",
    " vec3 col=pal(sqrt(max(s,0.))*.21+sh);",
    " col*=smoothstep(0.,3.,s);",
    " gl_FragColor=vec4(clamp(col,0.,1.),1.);",
    "}"
  ].join("\n");

  var PAL = {
    gold: [[0.55, 0.42, 0.28], [0.45, 0.38, 0.30], [1.0, 1.0, 1.0], [0.0, 0.08, 0.2]],
    sea: [[0.3, 0.5, 0.6], [0.3, 0.4, 0.4], [1.0, 1.0, 1.0], [0.55, 0.45, 0.35]],
    fire: [[0.5, 0.3, 0.2], [0.5, 0.4, 0.3], [1.0, 1.0, 0.5], [0.0, 0.1, 0.2]],
    candy: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1.0, 1.0, 1.0], [0.0, 0.33, 0.67]]
  };
  var INSIDE = [0.035, 0.03, 0.08];

  function make(cv, opt) {
    opt = opt || {};
    var gl = cv.getContext("webgl", { antialias: false, preserveDrawingBuffer: !!opt.keep, alpha: false });
    if (!gl) return null;
    function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var lp = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(lp);
    gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ["res", "ctr", "jc", "sc", "rot", "jul", "sh", "its", "pa", "pb", "pc", "pd", "ins"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    var maxDpr = opt.dpr || 2, maxPx = opt.maxPx || 2.6e6;
    function size() {
      var w = cv.clientWidth, h = cv.clientHeight;
      var d = Math.min(window.devicePixelRatio || 1, maxDpr);
      if (w * h * d * d > maxPx) d = Math.sqrt(maxPx / (w * h));
      var W = Math.max(1, Math.round(w * d)), H = Math.max(1, Math.round(h * d));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    }
    return {
      gl: gl,
      draw: function (v) {
        size();
        gl.viewport(0, 0, cv.width, cv.height);
        var p = PAL[v.pal || "gold"];
        gl.uniform2f(U.res, cv.width, cv.height);
        gl.uniform2f(U.ctr, v.x, v.y);
        gl.uniform2f(U.jc, v.cx || 0, v.cy || 0);
        gl.uniform1f(U.sc, v.sc);
        gl.uniform1f(U.rot, v.rot || 0);
        gl.uniform1f(U.jul, v.julia ? 1 : 0);
        gl.uniform1f(U.sh, v.shift || 0);
        gl.uniform1i(U.its, v.its || 300);
        gl.uniform3fv(U.pa, p[0]); gl.uniform3fv(U.pb, p[1]); gl.uniform3fv(U.pc, p[2]); gl.uniform3fv(U.pd, p[3]);
        gl.uniform3fv(U.ins, v.inside || INSIDE);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  }

  /* where a CSS pixel of the canvas sits in the complex plane */
  function toC(cv, v, px, py) {
    var w = cv.clientWidth, h = cv.clientHeight, m = Math.min(w, h);
    var qx = (px - w / 2) / m * v.sc, qy = -(py - h / 2) / m * v.sc;
    var c = Math.cos(v.rot || 0), s = Math.sin(v.rot || 0);
    return [v.x + c * qx - s * qy, v.y + s * qx + c * qy];
  }
  function toPx(cv, v, x, y) {
    var w = cv.clientWidth, h = cv.clientHeight, m = Math.min(w, h);
    var dx = x - v.x, dy = y - v.y, c = Math.cos(-(v.rot || 0)), s = Math.sin(-(v.rot || 0));
    var qx = c * dx - s * dy, qy = s * dx + c * dy;
    return [w / 2 + qx / v.sc * m, h / 2 - qy / v.sc * m];
  }
  /* steps before z leaves the circle of radius 2, or -1 if it stays for n steps */
  function escape(cx, cy, n, zx, zy) {
    zx = zx || 0; zy = zy || 0;
    for (var i = 0; i < n; i++) {
      var t = zx * zx - zy * zy + cx; zy = 2 * zx * zy + cy; zx = t;
      if (zx * zx + zy * zy > 4) return i + 1;
    }
    return -1;
  }
  window.FGL = { make: make, toC: toC, toPx: toPx, escape: escape, PAL: PAL };
})();
