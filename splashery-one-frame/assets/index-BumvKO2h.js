(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;

uniform usampler2D uA;
uniform usampler2D uB;
uniform mat4 uView;
uniform vec2 uFocal;
uniform vec2 uViewport;
uniform vec2 uShift;
uniform float uMorph;
uniform float uSpread;
uniform float uArc;
uniform int uCount;
uniform float uSplatScale;
uniform float uExplode;
uniform vec3 uFrozenEye;
uniform vec3 uFrozenFwd;
uniform float uSlabs;
uniform float uStackCenter;
uniform float uStackLen;
uniform vec4 uPartRow0[16];
uniform vec4 uPartRow1[16];
uniform vec4 uPartRow2[16];
uniform vec4 uPartQuat[16];
uniform int uUseParts;
uniform int uPartTint;
uniform int uSelected;
uniform float uDim;
uniform vec4 uCut;
uniform vec4 uRep;
uniform int uPass;
uniform vec2 uDepthRange;
uniform float uFade;
uniform float uLift;
uniform vec3 uLiftPos;
uniform float uLiftScale;
uniform int uSelPass;

in uint aIndex;

out vec4 vColor;
out vec2 vCorner;
out vec2 vExtent;
out vec2 vSigma;
flat out int vSel;

const float K = 3.0;

float hash01(uint i) {
  uint x = i ^ 0x9e3779b9u;
  x = (x ^ (x >> 16u)) * 0x21f0aaadu;
  x = (x ^ (x >> 15u)) * 0x735a2d97u;
  x = x ^ (x >> 15u);
  return float(x) / 4294967296.0;
}

vec3 turbo(float t) {
  t = clamp(t, 0.0, 1.0);
  vec4 v4 = vec4(1.0, t, t * t, t * t * t);
  vec2 v2 = v4.zw * v4.z;
  return clamp(vec3(
    dot(v4, vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234)) + dot(v2, vec2(-152.94239396, 59.28637943)),
    dot(v4, vec4(0.09140261, 2.19418839, 4.84296658, -14.18503333)) + dot(v2, vec2(4.27729857, 2.82956604)),
    dot(v4, vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771)) + dot(v2, vec2(-89.90310912, 27.34824973))
  ), 0.0, 1.0);
}

const vec3 PART_COLORS[6] = vec3[6](
  vec3(0.45, 0.47, 0.5), vec3(1.0, 0.83, 0.0), vec3(0.3, 0.75, 1.0),
  vec3(1.0, 0.42, 0.3), vec3(0.55, 0.9, 0.45), vec3(0.85, 0.5, 1.0)
);

void unpack(usampler2D t, uint i, out vec3 p, out vec4 c, out vec3 s, out vec4 q, out float aux) {
  ivec2 xy = ivec2(int((i & 1023u) * 2u), int(i >> 10u));
  uvec4 a = texelFetch(t, xy, 0);
  uvec4 b = texelFetch(t, xy + ivec2(1, 0), 0);
  p = uintBitsToFloat(a.xyz);
  c = vec4(float(a.w & 255u), float((a.w >> 8u) & 255u), float((a.w >> 16u) & 255u), float(a.w >> 24u)) / 255.0;
  vec2 h0 = unpackHalf2x16(b.x);
  vec2 h1 = unpackHalf2x16(b.y);
  vec2 h2 = unpackHalf2x16(b.z);
  vec2 h3 = unpackHalf2x16(b.w);
  s = vec3(h0.x, h0.y, h1.x);
  q = vec4(h1.y, h2.x, h2.y, h3.x);
  aux = h3.y;
}

vec4 qmul(vec4 a, vec4 b) {
  return vec4(
    a.w * b.x + b.w * a.x + a.y * b.z - a.z * b.y,
    a.w * b.y + b.w * a.y + a.z * b.x - a.x * b.z,
    a.w * b.z + b.w * a.z + a.x * b.y - a.y * b.x,
    a.w * b.w - dot(a.xyz, b.xyz));
}

mat3 quatMat(vec4 q) {
  float x = q.x, y = q.y, z = q.z, w = q.w;
  return mat3(
    1.0 - 2.0 * (y * y + z * z), 2.0 * (x * y + w * z), 2.0 * (x * z - w * y),
    2.0 * (x * y - w * z), 1.0 - 2.0 * (x * x + z * z), 2.0 * (y * z + w * x),
    2.0 * (x * z + w * y), 2.0 * (y * z - w * x), 1.0 - 2.0 * (x * x + y * y));
}

void cull() {
  gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
  vColor = vec4(0.0);
}

void main() {
  uint i = aIndex;
  vec3 p; vec4 c; vec3 s; vec4 q; float aux;
  unpack(uB, i, p, c, s, q, aux);
  int part = int(aux + 0.5);
  if (uUseParts == 1 && part > 0 && part < 16) {
    vec4 r0 = uPartRow0[part];
    vec4 r1 = uPartRow1[part];
    vec4 r2 = uPartRow2[part];
    p = vec3(dot(r0.xyz, p) + r0.w, dot(r1.xyz, p) + r1.w, dot(r2.xyz, p) + r2.w);
    q = qmul(uPartQuat[part], q);
  }
  if (uPartTint == 1) c.rgb = mix(c.rgb, PART_COLORS[min(part, 5)], 0.85);
  if (uMorph < 1.0) {
    vec3 pa; vec4 ca; vec3 sa; vec4 qa; float auxa;
    unpack(uA, i, pa, ca, sa, qa, auxa);
    float h = hash01(i);
    float t = clamp((uMorph - h * uSpread) / (1.0 - uSpread), 0.0, 1.0);
    float e = t * t * (3.0 - 2.0 * t);
    float arc = sin(3.14159265 * e);
    vec3 dir = vec3(hash01(i * 3u + 11u), hash01(i * 7u + 5u), hash01(i * 13u + 3u)) - 0.5;
    dir = normalize(dir + vec3(0.0, 0.25, 0.0));
    p = mix(pa, p, e) + dir * arc * uArc;
    if (dot(qa, q) < 0.0) qa = -qa;
    q = normalize(mix(qa, q, e));
    s = mix(sa, s, e) * (1.0 - 0.5 * arc);
    c = mix(ca, c, e);
  }
  if (dot(uCut.xyz, uCut.xyz) > 0.0 && dot(uCut.xyz, p) > uCut.w) { cull(); return; }
  bool isSel = int(i) == uSelected;
  if (isSel && uLift > 0.0) {
    // The picked splat drawn once more on top, lifted out and magnified.
    if (uSelPass == 0 && uLift > 0.02) { cull(); return; }
    p = mix(p, uLiftPos, uLift);
    s *= mix(1.0, uLiftScale, uLift);
  }

  float rank = (float(gl_InstanceID) + 0.5) / float(uCount);
  if (uExplode > 0.0) {
    vec3 v = p - uFrozenEye;
    float d = dot(v, uFrozenFwd);
    float slab = floor(rank * uSlabs);
    float sd = uStackCenter + (0.5 - (slab + 0.5) / uSlabs) * uStackLen;
    float k = mix(d, sd, uExplode) / max(d, 1e-4);
    p = uFrozenEye + v * k;
    s *= k;
  }

  vec4 cam = uView * vec4(p, 1.0);
  float z = cam.z;
  if (z < 0.01) { cull(); return; }
  vec2 ndc = vec2(uFocal.x * cam.x / z, uFocal.y * cam.y / z) / (0.5 * uViewport) + uShift;
  if (abs(ndc.x) > 1.4 || abs(ndc.y) > 1.4) { cull(); return; }

  mat3 R = quatMat(q);
  vec3 ss = s * uSplatScale;
  mat3 M = mat3(R[0] * ss.x, R[1] * ss.y, R[2] * ss.z);
  mat3 Sigma = M * transpose(M);
  mat3 W = mat3(uView);
  mat3 J = mat3(
    uFocal.x / z, 0.0, 0.0,
    0.0, uFocal.y / z, 0.0,
    -uFocal.x * cam.x / (z * z), -uFocal.y * cam.y / (z * z), 0.0);
  mat3 T = J * W;
  mat3 cov = T * Sigma * transpose(T);
  float a = cov[0][0] + 0.3;
  float b = cov[0][1];
  float d = cov[1][1] + 0.3;
  float mid = 0.5 * (a + d);
  float rad = length(vec2(0.5 * (a - d), b));
  float l1 = mid + rad;
  float l2 = max(mid - rad, 0.05);
  vec2 v1 = abs(b) < 1e-12 ? (a >= d ? vec2(1.0, 0.0) : vec2(0.0, 1.0)) : normalize(vec2(b, l1 - a));
  vec2 v2 = vec2(-v1.y, v1.x);
  vec2 sig = vec2(sqrt(l1), sqrt(l2));

  vec4 col = c;
  if (uPass == 1) col.rgb = turbo((z - uDepthRange.x) / max(uDepthRange.y - uDepthRange.x, 1e-6));
  else if (uPass == 2) col.rgb = turbo(rank);
  else if (uPass == 3) col.rgb = vec3(c.a);
  vSel = isSel ? 1 : 0;
  if (uSelected >= 0 && vSel == 0) {
    // Everything but the picked splat steps back: grayer, darker, thinner.
    float k = 1.0 - uDim;
    col.rgb = mix(col.rgb, vec3(dot(col.rgb, vec3(0.3, 0.59, 0.11))), 0.8 * k) * (1.0 - 0.72 * k);
    col.a *= 1.0 - 0.45 * k;
  }
  col.a *= uFade;
  if (col.a < 1.0 / 255.0 && uRep.z + uRep.w == 0.0) { cull(); return; }

  vec2 ext = sig * K;
  float dotR = 2.6 * max(uRep.w, float(vSel));
  ext = max(ext, vec2(dotR + 1.0));
  ext = min(ext, vec2(2048.0));
  vec2 corner = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  vec2 off = corner.x * ext.x * v1 + corner.y * ext.y * v2;
  gl_Position = vec4(ndc + off / (0.5 * uViewport), 0.0, 1.0);
  vColor = col;
  vCorner = corner;
  vExtent = ext;
  vSigma = sig;
}
`,t=`#version 300 es
precision highp float;
precision highp int;
uniform vec4 uRep;
uniform int uPass;
uniform float uCountStep;
in vec4 vColor;
in vec2 vCorner;
in vec2 vExtent;
in vec2 vSigma;
flat in int vSel;
out vec4 frag;

void main() {
  vec2 px = vCorner * vExtent;
  vec2 sg = px / vSigma;
  float r2 = dot(sg, sg);
  if (uPass == 4) {
    float g = exp(-0.5 * r2) * vColor.a;
    if (g < 1.0 / 255.0) discard;
    frag = vec4(uCountStep);
    return;
  }
  float r = sqrt(r2);
  float fw = max(fwidth(r), 1e-4);
  vec3 rgb = vColor.rgb;
  float alpha = 0.0;
  vec3 outc = vec3(0.0);

  if (uRep.x > 0.0) {
    float a = exp(-0.5 * r2) * vColor.a;
    outc += uRep.x * rgb * a;
    alpha += uRep.x * a;
  }
  if (uRep.y > 0.0) {
    // Solid at two standard deviations, lit as if it were a sphere in its own frame.
    const float E = 2.0;
    float inside = 1.0 - smoothstep(E - fw, E, r);
    float n = sqrt(max(0.0, 1.0 - (r / E) * (r / E)));
    float lit = 0.28 + 0.72 * n + 0.18 * pow(n, 12.0);
    float a = inside * min(1.0, vColor.a * 1.6);
    outc += uRep.y * rgb * lit * a;
    alpha += uRep.y * a;
  }
  if (uRep.z > 0.0) {
    float ring = 1.0 - smoothstep(0.35 * fw, 1.25 * fw, abs(r - 1.0));
    float a = ring * mix(0.35, 1.0, vColor.a);
    outc += uRep.z * mix(rgb, vec3(1.0), 0.25) * a;
    alpha += uRep.z * a;
  }
  float pr = length(px);
  if (uRep.w > 0.0) {
    float a = (1.0 - smoothstep(1.0, 2.0, pr)) * mix(0.5, 1.0, vColor.a);
    outc += uRep.w * rgb * a;
    alpha += uRep.w * a;
  }
  if (vSel == 1) {
    // The picked splat: its own color, with its 1, 2 and 3 sigma rings in signal yellow.
    vec3 sel = vec3(1.0, 0.83, 0.0);
    float ring = 0.0;
    for (int k = 1; k <= 3; k++) ring = max(ring, 1.0 - smoothstep(0.4 * fw, 1.4 * fw, abs(r - float(k))));
    float dotc = 1.0 - smoothstep(1.2, 2.2, pr);
    float a = max(ring, dotc);
    outc = mix(outc, sel * a, a);
    alpha = max(alpha, a);
  }
  if (alpha < 1.0 / 255.0) discard;
  frag = vec4(outc, min(alpha, 1.0));
}
`,n=`#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`,r=`#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uMax;
uniform float uScale;
in vec2 vUv;
out vec4 frag;
vec3 turbo(float t) {
  t = clamp(t, 0.0, 1.0);
  vec4 v4 = vec4(1.0, t, t * t, t * t * t);
  vec2 v2 = v4.zw * v4.z;
  return clamp(vec3(
    dot(v4, vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234)) + dot(v2, vec2(-152.94239396, 59.28637943)),
    dot(v4, vec4(0.09140261, 2.19418839, 4.84296658, -14.18503333)) + dot(v2, vec2(4.27729857, 2.82956604)),
    dot(v4, vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771)) + dot(v2, vec2(-89.90310912, 27.34824973))
  ), 0.0, 1.0);
}
void main() {
  float n = texture(uTex, vUv).r * uScale;
  if (n < 0.5) discard;
  float t = n / uMax;
  frag = vec4(turbo(0.08 + 0.92 * t), 1.0);
}
`,i=(e,t,n)=>e<t?t:e>n?n:e,a=(e,t,n)=>e+(t-e)*n,o=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,s=e=>1-(1-e)**3,c=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],l=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],u=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],d=e=>Math.hypot(e[0],e[1],e[2]),f=e=>{let t=d(e)||1;return[e[0]/t,e[1]/t,e[2]/t]};function p(e,t){let n=f(e),r=Math.sin(t/2);return[n[0]*r,n[1]*r,n[2]*r,Math.cos(t/2)]}function m(e){let[t,n,r,i]=e;return[1-2*(n*n+r*r),2*(t*n-i*r),2*(t*r+i*n),2*(t*n+i*r),1-2*(t*t+r*r),2*(n*r-i*t),2*(t*r-i*n),2*(n*r+i*t),1-2*(t*t+n*n)]}function h(e,t){let n=m(t),r=[n[0]*e[0],n[1]*e[1],n[2]*e[2],n[3]*e[0],n[4]*e[1],n[5]*e[2],n[6]*e[0],n[7]*e[1],n[8]*e[2]],i=(e,t)=>r[e*3]*r[t*3]+r[e*3+1]*r[t*3+1]+r[e*3+2]*r[t*3+2];return[i(0,0),i(0,1),i(0,2),i(1,1),i(1,2),i(2,2)]}var g=new Float32Array(1),_=new Uint32Array(g.buffer);function v(e){g[0]=e;let t=_[0],n=t>>>16&32768,r=(t>>>23&255)-127+15,i=t&8388607;if(r>=31)return n|31743;if(r<=0){if(r<-10)return n;i|=8388608;let e=14-r;return n|(i>>e)+(i>>e-1&1)}return(n|r<<10|i>>13)+(i>>12&1)}function ee(e){return g[0]=e,_[0]}function te(e){e=i(e,0,1);let t=.13572138+e*(4.6153926+e*(-42.66032258+e*(132.13108234+e*(-152.94239396+e*59.28637943)))),n=.09140261+e*(2.19418839+e*(4.84296658+e*(-14.18503333+e*(4.27729857+e*2.82956604)))),r=.1066733+e*(12.64194608+e*(-60.58204836+e*(110.36276771+e*(-89.90310912+e*27.34824973))));return[i(t,0,1),i(n,0,1),i(r,0,1)]}function ne(e){return{count:e,pos:new Float32Array(e*3),scale:new Float32Array(e*3),rot:new Float32Array(e*4),color:new Uint8Array(e*4),part:new Uint8Array(e)}}var y=1024;function re(e,t){let n=e.count,r=t||new Uint32Array(Math.ceil(n/1024)*1024*8),{pos:i,scale:a,rot:o,color:s,part:c}=e;for(let e=0;e<n;e++){let t=e*8,n=e*3,l=e*4;r[t]=ee(i[n]),r[t+1]=ee(i[n+1]),r[t+2]=ee(i[n+2]),r[t+3]=(s[l]|s[l+1]<<8|s[l+2]<<16|s[l+3]<<24)>>>0,r[t+4]=(v(a[n])|v(a[n+1])<<16)>>>0,r[t+5]=(v(a[n+2])|v(o[l])<<16)>>>0,r[t+6]=(v(o[l+1])|v(o[l+2])<<16)>>>0,r[t+7]=(v(o[l+3])|v(c?c[e]:0)<<16)>>>0}return r}function ie(e,t,n){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(r));return r}function ae(e,t,n){let r=e.createProgram();if(e.attachShader(r,ie(e,e.VERTEX_SHADER,t)),e.attachShader(r,ie(e,e.FRAGMENT_SHADER,n)),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw Error(e.getProgramInfoLog(r));let i={},a=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<a;t++){let n=e.getActiveUniform(r,t),a=n.name.replace(/\[0\]$/,``);i[a]=e.getUniformLocation(r,n.name)}return{p:r,u:i}}var oe=(()=>{let e=new Float32Array(64),t=new Float32Array(64),n=new Float32Array(64),r=new Float32Array(64);for(let i=0;i<16;i++)e[i*4]=1,t[i*4+1]=1,n[i*4+2]=1,r[i*4+3]=1;return{r0:e,r1:t,r2:n,q:r}})(),se=class{constructor(i){let a=i.getContext(`webgl2`,{antialias:!1,alpha:!0,premultipliedAlpha:!0,depth:!1,stencil:!1,powerPreference:`high-performance`,preserveDrawingBuffer:!1});if(!a)throw Error(`WebGL2 is not available.`);this.gl=a,this.canvas=i,this.splat=ae(a,e,t),this.over=ae(a,n,r),this.tex={a:this.makeTex(),b:this.makeTex(),nextA:this.makeTex(),nextB:this.makeTex()},this.size={a:0,b:0,nextA:0,nextB:0},this.orderBuf=a.createBuffer(),this.vao=a.createVertexArray(),a.bindVertexArray(this.vao),a.bindBuffer(a.ARRAY_BUFFER,this.orderBuf);let o=a.getAttribLocation(this.splat.p,`aIndex`);a.enableVertexAttribArray(o),a.vertexAttribIPointer(o,1,a.UNSIGNED_INT,4,0),a.vertexAttribDivisor(o,1),a.bindVertexArray(null),this.emptyVao=a.createVertexArray(),this.selBuf=a.createBuffer(),this.selVao=a.createVertexArray(),a.bindVertexArray(this.selVao),a.bindBuffer(a.ARRAY_BUFFER,this.selBuf),a.enableVertexAttribArray(o),a.vertexAttribIPointer(o,1,a.UNSIGNED_INT,4,0),a.vertexAttribDivisor(o,1),a.bindVertexArray(null),this.selIndex=-1,this.orderCount=0,this.fbo=null,this.floatTarget=!!(a.getExtension(`EXT_color_buffer_float`)||a.getExtension(`EXT_color_buffer_half_float`))}makeTex(){let e=this.gl,t=e.createTexture();return e.bindTexture(e.TEXTURE_2D,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32UI,2,1,0,e.RGBA_INTEGER,e.UNSIGNED_INT,new Uint32Array(8)),t}upload(e,t,n){let r=this.gl,i=Math.max(1,Math.ceil(n/y)),a=i*y*8,o=t;t.length<a?(o=new Uint32Array(a),o.set(t.subarray(0,Math.min(t.length,a)))):t.length>a&&(o=t.subarray(0,a)),r.bindTexture(r.TEXTURE_2D,this.tex[e]),this.size[e]===i?r.texSubImage2D(r.TEXTURE_2D,0,0,0,y*2,i,r.RGBA_INTEGER,r.UNSIGNED_INT,o):r.texImage2D(r.TEXTURE_2D,0,r.RGBA32UI,y*2,i,0,r.RGBA_INTEGER,r.UNSIGNED_INT,o),this.size[e]=i}commit(e){let t=this.tex,n=this.size;[t.b,t.nextB]=[t.nextB,t.b],[n.b,n.nextB]=[n.nextB,n.b],e&&([t.a,t.nextA]=[t.nextA,t.a],[n.a,n.nextA]=[n.nextA,n.a])}setOrder(e){let t=this.gl;t.bindBuffer(t.ARRAY_BUFFER,this.orderBuf),t.bufferData(t.ARRAY_BUFFER,e,t.DYNAMIC_DRAW),this.orderCount=e.length}resize(e,t){(this.canvas.width!==e||this.canvas.height!==t)&&(this.canvas.width=e,this.canvas.height=t)}releaseFbo(){this.fbo&&=(this.gl.deleteFramebuffer(this.fbo.f),this.gl.deleteTexture(this.fbo.t),null)}ensureFbo(e,t){let n=this.gl;if(this.fbo&&this.fbo.w===e&&this.fbo.h===t)return this.fbo;this.fbo&&(n.deleteFramebuffer(this.fbo.f),n.deleteTexture(this.fbo.t));let r=n.createTexture();n.bindTexture(n.TEXTURE_2D,r),this.floatTarget?n.texImage2D(n.TEXTURE_2D,0,n.RGBA16F,e,t,0,n.RGBA,n.HALF_FLOAT,null):n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,e,t,0,n.RGBA,n.UNSIGNED_BYTE,null),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE);let i=n.createFramebuffer();return n.bindFramebuffer(n.FRAMEBUFFER,i),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,r,0),n.bindFramebuffer(n.FRAMEBUFFER,null),this.fbo={f:i,t:r,w:e,h:t},this.fbo}draw(e){let t=this.gl,n=this.canvas.width,r=this.canvas.height;t.viewport(0,0,n,r),t.bindFramebuffer(t.FRAMEBUFFER,null),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT);let i=Math.min(e.drawCount??this.orderCount,this.orderCount);if(!i)return;let a=e.pass===4;if(a){let e=this.ensureFbo(Math.ceil(n/2),Math.ceil(r/2));t.bindFramebuffer(t.FRAMEBUFFER,e.f),t.viewport(0,0,e.w,e.h),t.clear(t.COLOR_BUFFER_BIT)}let{p:o,u:s}=this.splat;t.useProgram(o),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.tex.a),t.uniform1i(s.uA,0),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,this.tex.b),t.uniform1i(s.uB,1),t.uniformMatrix4fv(s.uView,!1,e.view),t.uniform2f(s.uFocal,e.focal,e.focal),t.uniform2f(s.uViewport,n,r),t.uniform2f(s.uShift,e.shift[0],e.shift[1]),t.uniform1f(s.uMorph,e.morph),t.uniform1f(s.uSpread,e.spread),t.uniform1f(s.uArc,e.arc),t.uniform1i(s.uCount,Math.max(1,this.orderCount)),t.uniform1f(s.uSplatScale,e.splatScale),t.uniform1f(s.uExplode,e.explode),t.uniform3fv(s.uFrozenEye,e.frozenEye),t.uniform3fv(s.uFrozenFwd,e.frozenFwd),t.uniform1f(s.uSlabs,e.slabs),t.uniform1f(s.uStackCenter,e.stackCenter),t.uniform1f(s.uStackLen,e.stackLen);let c=e.parts||oe;t.uniform4fv(s.uPartRow0,c.r0),t.uniform4fv(s.uPartRow1,c.r1),t.uniform4fv(s.uPartRow2,c.r2),t.uniform4fv(s.uPartQuat,c.q),t.uniform1i(s.uUseParts,+!!e.parts),t.uniform1i(s.uPartTint,+!!e.partTint),t.uniform1i(s.uSelected,e.selected),t.uniform1f(s.uDim,e.dim),t.uniform4fv(s.uCut,e.cut),t.uniform4fv(s.uRep,e.rep),t.uniform1i(s.uPass,e.pass),t.uniform1f(s.uCountStep,this.floatTarget?1:1/255),t.uniform2f(s.uDepthRange,e.depthRange[0],e.depthRange[1]),t.uniform1f(s.uFade,e.fade),t.uniform1f(s.uLift,e.lift||0),t.uniform3fv(s.uLiftPos,e.liftPos||[0,0,0]),t.uniform1f(s.uLiftScale,e.liftScale||1),t.uniform1i(s.uSelPass,0),t.enable(t.BLEND),a?t.blendFunc(t.ONE,t.ONE):t.blendFunc(t.ONE,t.ONE_MINUS_SRC_ALPHA),t.bindVertexArray(this.vao),t.drawArraysInstanced(t.TRIANGLE_STRIP,0,4,i),t.bindVertexArray(null),e.selected>=0&&(e.lift||0)>.02&&!a&&(this.selIndex!==e.selected&&(t.bindBuffer(t.ARRAY_BUFFER,this.selBuf),t.bufferData(t.ARRAY_BUFFER,new Uint32Array([e.selected]),t.DYNAMIC_DRAW),this.selIndex=e.selected),t.uniform1i(s.uSelPass,1),t.bindVertexArray(this.selVao),t.drawArraysInstanced(t.TRIANGLE_STRIP,0,4,1),t.bindVertexArray(null)),a&&(t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,n,r),t.useProgram(this.over.p),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.fbo.t),t.uniform1i(this.over.u.uTex,0),t.uniform1f(this.over.u.uMax,e.overdrawMax||64),t.uniform1f(this.over.u.uScale,this.floatTarget?1:255),t.blendFunc(t.ONE,t.ONE_MINUS_SRC_ALPHA),t.bindVertexArray(this.emptyVao),t.drawArrays(t.TRIANGLE_STRIP,0,4),t.bindVertexArray(null))}overdrawStats(){if(!this.fbo)return null;let e=this.gl,{w:t,h:n}=this.fbo;e.bindFramebuffer(e.FRAMEBUFFER,this.fbo.f);let r=this.floatTarget?new Float32Array(t*n*4):new Uint8Array(t*n*4);e.readPixels(0,0,t,n,e.RGBA,this.floatTarget?e.FLOAT:e.UNSIGNED_BYTE,r),e.bindFramebuffer(e.FRAMEBUFFER,null);let i=0,a=0,o=0;for(let e=0;e<r.length;e+=4){let t=Math.round(r[e]);t<1||(o++,a+=t,t>i&&(i=t))}return{max:i,mean:o?a/o:0,saturated:!this.floatTarget&&i>=255}}},ce=class{constructor(){this.target=[0,0,0],this.yaw=0,this.pitch=.15,this.zoom=1.15,this.fitD=3,this.fov=.6}get distance(){return this.zoom*this.fitD}set distance(e){this.zoom=e/this.fitD}fit(e){let t=this.fov,n=2*Math.atan(Math.tan(t/2)*e);this.fitD=1/Math.sin(Math.min(n,t)/2)}eye(){let e=Math.cos(this.pitch);return[this.target[0]+this.distance*e*Math.sin(this.yaw),this.target[1]+this.distance*Math.sin(this.pitch),this.target[2]-this.distance*e*Math.cos(this.yaw)]}view(){let e=this.eye(),t=f(c(this.target,e)),n=u([0,1,0],t);Math.hypot(...n)<1e-6&&(n=[1,0,0]),n=f(n);let r=u(t,n),i=new Float32Array(16);return i[0]=n[0],i[4]=n[1],i[8]=n[2],i[12]=-l(n,e),i[1]=r[0],i[5]=r[1],i[9]=r[2],i[13]=-l(r,e),i[2]=t[0],i[6]=t[1],i[10]=t[2],i[14]=-l(t,e),i[15]=1,{m:i,eye:e,fwd:t,right:n,up:r}}focal(e){return e/2/Math.tan(this.fov/2)}};function le(e,t,n,r,i,a){let o=e.m,s=o[0]*a[0]+o[4]*a[1]+o[8]*a[2]+o[12],c=o[1]*a[0]+o[5]*a[1]+o[9]*a[2]+o[13],l=o[2]*a[0]+o[6]*a[1]+o[10]*a[2]+o[14];if(l<.01)return null;let u=t*s/l/(n/2)+i[0],d=t*c/l/(r/2)+i[1];return[(u+1)/2*n,(1-d)/2*r,l]}function ue(e){return new Worker(new URL(`sort-BN45X0aF.js`,import.meta.url).href,{type:`module`,name:e?.name})}function de(e){return new Worker(new URL(`data-CjamYWIM.js`,import.meta.url).href,{type:`module`,name:e?.name})}var fe=matchMedia(`(prefers-reduced-motion: reduce)`),pe=class{constructor(e,t,n){this.w=e,this.name=t,this.n=0,this.wait=new Map,this.dead=null,e.onmessage=e=>{let{id:n,ok:r,result:i,error:a,stack:o}=e.data,s=this.wait.get(n);if(s){if(this.wait.delete(n),r)return s.resolve(i);o&&console.debug(`${t}:`,o),s.reject(Error(a))}};let r=e=>{if(!this.dead){this.dead=Error(e);for(let e of this.wait.values())e.reject(this.dead);this.wait.clear(),n(this.dead)}};e.onerror=e=>{e.preventDefault?.(),r(me(t,e))},e.onmessageerror=()=>r(`The ${t} sent a message this page could not read.`)}call(e,t={},n=[]){if(this.dead)return Promise.reject(this.dead);let r=++this.n;return new Promise((i,a)=>{this.wait.set(r,{resolve:i,reject:a}),this.w.postMessage({id:r,op:e,args:t},n)})}};function me(e,t){return t&&t.message?`The ${e} stopped: ${t.message.replace(/^Uncaught (Error: )?/,``)}`:`The ${e} could not start: its script did not load.`}var he=class{constructor(e){this.host=e,this.canvas=document.createElement(`canvas`),this.canvas.className=`stage-gl`,this.canvas.setAttribute(`aria-hidden`,`true`),this.overlay=document.createElement(`canvas`),this.overlay.className=`stage-overlay`,this.overlay.setAttribute(`aria-hidden`,`true`),e.prepend(this.overlay),e.prepend(this.canvas),this.ctx=this.overlay.getContext(`2d`),this.gl=new se(this.canvas),this.cam=new ce,this.cam.zoom=1.15,this.broken=!1,this.onError=e=>console.error(e);let t=e=>{if(this.broken=!0,this.pending){let t=this.pending;this.pending=null,t.reject(e)}this.onError(e)};this.data=new pe(new de,`data thread`,t),this.sorter=new ue,this.sorter.onmessage=e=>this.onOrder(e.data),this.sorter.onerror=e=>{e.preventDefault?.(),t(Error(me(`sort thread`,e)))},this.sorter.onmessageerror=()=>t(Error(`The sort thread sent a message this page could not read.`)),this.canvas.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),t(Error(`The graphics chip dropped this page's drawing context.`))}),this.version=0,this.shown=0,this.pending=null,this.sortBusy=!1,this.lastSort=null,this.count=0,this.listeners=new Set,this.rep=[1,0,0,0],this.repTarget=[1,0,0,0],this.pass=0,this.drawCount=null,this.selected=-1,this.dim=1,this.dimTarget=1,this.cut=[0,0,0,0],this.parts=null,this.partMats=null,this.partTint=!1,this.shift=[0,.04],this.shiftTarget=[0,.04],this.displayCount=null,this.splatScale=1,this.fade=1,this.fadeTarget=1,this.morph={t:1,dur:1,spread:.5,arc:0,done:null,start:0,manual:!1},this.serial=0,this.lastDrawn=``,this.idleFrames=0,this.awakeUntil=performance.now()+3e4,this.lift=0,this.liftPos=[0,0,0],this.liftScale=1,this.explode={amount:0,frozen:!1,eye:[0,0,0],fwd:[0,0,1],center:3,len:3,slabs:24},this.overdrawMax=48,this.spin=.1,this.spinOn=!0,this.camTween=null,this.idleAt=0,this.gesture=`orbit`,this.pointer=null,this.onTap=null,this.onPull=null,this.visible=!0,this.fps=60,this.sortMs=0,this.dpr=Math.min(devicePixelRatio||1,matchMedia(`(pointer: coarse)`).matches?2:1.5),this.slow=0,this.bindPointer(),new ResizeObserver(()=>this.resize()).observe(e),this.resize(),new IntersectionObserver(e=>{this.visible=e[0].isIntersecting}).observe(e),this.t0=performance.now(),this.last=this.t0,this.loop=this.loop.bind(this),requestAnimationFrame(this.loop)}on(e){return this.listeners.add(e),()=>this.listeners.delete(e)}resize(){let e=this.host.getBoundingClientRect();this.cssW=Math.max(1,e.width),this.cssH=Math.max(1,e.height);let t=Math.round(this.cssW*this.dpr),n=Math.round(this.cssH*this.dpr);this.gl.resize(t,n),this.overlay.width=Math.round(this.cssW*Math.min(devicePixelRatio||1,2)),this.overlay.height=Math.round(this.cssH*Math.min(devicePixelRatio||1,2))}setCloud({gpu:e,pos:t,parts:n,count:r}){let i=++this.version;return this.sorter.postMessage({type:`set`,to:t.slice(),count:r,parts:n?n.slice():null}),this.gl.upload(`nextB`,e,r),new Promise((e,t)=>{if(this.broken)return t(Error(`The page's threads have stopped.`));this.pending={version:i,reject:t,commit:()=>{this.gl.commit(!1),this.count=r,this.morph.t=1,this.morph.manual=!1,e()}},this.requestSort(!0)})}fly({from:e,to:t,posFrom:n,posTo:r,count:i,parts:a},{duration:o=2.2,spread:s=.55,arc:c=.35}={}){let l=++this.version;return this.sorter.postMessage({type:`set`,from:n.slice(),to:r.slice(),count:i,parts:a?a.slice():null}),this.gl.upload(`nextB`,t,i),this.gl.upload(`nextA`,e,i),fe.matches&&(o=.35),new Promise((e,t)=>{if(this.broken)return t(Error(`The page's threads have stopped.`));this.pending={version:l,reject:t,commit:()=>{this.gl.commit(!0),this.count=i,Object.assign(this.morph,{t:0,dur:o,spread:s,arc:c,start:performance.now(),done:e,manual:!1})}},this.requestSort(!0)})}liveSet(e,t,n){this.pending||n!==this.count||(this.gl.upload(`b`,e,n),this.serial++,this.sorter.postMessage({type:`set`,to:t.slice(),count:n}),this.requestSort(!0))}showPair({from:e,to:t,posFrom:n,posTo:r,count:i},a){let o=++this.version;return this.sorter.postMessage({type:`set`,from:n,to:r,count:i},[n.buffer,r.buffer]),this.gl.upload(`nextB`,t,i),this.gl.upload(`nextA`,e,i),new Promise((e,t)=>{if(this.broken)return t(Error(`The page's threads have stopped.`));this.pending={version:o,reject:t,commit:()=>{this.gl.commit(!0),this.count=i,Object.assign(this.morph,{t:a,spread:0,arc:0,manual:!0,done:null}),e()}},this.requestSort(!0)})}requestSort(e=!1){if(this.sortBusy){e&&(this.sortAgain=!0);return}if(this.explode.frozen&&!e&&!this.pending||!this.pending&&!this.count)return;let t=this.cam.view().fwd,n=this.lastSort,r=n&&t[0]*n.f[0]+t[1]*n.f[1]+t[2]*n.f[2]>.99996&&Math.abs(this.morph.t-n.morph)<.004&&(this.partKey||``)===n.parts;(e||!r)&&(this.lastSort={f:t,morph:this.morph.t,parts:this.partKey||``},this.sortBusy=!0,this.sorter.postMessage({type:`sort`,fwd:t,morph:this.morph.t,spread:this.morph.spread,version:this.version}))}onOrder({order:e,version:t,ms:n}){if(this.sortBusy=!1,!e)this.pending&&this.requestSort(!0);else{if(this.sortMs=this.sortMs?this.sortMs*.8+n*.2:n,this.serial++,this.pending&&t===this.pending.version){this.gl.setOrder(e);let n=this.pending;this.pending=null,this.shown=t,n.commit()}else t===this.shown&&!this.pending&&(this.explode.frozen||this.gl.setOrder(e));(this.sortAgain||this.pending)&&(this.sortAgain=!1,this.requestSort(!0))}}setParts(e,t){let n=new Float32Array(64),r=new Float32Array(64),i=new Float32Array(64),a=new Float32Array(64),o=new Float32Array(192),s=``;for(let c=0;c<16;c++){let l=e[c],u=l&&t[c]||0;s+=u.toFixed(3);let d=l?p(l.axis,u):[0,0,0,1],f=m(d),h=l?l.pivot:[0,0,0],g=[0,1,2].map(e=>h[e]-(f[e*3]*h[0]+f[e*3+1]*h[1]+f[e*3+2]*h[2]));n.set([f[0],f[1],f[2],g[0]],c*4),r.set([f[3],f[4],f[5],g[1]],c*4),i.set([f[6],f[7],f[8],g[2]],c*4),a.set(d,c*4),o.set([f[0],f[1],f[2],g[0],f[3],f[4],f[5],g[1],f[6],f[7],f[8],g[2]],c*12)}this.parts={r0:n,r1:r,r2:i,q:a},s!==this.partKey&&(this.partKey=s,this.sorter.postMessage({type:`parts`,mats:o}))}clearParts(){this.parts=null,this.partKey=``,this.sorter.postMessage({type:`parts`,mats:null})}view(e,t=1.4){let n={yaw:this.cam.yaw,pitch:this.cam.pitch,zoom:this.cam.zoom,target:this.cam.target.slice(),fov:this.cam.fov};if(e.yaw!==void 0){let t=e.yaw-n.yaw;e={...e,yaw:n.yaw+Math.atan2(Math.sin(t),Math.cos(t))}}this.camTween={from:n,to:e,start:performance.now(),dur:fe.matches?.01:t}}freeze(){let e=this.cam.view(),t=this.explode;t.frozen=!0,t.eye=e.eye,t.fwd=e.fwd,t.right=e.right,t.up=e.up,t.center=this.cam.distance,t.len=3.4,t.slabs=16,t.yaw0=this.cam.yaw,t.pitch0=this.cam.pitch,t.zoom0=this.cam.zoom}thaw(){this.explode.frozen=!1,this.explode.amount=0,this.requestSort(!0)}wake(e=3e4){this.awakeUntil=Math.max(this.awakeUntil,performance.now()+e)}get awake(){return performance.now()<this.awakeUntil}bindPointer(){let e=this.host;for(let t of[`pointerdown`,`pointermove`,`keydown`,`wheel`])e.addEventListener(t,()=>this.wake(),{passive:!0});e.addEventListener(`pointerdown`,t=>{if(t.button!==0||!t.isPrimary||t.target.closest(`button, a, input, label, .hud-interactive`))return;let n=e.getBoundingClientRect();this.pointer={id:t.pointerId,x0:t.clientX,y0:t.clientY,x:t.clientX,y:t.clientY,t0:performance.now(),yaw0:this.cam.yaw,pitch0:this.cam.pitch,moved:!1,r:n},this.idleAt=performance.now(),this.gesture===`pull`&&this.onPull&&this.onPull(`start`,0,t)}),e.addEventListener(`pointermove`,t=>{let n=this.pointer;if(!n||t.pointerId!==n.id)return;n.x=t.clientX,n.y=t.clientY;let r=n.x-n.x0,a=n.y-n.y0;if(!n.moved&&Math.hypot(r,a)>6){n.moved=!0;try{e.setPointerCapture(t.pointerId)}catch{}}n.moved&&(this.idleAt=performance.now(),this.gesture===`pull`&&this.onPull?this.onPull(`move`,r/Math.max(170,n.r.width*.5),t):this.gesture===`cut`&&this.onCut?(this.onCut((n.x-(n.lastX??n.x0))/n.r.width),n.lastX=n.x):this.gesture===`orbit`&&(this.camTween=null,this.cam.yaw=n.yaw0+r/n.r.width*3.2,t.pointerType!==`touch`&&(this.cam.pitch=i(n.pitch0+a/n.r.height*2,-1.2,1.2))))});let t=t=>{let n=this.pointer;if(n&&t.pointerId===n.id&&(this.pointer=null,this.idleAt=performance.now(),this.gesture===`pull`&&this.onPull&&this.onPull(`end`,0,t),!n.moved&&t.type===`pointerup`&&performance.now()-n.t0<500&&this.onTap)){let n=e.getBoundingClientRect();this.onTap((t.clientX-n.left)/n.width,(t.clientY-n.top)/n.height)}};e.addEventListener(`pointerup`,t),e.addEventListener(`pointercancel`,t)}devicePoint(e,t){return[e*this.canvas.width,t*this.canvas.height]}async pick(e,t,n){let r=this.cam.view(),[i,a]=this.devicePoint(t,n);return this.data.call(`pick`,{key:e,view:r.m,focal:this.cam.focal(this.canvas.height),w:this.canvas.width,h:this.canvas.height,shift:this.shift,x:i,y:a})}loop(e){requestAnimationFrame(this.loop);let t=Math.min(.1,(e-this.last)/1e3);if(this.last=e,!this.visible||document.hidden)return;this.fps=this.fps*.95+1/Math.max(t,.001)*.05,this.adapt(t);let n=this.cam;if(n.fit(this.cssW/this.cssH),this.camTween){let t=this.camTween,r=i((e-t.start)/1e3/t.dur,0,1),s=o(r);for(let e of[`yaw`,`pitch`,`zoom`,`fov`])t.to[e]!==void 0&&(n[e]=a(t.from[e],t.to[e],s));t.to.target&&(n.target=t.from.target.map((e,n)=>a(e,t.to.target[n],s))),r>=1&&(this.camTween=null)}else this.spinOn&&this.awake&&!this.pointer&&!this.explode.frozen&&!fe.matches&&e-this.idleAt>2500&&(n.yaw+=this.spin*t);let r=1-Math.exp(-t*7);for(let e=0;e<4;e++)this.rep[e]=a(this.rep[e],this.repTarget[e],r);for(let e=0;e<2;e++)this.shift[e]=a(this.shift[e],this.shiftTarget[e],r);this.dim=a(this.dim,this.dimTarget,r),this.fade=a(this.fade,this.fadeTarget,1-Math.exp(-t*4));let s=this.morph;if(s.t<1&&!s.manual&&(s.t=i((e-s.start)/1e3/s.dur,0,1),s.t>=1&&s.done)){let e=s.done;s.done=null,e()}this.requestSort();let c=n.view(),l=n.focal(this.canvas.height),u=this.explode,d={view:c.m,focal:l,shift:this.shift,morph:s.t,spread:s.spread,arc:s.arc,splatScale:this.splatScale,explode:u.amount,frozenEye:u.eye,frozenFwd:u.fwd,slabs:u.slabs,stackCenter:u.center,stackLen:u.len,parts:this.parts,partTint:this.partTint,selected:this.selected,dim:this.dim,cut:this.cut,rep:this.rep,pass:this.pass,depthRange:[n.distance-.95,n.distance+.45],fade:this.fade,lift:this.lift,liftPos:this.liftPos,liftScale:this.liftScale,drawCount:this.drawCount,overdrawMax:this.overdrawMax};this.pass!==4&&this.gl.fbo&&this.gl.releaseFbo();let f=e=>Math.round(e*1e5),p=[...c.m,l,...this.shift,s.t,u.amount,...this.rep,this.dim,this.fade,this.lift,...this.liftPos,this.liftScale,...this.cut,this.overdrawMax].map(f).join(`,`)+`|${this.pass}|${this.drawCount}|${this.selected}|${this.partKey}|${this.partTint}|${this.serial}|${this.canvas.width}x${this.canvas.height}`;p===this.lastDrawn?this.idleFrames++:(this.lastDrawn=p,this.idleFrames=0,this.gl.draw(d),this.drawOverlay(c,l)),this.frame={view:c,focal:l,now:e,dt:t,idle:this.idleFrames>30};for(let e of this.listeners)e(this.frame)}adapt(e){e>.024?this.slow++:this.slow=Math.max(0,this.slow-.5),this.slow>45&&this.dpr>1&&(this.dpr=Math.max(1,this.dpr-.25),this.slow=0,this.resize())}drawOverlay(e,t){let n=this.ctx,r=this.overlay.width,i=this.overlay.height;n.clearRect(0,0,r,i),this.explode.amount>.01&&this.drawLayers(n,e,r,i),this.overlayHook&&this.overlayHook(n,e,r,i)}drawLayers(e,t,n,r){let i=this.explode,o=this.cam.focal(r);n/this.overlay.width;let s=i.amount,c=i.slabs,l=Math.round(this.count/c),u=n/this.cssW;e.save(),e.lineWidth=1*u,e.font=`${10.5*u}px "Geist Mono Variable", ui-monospace, monospace`;for(let d=0;d<c;d++){let f=a(i.center,i.center+(.5-(d+.5)/c)*i.len,s),p=f/i.center,m=1.08*p,h=1.08*p,g=[0,1,2].map(e=>i.eye[e]+i.fwd[e]*f),_=[[-m,-h],[m,-h],[m,h],[-m,h]].map(([e,t])=>[0,1,2].map(n=>g[n]+i.right[n]*e+i.up[n]*t)).map(e=>le(t,o,n,r,this.shift,e));if(_.some(e=>!e))continue;e.strokeStyle=`rgba(255, 212, 0, ${(d===0||d===c-1?.55:.16)*s})`,e.beginPath(),_.forEach((t,n)=>n?e.lineTo(t[0],t[1]):e.moveTo(t[0],t[1])),e.closePath(),e.stroke();let v=_[3][1]-5*u;if((d===0||d===c-1||d===c>>1)&&v>70*u&&v<r-60*u){e.fillStyle=`rgba(232, 230, 225, ${.75*s})`;let t=d*l,n=Math.min(this.count,(d+1)*l)-1,r=d===c-1?`${b(t)}–${b(this.count-1)} · nearest`:d===0?`0–${b(n)} · farthest`:`${b(t)}–${b(n)}`;e.fillText(r,_[3][0]+4*u,v)}}e.restore()}},b=e=>Math.round(e).toLocaleString(`en-US`),ge=32,_e=400,x=class extends Error{constructor(e){super(`That can't be drawn: ${e}`),this.name=`EquationError`,this.reason=e}},ve={sin:[1,Math.sin],cos:[1,Math.cos],tan:[1,Math.tan],asin:[1,Math.asin],acos:[1,Math.acos],atan:[1,Math.atan],arcsin:[1,Math.asin],arccos:[1,Math.acos],arctan:[1,Math.atan],sinh:[1,Math.sinh],cosh:[1,Math.cosh],tanh:[1,Math.tanh],exp:[1,Math.exp],log:[1,Math.log],ln:[1,Math.log],log10:[1,Math.log10],sqrt:[1,Math.sqrt],abs:[1,Math.abs],floor:[1,Math.floor],min:[2,Math.min],max:[2,Math.max]},ye={pi:Math.PI,e:Math.E},be={theta:`θ`,π:`pi`},xe=[`x`,`y`,`t`,`r`,`θ`,`a`,`b`],Se=[...Object.keys(ve),...Object.keys(ye),...Object.keys(be),...xe].sort((e,t)=>t.length-e.length);function Ce(e){return String(e).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,e=>`^${[...e].map(e=>`⁰¹²³⁴⁵⁶⁷⁸⁹`.indexOf(e)).join(``)}`).normalize(`NFKC`).replace(/[−–—]/g,`-`).replace(/[×·⋅∙*]{1,2}/g,e=>e===`**`?`^`:`*`).replace(/[÷∕]/g,`/`).replace(/√/g,`sqrt`).replace(/Θ|ϑ/g,`θ`).replace(/π/g,`pi`).toLowerCase()}function we(e){let t=[],n=0;for(;n<e.length;){let r=e[n];if(/\s/.test(r))n++;else if(/[0-9.]/.test(r)){let r=/^(\d+\.?\d*|\.\d+)/.exec(e.slice(n));if(!r)throw new x(`the number at “${e.slice(n,n+6)}” is not one I can read.`);if(e[n+r[0].length]===`.`)throw new x(`the number “${e.slice(n,n+r[0].length+2)}” has two points.`);t.push({t:`num`,v:Number(r[0])}),n+=r[0].length}else if(/[a-zθ]/.test(r)){let r=/^[a-zθ][a-zθ0-9]*/.exec(e.slice(n))[0],i=0;for(;i<r.length;){let e=r.slice(i);if(/^[0-9]/.test(e)){let n=/^[0-9]+/.exec(e)[0];t.push({t:`num`,v:Number(n)}),i+=n.length;continue}let n=Se.find(t=>e.startsWith(t));if(!n){let t=/^[a-zθ]+/.exec(e)[0];throw new x(`I don't know “${t}”. ${Te}`)}let a=be[n]||n;t.push({t:ve[a]?`fn`:`name`,v:a}),i+=n.length}n+=r.length}else if(`+-*/^(),|=`.includes(r))t.push({t:r}),n++;else if(r===`[`||r===`{`)t.push({t:`(`}),n++;else if(r===`]`||r===`}`)t.push({t:`)`}),n++;else throw new x(`I can't use the sign “${r}”. ${Te}`)}return t}var Te=`Try something like y = a·sin(b·x).`;function Ee(e,t){let n=0,r=0,i=0,a=new Set,o=()=>e[n],s=()=>e[n++],c=e=>o()?.t===e,l=(e,t)=>{if(!c(e))throw new x(t);n++},u=e=>{if(++i>_e)throw new x(`it is too long.`);return e},d=()=>{if(++r>ge)throw new x(`it has too many brackets inside brackets.`)},f=()=>{let e=o();return!!e&&(e.t===`num`||e.t===`name`||e.t===`fn`||e.t===`(`)};function p(e=!1){d();let t=m(e);for(;c(`+`)||c(`-`);){let n=s().t,r=m(e),i=t;t=u(n===`+`?e=>i(e)+r(e):e=>i(e)-r(e))}return r--,t}function m(e){let t=h(e);for(;;)if(c(`*`)||c(`/`)){let n=s().t,r=h(e),i=t;t=u(n===`*`?e=>i(e)*r(e):e=>i(e)/r(e))}else if(f()||c(`|`)&&!e){let n=g(e),r=t;t=u(e=>r(e)*n(e))}else break;return t}function h(e){if(c(`-`)){s(),d();let t=h(e);return r--,u(e=>-t(e))}return c(`+`)?(s(),h(e)):g(e)}function g(e){let t=v(e);if(c(`^`)){s(),d();let n=h(e);return r--,u(e=>t(e)**+n(e))}return t}function _(e){let t=()=>{let t=o();return!t||t.t!==`num`&&t.t!==`name`&&t.t!==`(`?null:g(e)},n=t();if(!n)throw new x(`a function is missing what it works on, like sin(x).`);for(;;){let e=o();if(!e||e.t!==`num`&&e.t!==`name`)break;let r=t(),i=n;n=u(e=>i(e)*r(e))}return n}function v(e){let n=s();if(!n)throw new x(`it stops too soon. Is something missing at the end?`);if(n.t===`num`)return u(()=>n.v);if(n.t===`name`){if(n.v in ye){let e=ye[n.v];return u(()=>e)}if(!t.includes(n.v))throw new x(De(n.v,t));a.add(n.v);let e=n.v;return u(t=>t[e])}if(n.t===`fn`){let[t,i]=ve[n.v];d();let a;if(c(`(`)){s();let e=[p()];for(;c(`,`);)s(),e.push(p());if(l(`)`,`check the brackets: one is missing its partner.`),t===1&&e.length!==1)throw new x(`${n.v} takes one value, like ${n.v}(x).`);if(t===2&&e.length<2)throw new x(`${n.v} needs two values or more, like ${n.v}(x, 1).`);if(t===1){let[t]=e;a=u(e=>i(t(e)))}else a=u(t=>{let n=e[0](t);for(let r=1;r<e.length;r++)n=i(n,e[r](t));return n})}else{if(t!==1)throw new x(`${n.v} needs brackets, like ${n.v}(x, 1).`);let r=_(e);a=u(e=>i(r(e)))}return r--,a}if(n.t===`(`){let e=p();return l(`)`,`check the brackets: one is missing its partner.`),e}if(n.t===`|`&&!e){let e=p(!0);return l(`|`,`check the | signs: each one needs a partner.`),u(t=>Math.abs(e(t)))}throw n.t===`)`?new x(`check the brackets: one is missing its partner.`):n.t===`=`?new x(`it has an = sign in the wrong place.`):n.t===`,`?new x(`it has a comma in the wrong place.`):new x(`the “${n.t}” sign needs a number or letter on both sides.`)}let ee=p();if(n<e.length){let e=o();throw e.t===`)`?new x(`check the brackets: one is missing its partner.`):e.t===`|`?new x(`check the | signs: each one needs a partner.`):e.t===`,`?new x(`it has a comma in the wrong place.`):e.t===`=`?new x(`it has more than one = sign.`):new x(`something is out of place near “${e.t}”.`)}return{f:ee,used:a}}function De(e,t){return`“${e}” can't be used here. Use ${t.filter(e=>e!==`a`&&e!==`b`).join(`, `)}, and a or b for the sliders.`}function Oe(e,t=[`x`,`a`,`b`],{maxLength:n=120}={}){let r=Ce(e);if(r.length>n)throw new x(`it is over ${n} characters.`);let i=we(r);if(!i.length)throw new x(`there is nothing to draw. ${Te}`);return Ee(i,t)}function ke(e){return String(e??``).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,e=>`^${[...e].map(e=>`⁰¹²³⁴⁵⁶⁷⁸⁹`.indexOf(e)).join(``)}`).normalize(`NFKC`).replace(/[−–—]/g,`-`).replace(/[×·⋅∙]/g,`*`).replace(/[÷∕]/g,`/`).replace(/√/g,`sqrt`).replace(/[θΘϑ]/g,`theta`).replace(/π/g,`pi`).replace(/\s+/g,` `).trim()}var Ae=[12,13,14,15],je=100,Me=1e4,S=[{id:`sphere`,label:`Sphere`,x:`sin(v)cos(u + t)`,y:`cos(v)`,z:`sin(v)sin(u + t)`,u:`0 .. 2pi`,v:`0 .. pi`,hue:`floor(6u/(2pi))/6 + 0.04`,size:`0.035`,count:`7000`},{id:`torus`,label:`Torus`,x:`(2 + cos(v + t))cos(u)`,y:`sin(v + t)`,z:`(2 + cos(v + t))sin(u)`,u:`0 .. 2pi`,v:`0 .. 2pi`,hue:`v/(2pi)`,size:`0.09`,count:`6000`},{id:`mobius`,label:`Möbius strip`,x:`(1 + v cos((u + t)/2))cos(u + t)`,y:`v sin((u + t)/2)`,z:`(1 + v cos((u + t)/2))sin(u + t)`,u:`0 .. 2pi`,v:`-0.4 .. 0.4`,hue:`u/(2pi)`,size:`0.035`,count:`4000`},{id:`seashell`,label:`Seashell`,x:`exp(0.1u)cos(u + t)(1.2 + cos v)`,y:`exp(0.1u)(sin(v) - 2.4) + 3`,z:`exp(0.1u)sin(u + t)(1.2 + cos v)`,u:`0 .. 6pi`,v:`0 .. 2pi`,hue:`0.02 + 0.1u/(6pi) + 0.03cos(4u)`,size:`0.14exp(0.1u)`,count:`10000`},{id:`trefoil`,label:`Trefoil knot`,x:`(sin(u) + 2sin(2u))cos(t) - sin(3u)sin(t)`,y:`cos(u) - 2cos(2u)`,z:`-(sin(u) + 2sin(2u))sin(t) - sin(3u)cos(t)`,u:`0 .. 2pi`,v:`0 .. 1`,hue:`u/(2pi)`,size:`0.16`,count:`2500`},{id:`wave`,label:`Wave`,x:`u`,y:`0.45sin(2sqrt(u^2 + v^2) - t)`,z:`v`,u:`-3 .. 3`,v:`-3 .. 3`,hue:`0.58 - 0.07sin(2sqrt(u^2 + v^2) - t)`,size:`0.07`,count:`6000`},{id:`galaxy`,label:`Spiral galaxy`,x:`u^1.5 cos(pi floor(v) + 5u + 1.2(v - floor(v)) - t)`,y:`0.06(1 - u)sin(91v + 37u)`,z:`u^1.5 sin(pi floor(v) + 5u + 1.2(v - floor(v)) - t)`,u:`0.02 .. 1`,v:`0 .. 2`,r:`0.55 + 0.45(1 - u)^2`,g:`0.62 + 0.33(1 - u)^2`,b:`1 - 0.45(1 - u)^3`,size:`0.006 + 0.012(1 - u)^2`,count:`10000`,spread:`random`},{id:`klein`,label:`Klein bottle (figure eight)`,x:`(2 + cos(u/2)sin(v + t) - sin(u/2)sin(2v + 2t))cos(u)`,y:`sin(u/2)sin(v + t) + cos(u/2)sin(2v + 2t)`,z:`(2 + cos(u/2)sin(v + t) - sin(u/2)sin(2v + 2t))sin(u)`,u:`0 .. 2pi`,v:`0 .. 2pi`,hue:`v/(2pi)`,size:`0.13`,count:`8000`}];Object.fromEntries(S.map(e=>[e.id,e]));var C=[`x`,`y`,`z`,`u`,`v`,`hue`,`r`,`g`,`b`,`size`,`count`,`spread`],Ne=[`x`,`y`,`z`,`hue`,`r`,`g`,`b`,`size`];function Pe(e){let t=String(e?.message||e);return t=t.replace(/“([^”]*)”/g,(e,t)=>`“${t.replace(/θ/g,`u`).replace(/y/g,`v`)}”`),t=t.replace(/Use [^.]*and a or b for the sliders\./,`Use u, v and t.`),t=t.replace(/Try something like y = a·sin\(b·x\)\./,`Try something like cos(u)·sin(v).`),t}function w(e,t=[`u`,`v`,`t`]){let n=String(e??``).trim();if(!n)throw new x(`it is empty.`);if(n.length>240)throw new x(`it is over 240 characters.`);let r=ke(n).toLowerCase(),i=/theta/.test(r)?`θ`:/[xy]/.test(r.replace(/exp|max/g,``))?/y/.test(r)?`y`:`x`:null;if(i)throw new x(`“${i}” can't be used here. ${t.length?`Use ${t.join(`, `).replace(/, ([^,]*)$/,` and $1`)}.`:`Use numbers only here.`}`);let a=r.replace(/u/g,`θ`).replace(/v/g,`y`),o=t.map(e=>e===`u`?`θ`:e===`v`?`y`:e),s;try{s=Oe(a,o,{maxLength:240})}catch(e){if(!(e instanceof x))throw e;let t=new x(`x`);throw t.message=Pe(e),t}return{f:s.f,used:{u:s.used.has(`θ`),v:s.used.has(`y`),t:s.used.has(`t`)}}}function Fe(e){let t=String(e??``).trim().split(/\s*(?:\.{2,3}|…|\bto\b|,)\s*/);if(t.length!==2||!t[0]||!t[1])throw new x(`give it as two numbers, like 0 .. 2pi.`);let[n,r]=t.map(e=>w(e,[]).f({}));if(!Number.isFinite(n)||!Number.isFinite(r))throw new x(`its ends must be numbers.`);if(n===r)throw new x(`its two ends are the same.`);if(Math.abs(n)>1e4||Math.abs(r)>1e4)throw new x(`its ends are too far out.`);return[n,r]}function Ie(e){let t=w(e,[]).f({});if(!Number.isFinite(t))throw new x(`it must be a number.`);return Math.round(Math.min(Me,Math.max(je,t)))}function Le(e){let t=String(e??``).trim().toLowerCase();if(t===`grid`||t===`random`)return t;throw new x(`it is grid or random.`)}function Re(e){let t={fields:{}},n=[],r=(e,t)=>{try{return t()}catch(t){if(!(t instanceof x))throw t;return n.push(`${e}: ${t.message}`),null}};for(let n of[`x`,`y`,`z`])t[n]=r(n,()=>w(e[n]));if(t.u=r(`u`,()=>Fe(e.u)),t.v=r(`v`,()=>Fe(e.v||`0 .. 1`)),e.hue)t.hue=r(`hue`,()=>w(e.hue));else for(let n of[`r`,`g`,`b`])t[n]=r(n,()=>w(e[n]||`0.5`));if(t.size=r(`size`,()=>w(e.size||`0.05`)),t.count=r(`count`,()=>Ie(e.count||`4000`)),t.spread=r(`spread`,()=>Le(e.spread||`grid`)),n.length)throw Error(n.join(` `));t.usesT=(e=>Ne.some(n=>t[n]?.used[e]))(`t`),t.usesU=[`x`,`y`,`z`].some(e=>t[e].used.u),t.usesV=[`x`,`y`,`z`].some(e=>t[e].used.v);for(let n of C)e[n]&&(t.fields[n]=String(e[n]).trim());return t}var ze={"x(u,v,t)":`x`,"y(u,v,t)":`y`,"z(u,v,t)":`z`,color:`hue`,colour:`hue`,red:`r`,green:`g`,blue:`b`,splats:`count`,n:`count`};function Be(e){let t={},n=[],r=String(e??``).split(/[\n;]/).map(e=>e.replace(/#.*$/,``).trim()).filter(Boolean);if(!r.length)throw Error(`There is nothing to read. Try x = cos(u); y = sin(u).`);for(let e of r){let r=/^([a-zA-Z]+(?:\s*\([^)]*\))?)\s*=\s*(.*)$/.exec(e);if(!r){n.push(`“${e.slice(0,24)}”: start it with a name and an = sign, like x = cos(u).`);continue}let i=r[1].replace(/\s+/g,``).toLowerCase();i=ze[i]||i.replace(/\(.*\)$/,``),C.includes(i)?t[i]=ke(r[2]):n.push(`“${r[1]}” is not a field. Use ${C.join(`, `)}.`)}if(n.length)throw Error(n.join(` `));return t}S[0],[[...S.map(e=>({id:e.id,label:e.label}))],Ae.map(e=>({id:String(e),label:String(e)})),...C.map(e=>({key:e,label:e,type:`text`,default:``,hidden:!0}))];function Ve(e,t){let n=Math.hypot(...e)||1,r=Math.hypot(...t)||1,i=e.map(e=>e/n),a=t.map(e=>e/r),o=i[0]*a[0]+i[1]*a[1]+i[2]*a[2];if(o<-.999999){let e=Math.abs(i[0])<.9?[0,-i[2],i[1]]:[i[2],0,-i[0]],t=Math.hypot(...e);return[e[0]/t,e[1]/t,e[2]/t,0]}let s=[i[1]*a[2]-i[2]*a[1],i[2]*a[0]-i[0]*a[2],i[0]*a[1]-i[1]*a[0]],c=[s[0],s[1],s[2],1+o],l=Math.hypot(...c);return c.map(e=>e/l)}var He=[.42,.8,.43],Ue=Math.PI*2,We=Object.fromEntries(S.map(e=>[e.id,e]));function Ge(e){return C.filter(t=>e[t]).map(t=>`${t} = ${e[t]}`).join(`
`)}function Ke(e,t,n){let r=r=>{let i=(r+e*12)%12;return n-t*Math.min(n,1-n)*Math.max(-1,Math.min(i-3,9-i,1))};return[r(0),r(8),r(4)]}function qe(e){return Re(Be(e))}function Je(e,t){let[n,r]=e.u,[i,a]=e.v,o=[],s=12345,c=()=>(s=s*1664525+1013904223>>>0,s/4294967296);if(e.spread===`random`){for(let s=0;s<t;s++)o.push([n+(r-n)*c(),e.usesV?i+(a-i)*c():(i+a)/2]);return o}if(!e.usesV||!e.usesU){let s=e.usesU||!e.usesV;for(let e=0;e<t;e++){let c=(e+.5)/t;o.push(s?[n+(r-n)*c,(i+a)/2]:[(n+r)/2,i+(a-i)*c])}return o}let l={θ:0,y:0,t:0},u=(t,n)=>(l.θ=t,l.y=n,[e.x.f(l),e.y.f(l),e.z.f(l)]),d=(e,t)=>Math.hypot(e[0]-t[0],e[1]-t[1],e[2]-t[2]),f=0,p=0;for(let e=0;e<=12;e++)for(let t=0;t<12;t++){let o=(e+.5)/13,s=t/12,c=(t+1)/12,l=d(u(n+(r-n)*s,i+(a-i)*o),u(n+(r-n)*c,i+(a-i)*o)),m=d(u(n+(r-n)*o,i+(a-i)*s),u(n+(r-n)*o,i+(a-i)*c));Number.isFinite(l)&&(f+=l),Number.isFinite(m)&&(p+=m)}let m=f>0&&p>0?Math.min(400,Math.max(1/400,f/p)):1,h=Math.max(2,Math.round(Math.sqrt(t*m))),g=Math.max(2,Math.floor(t/h));for(let e=0;e<h;e++)for(let t=0;t<g;t++)o.push([n+(r-n)*(e+.5)/h,i+(a-i)*(t+.5)/g]);return o}var Ye=class{constructor(e){this.prog=e,this.uv=Je(e,e.count),this.n=this.uv.length,this.set=ne(this.n),this.gpu=null;let t={θ:0,y:0,t:0},n=[];for(let r=0;r<6;r++){t.t=Ue*r/6;for(let r=0;r<this.n;r+=Math.max(1,Math.floor(this.n/1500))){t.θ=this.uv[r][0],t.y=this.uv[r][1];let i=[e.x.f(t),e.y.f(t),e.z.f(t)];Number.isFinite(i[0]+i[1]+i[2])&&n.push(Math.hypot(...i))}}n.sort((e,t)=>e-t);let r=n.length?n[Math.floor(n.length*.98)]:1;this.far=Math.max(1e-6,r*3),this.fit=1/Math.max(1e-6,r),this.surface=e.usesU&&e.usesV&&e.spread===`grid`,this.curve=e.spread===`grid`&&e.usesU!==e.usesV?e.usesU?`u`:`v`:null,this.du=(e.u[1]-e.u[0])*.001,this.dv=(e.v[1]-e.v[0])*.001}frame(e){let{prog:t,uv:n,set:r,fit:i,far:a}=this,o={θ:0,y:0,t:e},s=(e,n)=>(o.θ=e,o.y=n,[t.x.f(o),t.y.f(o),t.z.f(o)]),c=e=>Math.max(0,Math.min(255,Math.round(e*255)));for(let e=0;e<this.n;e++){let[l,u]=n[e],d=s(l,u),f=e*3,p=e*4;if(!(Number.isFinite(d[0]+d[1]+d[2])&&Math.hypot(...d)<=a)){r.scale[f]=r.scale[f+1]=r.scale[f+2]=0,r.color[p+3]=0;continue}o.θ=l,o.y=u;let m;if(t.hue){let e=t.hue.f(o);m=Number.isFinite(e)?Ke((e%1+1)%1,.72,.56):[.5,.5,.5]}else m=[`r`,`g`,`b`].map(e=>Math.max(0,Math.min(1,t[e].f(o)||0)));let h=t.size.f(o),g=(Number.isFinite(h)&&h>0?Math.min(h,a):.05*a)*i,_=[0,0,0,1],v=[g*.5,g*.5,g*.5];if(this.surface){let e=s(l+this.du,u),t=s(l,u+this.dv),n=[e[0]-d[0],e[1]-d[1],e[2]-d[2]],r=[t[0]-d[0],t[1]-d[1],t[2]-d[2]],i=[n[1]*r[2]-n[2]*r[1],n[2]*r[0]-n[0]*r[2],n[0]*r[1]-n[1]*r[0]],a=Math.hypot(...i);if(a>0&&Number.isFinite(a)){let e=[i[0]/a,i[1]/a,i[2]/a],t=Math.abs(e[0]*He[0]+e[1]*He[1]+e[2]*He[2]),n=.62+.48*t,r=.18*t**24;m=m.map(e=>Math.min(1,e*n+r)),_=Ve([0,0,1],e),v=[g*.62,g*.62,g*.62*.12]}}else if(this.curve){let e=this.curve===`u`?s(l+this.du,u):s(l,u+this.dv),t=[e[0]-d[0],e[1]-d[1],e[2]-d[2]];Number.isFinite(t[0]+t[1]+t[2])&&Math.hypot(...t)>0&&(_=Ve([1,0,0],t),v=[g*.5*1.6,g*.5,g*.5])}for(let e=0;e<3;e++)r.pos[f+e]=d[e]*i,r.scale[f+e]=v[e];for(let e=0;e<4;e++)r.rot[p+e]=_[e];r.color[p]=c(m[0]),r.color[p+1]=c(m[1]),r.color[p+2]=c(m[2]),r.color[p+3]=255}return this.gpu=re(r,this.gpu),r}},Xe=`// Things that open: toys with hinged parts you tap to open and close.
// Loaded on demand.

import {
  mix,
  shade,
  smoothstep,
  clamp,
  quatAxisAngle,
  quatMul,
  quatFromTo,
  quatRotate,
} from "../kit.js";
import {
  evenBox,
  evenCylinder,
  evenEllipsoid,
  evenTorus as evenTorusOut,
  evenTube,
} from "./even.js";
import { inked } from "../font.js";
import { surfacePoints } from "../physics/world.js"; // lane Hands-on H3

const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

const TAU = Math.PI * 2;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => mul(a, 1 / (len(a) || 1));
const keep = (c, size) => ({ c, keep: true, size });
const ease3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// The music box's tune by hand (lane Hands engine B): one note for each
// click of the crank (12 a turn), as the tap plays it ("-" a rest).
const MUSIC_TUNE = "E6 D6 C6 D6 E6 E6 E6 - D6 D6 D6 - E6 G6 G6 -".split(" ");
const MUSIC_CLICKS = 12;
// The dancer's turn by hand, and where her splats were last sorted: splats
// sort in the pose they were built in, so a turned dancer would draw her
// back (and her turntable's underside) over her front and seem to tip back.
const MUSIC_HAND = { a: null, lid: 0, slot: null, again: false };
// Lane Hands-on H3: the alarm clock set by hand. \`a0\` and \`h0\` are the
// minute and hour hands' angles when the minute hand was taken (its dial's
// start), so the hour hand follows through the clock's gears.
const CLOCK_HAND = { a0: 0, h0: 0 };
// Lane Hands-on H3: the gift box's lid by hand. \`off\` is how far the lid
// is from its place (recipe units, from Hands-on); \`pop\` the star's spring
// (its height 0..1 and speed), stepped by drive() on the toy's clock.
const GIFT_HAND = { off: 0, pop: 0, v: 0, t: null };
const GIFT_LID = { type: "box", half: [0.535, 0.08, 0.535] };
const GIFT_BOX = { type: "box", half: [0.5, 0.39, 0.5] };
// Lane Hands-on H3: the umbrella's runner, the sleeve on the shaft that
// opens it. Each rib is held up by a stretcher of fixed length from the
// runner to a point on the rib (as on a real umbrella), so the runner's
// height and the canopy's fold go together: \`umbrellaRunner(th)\` is the
// runner's move (recipe units, from open) with the panels turned down by
// th, and \`umbrellaFold(off)\` the turn for a runner moved by off.
const UMB = (() => {
  const R = 1.05;
  const top = 0.72;
  const droop = 0.42;
  const tt = 0.45;
  const r0 = tt * R * 0.93;
  const dy0 = -droop * Math.pow(tt, 1.7) + 0.06 * tt * (1 - tt) - 0.012;
  const ry = -0.05; // (low on the stick, in sight below the canopy's rim)
  const L = Math.hypot(r0, top + dy0 - ry);
  return { R, top, droop, r0, dy0, ry, L, shut: 1.18 };
})();
function umbrellaRunner(th) {
  const { r0, dy0, top, L, ry } = UMB;
  const r = r0 * Math.cos(th) + dy0 * Math.sin(th);
  const y = top - r0 * Math.sin(th) + dy0 * Math.cos(th);
  return y - Math.sqrt(Math.max(0, L * L - r * r)) - ry;
}
function umbrellaFold(off) {
  let lo = 0;
  let hi = UMB.shut;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (umbrellaRunner(m) > off) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
// Lane Hands-on H3: the desk fan's head tilted by hand; drive() keeps its
// swing and the blades' spin here, so the tilt rides on them.
const FAN_HAND = { yaw: 0, spin: 0 };
// Lane Hands-on H3: the desk lamp's arms bent by hand. Its joints (the
// base's, the elbow's and the head's) as built, the light's direction and
// the pool of light it throws on the desk; \`light\` is the Light control.
const LAMP = (() => {
  const base = [0, 0.06, -0.1];
  const elbow = [-0.05, 0.9, -0.35];
  const joint = [0.42, 1.22, -0.05];
  const dir = unit([0.35, -1, 0.35]);
  const head = add(joint, mul(dir, 0.14));
  const bulbAt = add(head, mul(dir, 0.07));
  const pool = add(bulbAt, mul(dir, (0 - bulbAt[1]) / dir[1]));
  return { base, elbow, joint, dir, head, bulbAt, pool };
})();
const LAMP_HAND = { light: 1 };
// Lane Hands-on H3: the potion bottle's cork by hand. \`off\` is how far the
// cork is from its place; \`t0\` when it popped (drive() starts the puff).
const POTION_HAND = { off: 0, out: false, t0: -1e9 };
const POTION_CORK = { type: "ellipsoid", r: [0.12, 0.1, 0.12] };
const POTION_FLASK = { type: "sphere", r: 0.5 };
const easeOutBack = (x) => {
  const k = 1.70158;
  return 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2);
};
const bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x));
const window01 = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
// A torus in the XZ plane (like k.torus) as a parametric surface, so it
// can take even: true (k.torus places its splats at random).
function evenTorus(k, R, r, grid = 96) {
  return k.param(
    (u, v) => {
      const a = TAU * u;
      const b = TAU * v;
      const w = R + r * Math.cos(b);
      return [w * Math.cos(a), r * Math.sin(b), w * Math.sin(a)];
    },
    { grid, thick: r },
  );
}
// The i-th point of an even (low-discrepancy) sequence in \`dims\` dimensions,
// for clouds that should cover an area smoothly instead of in clumps.
function evenPoint(i, dims) {
  let g = 2;
  for (let k = 0; k < 20; k++) g = Math.pow(1 + g, 1 / (dims + 1));
  const out = [];
  for (let k = 0; k < dims; k++) {
    const v = 0.5 + i / Math.pow(g, k + 1);
    out.push(v - Math.floor(v));
  }
  return out;
}

// Baked light from above, front and right, with a sheen toward the viewer.
const LIGHT = unit([0.4, 0.85, 0.55]);
const VIEW = unit([0.5, 0.35, 0.8]);
const HALF = unit(add(LIGHT, VIEW));
function lit(col, n, { amb = 0.62, dif = 0.45, spec = 0.25, pow = 28 } = {}) {
  const d = Math.max(0, dot(n, LIGHT));
  let c = shade(col, amb + dif * d);
  if (spec > 0) c = mix(c, [1, 1, 1], spec * Math.pow(Math.max(0, dot(n, HALF)), pow));
  return c;
}
// Polished metal: the room reflected (bright above, dark horizon, warm floor).
function chrome(n, tint = null) {
  const r = sub(mul(n, 2 * dot(n, VIEW)), VIEW);
  const y = r[1];
  let c =
    y > 0
      ? mix("#9aa3ad", "#f7f9fc", Math.pow(y, 0.5))
      : mix("#6d5a48", "#2e2723", Math.pow(-y, 0.6));
  c = mix(c, "#262a31", 0.7 * smoothstep(0.22, 0, Math.abs(y + 0.04)));
  if (tint) c = mix(c, shade(tint, 0.6 + 0.6 * c[1]), 0.65);
  return mix(c, [1, 1, 1], Math.pow(Math.max(0, dot(n, HALF)), 60));
}

function hsv(h, s, v) {
  const f = (n) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}

// Per-toy memory for drive(), keyed by the control state (new per load).
const MEM = new WeakMap();
function mem(c) {
  let m = MEM.get(c);
  if (!m) MEM.set(c, (m = {}));
  return m;
}
function integrate(m, key, t, rate) {
  const last = m["t_" + key];
  m["t_" + key] = t;
  const dt = last === undefined ? 0 : clamp(t - last, 0, 0.25);
  m[key] = (m[key] ?? 0) + dt * rate;
  return m[key];
}

// A box with rounded edges, sampled evenly. Flat faces carry \`face\` (0..5
// for +X, -X, +Y, -Y, +Z, -Z) and face u, v; rounded parts carry face -1.
// \`top: false\` / \`bottom: false\` leave out those flat faces (open boxes,
// things on the floor).
function roundBox(sx, sy, sz, r, { top = true, bottom = true, even2d = false } = {}) {
  const h = [sx / 2 - r, sy / 2 - r, sz / 2 - r];
  const L = [h[0] * 2, h[1] * 2, h[2] * 2];
  const parts = [];
  const faceN = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  faceN.forEach((n, f) => {
    if ((!bottom && f === 3) || (!top && f === 2)) return;
    const ax = f >> 1;
    parts.push({ area: L[(ax + 1) % 3] * L[(ax + 2) % 3], kind: 0, f, n, ax });
  });
  for (let ax = 0; ax < 3; ax++)
    for (const s1 of [-1, 1])
      for (const s2 of [-1, 1])
        parts.push({ area: (Math.PI / 2) * r * L[ax], kind: 1, ax, s1, s2 });
  for (const a of [-1, 1])
    for (const b of [-1, 1])
      for (const c of [-1, 1]) parts.push({ area: (Math.PI / 2) * r * r, kind: 2, sg: [a, b, c] });
  let total = 0;
  for (const q of parts) q.cum = total += q.area;
  // even2d: a 2D even layout for even: true (a is spread over the pieces by
  // area, b across each), so the faces don't hatch.
  const sampleEven = (a, b) => {
    const x = Math.min(a, 1 - 1e-9) * total;
    let q = parts[parts.length - 1];
    for (const it of parts)
      if (x < it.cum) {
        q = it;
        break;
      }
    const f = Math.min(1, Math.max(0, (x - (q.cum - q.area)) / q.area));
    const p = [0, 0, 0];
    if (q.kind === 0) {
      const a1 = (q.ax + 1) % 3;
      const a2 = (q.ax + 2) % 3;
      p[q.ax] = q.n[q.ax] * (h[q.ax] + r);
      p[a1] = (f - 0.5) * L[a1];
      p[a2] = (b - 0.5) * L[a2];
      return { p, n: q.n, u: f, v: b, face: q.f };
    }
    if (q.kind === 1) {
      const a1 = (q.ax + 1) % 3;
      const a2 = (q.ax + 2) % 3;
      const an = b * (Math.PI / 2);
      const n = [0, 0, 0];
      n[a1] = q.s1 * Math.cos(an);
      n[a2] = q.s2 * Math.sin(an);
      p[q.ax] = (f - 0.5) * L[q.ax];
      p[a1] = q.s1 * h[a1] + n[a1] * r;
      p[a2] = q.s2 * h[a2] + n[a2] * r;
      return { p, n, u: 0, v: 0, face: -1 };
    }
    const z = f;
    const ph = b * (Math.PI / 2);
    const w = Math.sqrt(Math.max(0, 1 - z * z));
    const d = [w * Math.cos(ph), w * Math.sin(ph), z];
    const n = [0, 1, 2].map((i) => d[i] * q.sg[i]);
    for (let i = 0; i < 3; i++) p[i] = q.sg[i] * h[i] + n[i] * r;
    return { p, n, u: 0, v: 0, face: -1 };
  };
  return {
    area: total,
    thick: Math.min(sx, sy, sz) / 2,
    sampleEven: even2d ? sampleEven : undefined,
    sample(rand) {
      const x = rand() * total;
      let q = parts[parts.length - 1];
      for (const it of parts)
        if (x < it.cum) {
          q = it;
          break;
        }
      const p = [0, 0, 0];
      if (q.kind === 0) {
        const a1 = (q.ax + 1) % 3;
        const a2 = (q.ax + 2) % 3;
        const u = rand();
        const v = rand();
        p[q.ax] = q.n[q.ax] * (h[q.ax] + r);
        p[a1] = (u - 0.5) * L[a1];
        p[a2] = (v - 0.5) * L[a2];
        return { p, n: q.n, u, v, face: q.f };
      }
      if (q.kind === 1) {
        const a1 = (q.ax + 1) % 3;
        const a2 = (q.ax + 2) % 3;
        const a = rand() * (Math.PI / 2);
        const n = [0, 0, 0];
        n[a1] = q.s1 * Math.cos(a);
        n[a2] = q.s2 * Math.sin(a);
        p[q.ax] = (rand() - 0.5) * L[q.ax];
        p[a1] = q.s1 * h[a1] + n[a1] * r;
        p[a2] = q.s2 * h[a2] + n[a2] * r;
        return { p, n, u: 0, v: 0, face: -1 };
      }
      let d;
      let dl;
      do {
        d = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1];
        dl = Math.hypot(d[0], d[1], d[2]);
      } while (dl < 1e-3 || dl > 1);
      const n = [0, 1, 2].map((i) => (Math.abs(d[i]) / dl) * q.sg[i]);
      for (let i = 0; i < 3; i++) p[i] = q.sg[i] * h[i] + n[i] * r;
      return { p, n, u: 0, v: 0, face: -1 };
    },
  };
}

// A flat rectangle in the XZ plane facing up (+1) or down (-1); samples
// carry face 2 or 3 like a box's top or bottom, and u, v across it.
function quad(sx, sz, up = 1) {
  const n = [0, up, 0];
  return {
    area: sx * sz,
    thick: 0.01,
    dims: 2,
    sample(rand) {
      const u = rand();
      const v = rand();
      return { p: [(u - 0.5) * sx, 0, (v - 0.5) * sz], n, u, v, face: up > 0 ? 2 : 3 };
    },
  };
}

// A flat triangle, sampled evenly.
function triShape(a, b, c) {
  const cr = cross(sub(b, a), sub(c, a));
  const n = unit(cr);
  return {
    area: 0.5 * len(cr),
    thick: 0.02,
    sample(rand) {
      const r1 = Math.sqrt(rand());
      const r2 = rand();
      const wa = 1 - r1;
      const wb = r1 * (1 - r2);
      const wc = r1 * r2;
      return {
        p: [
          a[0] * wa + b[0] * wb + c[0] * wc,
          a[1] * wa + b[1] * wb + c[1] * wc,
          a[2] * wa + b[2] * wb + c[2] * wc,
        ],
        n,
        u: wb,
        v: wc,
      };
    },
  };
}

// A blocky stroke font for numbers: segments in a 1 x 2 box.
const GLYPHS = {
  0: [
    [0, 0, 1, 0],
    [1, 0, 1, 2],
    [1, 2, 0, 2],
    [0, 2, 0, 0],
  ],
  1: [[0.5, 0, 0.5, 2]],
  2: [
    [0, 2, 1, 2],
    [1, 2, 1, 1],
    [1, 1, 0, 1],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
  ],
  3: [
    [0, 2, 1, 2],
    [1, 2, 1, 0],
    [1, 0, 0, 0],
    [0.25, 1, 1, 1],
  ],
  4: [
    [0, 2, 0, 1],
    [0, 1, 1, 1],
    [1, 2, 1, 0],
  ],
  5: [
    [1, 2, 0, 2],
    [0, 2, 0, 1],
    [0, 1, 1, 1],
    [1, 1, 1, 0],
    [1, 0, 0, 0],
  ],
  6: [
    [1, 2, 0, 2],
    [0, 2, 0, 0],
    [0, 0, 1, 0],
    [1, 0, 1, 1],
    [1, 1, 0, 1],
  ],
  7: [
    [0, 2, 1, 2],
    [1, 2, 0.4, 0],
  ],
  8: [
    [0, 0, 1, 0],
    [1, 0, 1, 2],
    [1, 2, 0, 2],
    [0, 2, 0, 0],
    [0, 1, 1, 1],
  ],
  9: [
    [1, 1, 0, 1],
    [0, 1, 0, 2],
    [0, 2, 1, 2],
    [1, 2, 1, 0],
    [1, 0, 0, 0],
  ],
};
function segDist(x, y, s) {
  const dx = s[2] - s[0];
  const dy = s[3] - s[1];
  const t = clamp(((x - s[0]) * dx + (y - s[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(x - s[0] - dx * t, y - s[1] - dy * t);
}
// Distance from (x, y) to a number drawn centered at the origin, 2 units tall.
function textDist(str, x, y) {
  const adv = 1.5;
  const w = (str.length - 1) * adv + 1;
  let best = Infinity;
  for (let i = 0; i < str.length; i++) {
    const gx = x + w / 2 - i * adv;
    const gy = y + 1;
    if (gx < -0.6 || gx > 1.6) continue;
    for (const s of GLYPHS[str[i]] || []) best = Math.min(best, segDist(gx, gy, s));
  }
  return best;
}

// A five-pointed star outline (for the gift's surprise).
function starPoints(R, r, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU;
    const rr = i % 2 ? r : R;
    pts.push([Math.sin(a) * rr, Math.cos(a) * rr]);
  }
  return pts;
}

// ---- Book, music box, clock and friends: shared layouts ------------------------------

const BOOK = { W: 1, H: 1.36, ct: 0.045, leaves: 10, lt: 0.013 };

const STORY =
  "ONCE UPON A TIME, IN A TOY BOX AT THE END OF A LONG HALL, THERE LIVED A SMALL " +
  "SPLAT CALLED PIP. PIP WAS NOT A BALL AND NOT A BLOCK. PIP WAS A SOFT LITTLE " +
  "CLOUD OF COLOR THAT COULD BE ANYTHING AT ALL. ON MONDAY PIP WAS A RED APPLE. " +
  "ON TUESDAY PIP WAS A BLUE WHALE. ON WEDNESDAY PIP TRIED TO BE THE MOON, AND " +
  "EVERY TOY IN THE BOX CAME TO LOOK. WHAT WILL YOU BE TOMORROW? ASKED THE OLD " +
  "TEDDY BEAR. PIP THOUGHT FOR A WHILE. I THINK, SAID PIP, I WILL BE A STORY. " +
  "AND SO PIP BECAME THIS BOOK, AND NOW YOU ARE READING IT. THE END. ";
// Word-wraps the story into lines of at most n characters, starting a few
// words in so that each page reads differently.
function storyLines(n, start, count) {
  const words = STORY.trim().split(/\\s+/);
  const lines = [];
  let line = "";
  for (let i = 0; lines.length < count; i++) {
    const w = words[(start + i) % words.length];
    if (line && line.length + 1 + w.length > n) {
      lines.push(line);
      line = w;
    } else line = line ? \`\${line} \${w}\` : w;
  }
  return lines;
}
BOOK.pb = 0.27;
BOOK.T = BOOK.pb + 2 * BOOK.ct;

const LAPTOP = { W: 1.5, D: 1.0, hb: 0.06, hl: 0.035, open: 1.85 };

// The laptop's keys: id (what it types), label, center and size on the deck.
const LAPTOP_KEYS = (() => {
  const rows = [
    ["1234567890", [["DEL", 0.16]]],
    ["QWERTYUIOP", []],
    ["ASDFGHJKL", [["ENTER", 0.16]]],
    ["ZXCVBNM,.", []],
  ];
  const keys = [];
  const pitch = 0.105;
  const size = 0.088;
  rows.forEach(([chars, extra], r) => {
    const z = -0.35 + r * 0.095;
    const items = [...chars].map((ch) => [ch, size]).concat(extra);
    const total = items.reduce((sum, [, w]) => sum + w, 0) + (items.length - 1) * (pitch - size);
    let x = -total / 2;
    for (const [label, w] of items) {
      keys.push({ id: label, label, x: x + w / 2, z, w, d: size });
      x += w + (pitch - size);
    }
  });
  keys.push({ id: "SPACE", label: "", x: 0, z: 0.03, w: 0.52, d: size });
  return keys;
})();
const PAD = { x: 0, z: 0.3, w: 0.44, d: 0.26 };
const onPad = (p) => Math.abs(p[0] - PAD.x) < PAD.w / 2 && Math.abs(p[2] - PAD.z) < PAD.d / 2;
const padUV = (p) => [clamp((p[0] - PAD.x) / PAD.w + 0.5, 0.02, 0.94), clamp((p[2] - PAD.z) / PAD.d + 0.5, 0.02, 0.9)]; // prettier-ignore

function keyFor(ch) {
  const id =
    ch === " " ? "SPACE" : ch === "Backspace" ? "DEL" : ch === "Enter" ? "ENTER" : ch.length === 1 ? ch.toUpperCase() : ""; // prettier-ignore
  return LAPTOP_KEYS.findIndex((k) => k.id === id);
}

// What is on the laptop's screen (one laptop is shown at a time).
const laptopStart = () => ({
  text: "Hello! Tap the keys,\\nor type on your own\\nkeyboard.\\n",
  pointer: [0.78, 0.7],
  target: [0.78, 0.7],
  clickAt: -99,
  pressKey: -1,
  pressAt: -99,
  queue: [],
  dragFrom: null,
  lastTime: null,
  open: true,
});
const LAPTOP_STATE = laptopStart();

function typeInto(st, key, typed) {
  if (key.id === "DEL") st.text = st.text.slice(0, -1);
  else if (key.id === "ENTER") st.text += "\\n";
  else if (key.id === "SPACE") st.text += " ";
  else st.text += typed ?? key.id.toLowerCase();
  // Keep the last few lines.
  const lines = st.text.split("\\n");
  if (lines.length > 6) st.text = lines.slice(-6).join("\\n");
  if (st.text.length > 240) st.text = st.text.slice(-240);
}

// The laptop's display: a wallpaper, a notes window with the typed text and a
// blinking caret, and the pointer.
function drawLaptopScreen(g, time) {
  const st = LAPTOP_STATE;
  const W = g.canvas.width;
  const H = g.canvas.height;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#2b1b6b");
  sky.addColorStop(0.55, "#ff5e98");
  sky.addColorStop(1, "#ff9a62");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(18, 194, 181, 0.55)";
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) g.lineTo(x, H * 0.8 + 18 * Math.sin(x / 70));
  g.lineTo(W, H);
  g.fill();
  // The notes window.
  const x0 = W * 0.06;
  const y0 = H * 0.08;
  const w = W * 0.88;
  const h = H * 0.8;
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(x0 + 6, y0 + 8, w, h);
  g.fillStyle = "#fbfaf6";
  g.fillRect(x0, y0, w, h);
  g.fillStyle = "#d9dde4";
  g.fillRect(x0, y0, w, 40);
  for (const [i, col] of ["#ff5f57", "#febc2e", "#28c840"].entries()) {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x0 + 22 + i * 24, y0 + 20, 8, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#3a3f47";
  g.font = "bold 22px sans-serif";
  g.textAlign = "center";
  g.fillText("Notes", x0 + w / 2, y0 + 28);
  g.textAlign = "left";
  g.fillStyle = "#1f2329";
  g.font = "bold 36px sans-serif";
  const lines = st.text.split("\\n");
  const lh = 44;
  lines.forEach((line, i) => g.fillText(line, x0 + 20, y0 + 84 + i * lh));
  // The caret after the last character.
  if (Math.floor(time * 2) % 2 === 0) {
    const last = lines[lines.length - 1];
    const cx = x0 + 22 + g.measureText(last).width;
    const cy = y0 + 84 + (lines.length - 1) * lh;
    g.fillStyle = "#2f6bff";
    g.fillRect(cx, cy - 32, 4, 40);
  }
  // A click ripple, then the pointer (an arrow).
  const age = time - st.clickAt;
  const px = st.pointer[0] * W;
  const py = st.pointer[1] * H;
  if (age >= 0 && age < 0.5) {
    g.strokeStyle = \`rgba(47,107,255,\${1 - age / 0.5})\`;
    g.lineWidth = 5;
    g.beginPath();
    g.arc(px, py, 10 + 50 * age, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = "#ffffff";
  g.strokeStyle = "#111111";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(px, py);
  g.lineTo(px, py + 34);
  g.lineTo(px + 9, py + 26);
  g.lineTo(px + 16, py + 40);
  g.lineTo(px + 22, py + 37);
  g.lineTo(px + 15, py + 23);
  g.lineTo(px + 26, py + 23);
  g.closePath();
  g.fill();
  g.stroke();
}

const FAN = { yawAt: [0, 0.62, -0.12], hub: [0, 0.62, 0.2] };

const TELE = { dir: unit([0.72, 0.5, -0.3]), mount: [0, 0.2, 0] };

const NOTE_PATHS = [0, 1, 2].map((i) => ({ x: -0.25 + i * 0.25, z: 0.1 - i * 0.08, phase: i / 3 }));

// Lane Fix5: the clock's time zones (IANA names; "local" is this device's
// own) and the hours, minutes and seconds it is there now.
const CLOCK_ZONES = [
  ["local", "This device"],
  ["UTC", "UTC"],
  ["America/Los_Angeles", "Los Angeles"],
  ["America/Denver", "Denver"],
  ["America/Chicago", "Chicago"],
  ["America/New_York", "New York"],
  ["America/Sao_Paulo", "São Paulo"],
  ["Europe/London", "London"],
  ["Europe/Paris", "Paris"],
  ["Africa/Cairo", "Cairo"],
  ["Asia/Dubai", "Dubai"],
  ["Asia/Kolkata", "Mumbai"],
  ["Asia/Shanghai", "Beijing"],
  ["Asia/Tokyo", "Tokyo"],
  ["Australia/Sydney", "Sydney"],
  ["Pacific/Auckland", "Auckland"],
];
const zoneFormats = new Map();
function clockTime(d, zone) {
  if (!zone) return [d.getHours(), d.getMinutes(), d.getSeconds()];
  let f = zoneFormats.get(zone);
  if (f === undefined) {
    try {
      f = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hourCycle: "h23",
      });
    } catch {
      f = null; // an unknown zone: this device's time
    }
    zoneFormats.set(zone, f);
  }
  if (!f) return [d.getHours(), d.getMinutes(), d.getSeconds()];
  const parts = f.formatToParts(d);
  const part = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return [part("hour") % 24, part("minute"), part("second")];
}

export const RECIPES = {
  chest: {
    alive: true,
    options: [{ key: "wood", label: "Wood", type: "color", default: "#8a5a2b" }],
    controls: [{ key: "open", label: "Open", type: "toggle", default: 0, ease: 1.1 }],
    action: { key: "open", label: "Open or close" },
    // Hands-on (lane Hands engine B): lift the lid on its hinge. Let go
    // past upright and it stays open; lower, it drops shut with a thud.
    hands: {
      joints: [
        {
          type: "hinge",
          part: "lid",
          pivot: [0, 0.1, -0.37],
          axis: [-1, 0, 0],
          min: 0,
          max: 1.95,
          bounce: 0.15,
          start: (c) => 1.95 * easeInOut(c.open),
          pos: [0, 0.24, 0],
          pick: [0.66, 0.24, 0.44],
          sound: (ev, vol) =>
            ev.v < 1
              ? [{ voice: "thud", f: 90, vol }, { voice: "wood", f: 220, decay: 0.5, vol: vol * 0.6 }] // prettier-ignore
              : { voice: "wood", f: 300, decay: 0.4, vol: vol * 0.5 },
        },
      ],
    },
    drive(t, c, out) {
      const o = easeInOut(c.open);
      out.parts.lid = { angle: -1.95 * o };
      out.amount = o;
    },
    build(k, o) {
      const W = 1.2;
      const H = 0.6;
      const D = 0.74;
      const top = H / 2 - 0.2;
      const wood = o.wood;
      const gold = "#d4a63c";
      const planks = (c) => {
        const band = Math.abs((((c.p[1] + 1) * 7.5) % 1) - 0.5) > 0.46;
        const grain = c.fbm(c.p[0] * 2, c.p[1] * 12, c.p[2] * 2);
        return shade(mix(wood, shade(wood, 0.72), 0.5 + 0.35 * grain), band ? 0.55 : 1);
      };
      // The body: an open-topped box (the top face is left out).
      k.add(evenBox(W, H, D), {
        even: true,
        opacity: 1,
        jitter: 0.012,
        pos: [0, -0.2, 0],
        flat: 0.2,
        color: (c) => (c.s.face === 2 ? null : planks(c)),
      });
      // Metal bands and corners.
      for (const x of [-0.36, 0.36]) {
        k.add(evenBox(0.08, H + 0.02, D + 0.02), {
          even: true,
          opacity: 1,
          jitter: 0.012,
          pos: [x, -0.2, 0],
          flat: 0.2,
          weight: 1.5,
          color: (c) =>
            c.s.face === 2
              ? null
              : lit(mix(gold, "#8a6a1f", 0.25 + 0.12 * c.fbm(c.p[0] * 6, c.p[1] * 6, 0)), c.n),
        });
      }
      // The lid: a half cylinder along X, hinged at the back edge.
      const lid = k.part("lid", { pivot: [0, top, -D / 2], axis: [1, 0, 0] });
      const R = D / 2;
      const arc = k.param(
        (u, v) => {
          const a = v * Math.PI;
          return [(u - 0.5) * W, top + Math.sin(a) * R * 0.75, Math.cos(a) * R];
        },
        { grid: 48, flip: true },
      );
      k.add(arc, { even: true, opacity: 1, jitter: 0.012, part: lid, flat: 0.2, color: planks });
      for (const x of [-0.36, 0.36]) {
        const strap = k.param(
          (u, v) => {
            const a = v * Math.PI;
            const rr = R + 0.012;
            return [x + (u - 0.5) * 0.08, top + Math.sin(a) * rr * 0.75, Math.cos(a) * rr];
          },
          { grid: 24, flip: true },
        );
        k.add(strap, {
          even: true,
          opacity: 1,
          jitter: 0.012,
          part: lid,
          flat: 0.2,
          weight: 1.5,
          color: gold,
        });
      }
      for (const side of [-1, 1]) {
        const end = k.param(
          (u, v) => {
            const a = u * Math.PI;
            return [(side * W) / 2, top + Math.sin(a) * R * 0.75 * v, Math.cos(a) * R * v];
          },
          { grid: 24 },
        );
        k.add(end, { even: true, opacity: 1, jitter: 0.012, part: lid, flat: 0.2, color: planks });
      }
      // The lid's flat underside, so the open lid is not hollow.
      k.add(evenBox(W, 0.01, D), {
        even: true,
        opacity: 1,
        jitter: 0.012,
        pos: [0, top + 0.005, 0],
        part: lid,
        flat: 0.2,
        color: shade(wood, 0.7),
      });
      // The lock plate on the front of the lid.
      k.add(evenBox(0.16, 0.2, 0.03), {
        even: true,
        opacity: 1,
        jitter: 0.012,
        pos: [0, top - 0.02, D / 2 + 0.01],
        part: lid,
        flat: 0.2,
        weight: 2,
        color: gold,
      });
      k.add(evenBox(0.12, 0.08, 0.03), {
        even: true,
        opacity: 1,
        jitter: 0.012,
        pos: [0, top - 0.16, D / 2 + 0.01],
        flat: 0.2,
        weight: 2,
        color: shade(gold, 0.85),
      });
      // Treasure heaped inside: coins that glint and gems that sparkle when open.
      k.cloud({ share: 0.1, size: 0.9, flat: 0.15 }, (rand) => {
        const x = (rand() - 0.5) * (W - 0.12);
        const z = (rand() - 0.5) * (D - 0.1);
        const heap = 0.08 * (1 - (x / (W / 2)) ** 2) * (1 - (z / (D / 2)) ** 2);
        const tilt = [(rand() - 0.5) * 0.8, 1, (rand() - 0.5) * 0.8];
        return {
          p: [x, top - 0.05 + heap * (0.3 + 0.7 * rand()), z],
          n: tilt,
          color: mix("#f2c94c", "#b8860b", rand() * 0.5),
          pattern: false,
          kind: "glint",
          params: [0.7, 0],
        };
      });
      const gems = ["#e0115f", "#2ecc71", "#3a7bd5", "#9b59b6", "#f1c40f"];
      for (let i = 0; i < 9; i++) {
        const x = (k.rand() - 0.5) * (W - 0.3);
        const z = (k.rand() - 0.5) * (D - 0.25);
        const s = 0.035 + k.rand() * 0.03;
        k.add(k.ellipsoid(s, s * 0.8, s), {
          pos: [x, top + 0.03, z],
          weight: 3,
          flat: 0.3,
          pattern: false,
          kind: "twinkle",
          params: [0.9, k.rand() * 6],
          color: (c) => mix(gems[i % gems.length], "#ffffff", 0.35 * smoothstep(0.3, 1, c.n[1])),
        });
      }
      // Room for the open lid.
      k.reach([0, top + D * 0.95, -D / 2 - 0.1]);
    },
  },

  book: {
    alive: true,
    options: [{ key: "color", label: "Cover", type: "color", default: "#7a2432" }],
    controls: [{ key: "open", label: "Open", type: "toggle", default: 1, ease: 2 }],
    action: { key: "open", label: "Open or close" },
    drive(t, c, out, info) {
      const o = c.open;
      // Splats sort in the pose they were built in (the book closed), so a
      // turned leaf would draw its paper over its words, and the turned
      // cover and leaves over the pages they lie on. They are sorted where
      // they stand on the first frame and every hundredth of a turn, and
      // again on the frame after (the sort uses the pose the frame starts
      // with) (lane Sharpness A).
      const d = info?.data;
      const slot = Math.round(o * 100);
      if (d && (slot !== d.sortSlot || d.sortAgain)) {
        d.sortAgain = slot !== d.sortSlot;
        d.sortSlot = slot;
        out.resortPose = true;
      }
      const lift = [0, 0, 0, 0, 0, 0, 0, 0.012, 0.03, 0.06];
      const cover = Math.PI * ease3(window01(o, 0, 0.42));
      out.parts.cover = { angle: cover };
      out.parts.coverTop = { angle: cover, visible: 1 - smoothstep(0.3, 0.4, o) };
      out.parts.spine = {
        angle: (Math.PI / 2) * ease3(window01(o, 0, 0.42)),
        visible: 1 - smoothstep(0.3, 0.4, o),
      };
      // Splats keep the draw order of the closed book, where the front cover
      // and the first leaves lie above the last leaf. Once a leaf has landed
      // on the left, the one it covers (and the cover's inside, under them
      // all) hides, so the page on top reads cleanly.
      const turned = (i) => ease3(window01(o, 0.1 + i * 0.05, 0.5 + i * 0.05));
      const landed = (i) => (i < BOOK.leaves ? smoothstep(0.9, 1, turned(i)) : 0);
      out.parts.coverIn = { angle: cover, visible: 1 - landed(0) };
      // Stands in for the hidden leaves at the left pile's edges.
      out.parts.pile = { visible: landed(1) };
      for (let i = 0; i < BOOK.leaves; i++) {
        out.parts["leaf" + i] = {
          angle: (Math.PI - lift[i]) * turned(i),
          visible: 1 - landed(i + 1),
        };
      }
    },
    build(k, o) {
      const { W, H, ct, leaves, lt, T } = BOOK;
      k.data = {}; // drive() keeps its sort state here
      const cover = o.color;
      const gold = "#d9b45a";
      const paper = "#f6efdf";
      const endpaper = mix(cover, "#f3e6cf", 0.72);
      const pivot = [0, T / 2, 0];
      const coverPart = k.part("cover", { pivot, axis: [0, 0, 1] });
      const spinePart = k.part("spine", { pivot, axis: [0, 0, 1] });
      // Book cloth: a fine, even weave (lit, no random speckle).
      const cloth = (c) => {
        const weave = 0.985 + 0.02 * Math.sin(c.p[0] * 260) * Math.sin(c.p[2] * 260);
        return lit(shade(cover, weave), c.n, { amb: 0.66, dif: 0.42, spec: 0.12 });
      };
      // The page block's edge: soft cream with faint, even page lines (at a
      // spacing splats can show, so they read as paper, not noise).
      const pageEdge = (y) => shade(paper, 0.86 + 0.05 * Math.sin(y * 260));
      // Words on a page. x is measured from the spine, z across the page
      // (the top of the page is at -z). A page that faces down while the
      // book is closed reads the right way once its leaf has turned over, so
      // its lines run from the outer edge toward the spine.
      const PX = 0.0082; // one font pixel
      const margin = 0.1;
      const perLine = Math.floor((W - 2 * margin) / (6 * PX));
      const pages = new Map();
      const pageText = (seed, picture) => {
        const key = \`\${seed}\${picture}\`;
        if (!pages.has(key)) {
          const rows = Math.floor((H - 2 * 0.12) / (10 * PX));
          const skip = picture ? Math.ceil((H / 2 - 0.12 + 0.03) / (10 * PX)) : 0;
          pages.set(key, { lines: storyLines(perLine, seed * 23, rows - skip), skip });
        }
        return pages.get(key);
      };
      const text = (x, z, seed, flipped, picture) => {
        const ax = Math.abs(x);
        const s = (flipped ? W - margin - ax : ax - margin) / PX;
        const page = pageText(seed, picture);
        const t = (z + H / 2 - 0.12) / PX - page.skip * 10;
        return inked(page.lines, s, t);
      };
      const ink = "#2f2a26";
      const pageCol = (c, x, z, seed, picture = false, flipped = false, dots = false) => {
        if (
          picture &&
          Math.abs(x) > 0.18 &&
          Math.abs(x) < W - 0.14 &&
          z > -H / 2 + 0.16 &&
          z < -0.02
        ) {
          // A little picture: sun, sky and hills.
          const u = (Math.abs(x) - 0.18) / (W - 0.32);
          const v = (z + H / 2 - 0.16) / (H / 2 - 0.18);
          const hill = 0.62 + 0.12 * Math.sin(u * 7) + 0.06 * Math.sin(u * 15 + 1);
          let col = mix("#7fc8f8", "#fef3c7", v);
          if (Math.hypot(u - 0.72, v - 0.3) < 0.12) col = "#ffb627";
          if (v > hill) col = mix("#5aa469", "#2f7a4a", (v - hill) * 3);
          const edge = Math.min(u, 1 - u, v, 1 - v);
          return keep(edge < 0.02 ? "#5b4a3a" : col);
        }
        // Pages seen only mid-turn have few, large splats: their words are a
        // soft gray, so they read as lines of print rather than black blots.
        if (!dots && text(x, z, seed, flipped, picture)) return keep(mix(ink, paper, 0.45), 0.8);
        // A turned page is lit as it lies once turned over.
        const n = flipped ? [-c.n[0], -c.n[1], c.n[2]] : c.n;
        return lit(shade(paper, 0.985 + 0.015 * c.noise(x * 12, z * 12, seed)), n, {
          amb: 0.8,
          dif: 0.25,
          spec: 0,
        });
      };
      // Back cover, spine and front cover.
      k.add(roundBox(W, ct, H, 0.012), {
        pos: [W / 2, ct / 2, 0],
        flat: 0.15,
        weight: 2.4,
        even: true,
        jitter: 0.01,
        size: 0.8,
        color: (c) => (c.s.face === 2 ? lit(endpaper, c.n, { spec: 0 }) : cloth(c)),
      });
      k.add(
        k.param(
          (u, v) => {
            const a = Math.PI / 2 + u * Math.PI;
            return [Math.cos(a) * 0.07, T / 2 + Math.sin(a) * (T / 2), (v - 0.5) * H];
          },
          { grid: 32 },
        ),
        {
          part: spinePart,
          flat: 0.15,
          weight: 2,
          even: true,
          jitter: 0.01,
          size: 0.8,
          color: (c) => {
            const z = Math.abs(c.p[2]);
            if (Math.abs(z - H * 0.38) < 0.015 || Math.abs(z - H * 0.3) < 0.01) return keep(gold);
            return cloth(c);
          },
        },
      );
      // The front cover: its cloth face is a part of its own that hides once
      // the cover lies open (splats keep the order of the closed book).
      k.add(roundBox(W, ct, H, 0.012, { top: false, bottom: false }), {
        pos: [W / 2, T - ct / 2, 0],
        part: coverPart,
        flat: 0.15,
        weight: 4,
        even: true,
        jitter: 0.01,
        size: 0.8,
        color: cloth,
      });
      // The cover's inside, its own part so it can hide under the turned pages.
      const coverIn = k.part("coverIn", { pivot, axis: [0, 0, 1] });
      k.add(quad(W - 0.024, H - 0.024, -1), {
        pos: [W / 2, T - ct, 0],
        part: coverIn,
        flat: 0.15,
        color: (c) => lit(endpaper, c.n, { spec: 0 }),
      });
      const coverTop = k.part("coverTop", { pivot, axis: [0, 0, 1] });
      k.add(quad(W - 0.024, H - 0.024), {
        pos: [W / 2, T, 0],
        part: coverTop,
        flat: 0.15,
        weight: 5,
        even: true,
        jitter: 0.01,
        size: 0.8,
        color: (c) => {
          // Gold border, title bands and an emblem on the front.
          const x = c.p[0] - W / 2;
          const z = c.p[2];
          const bx = W / 2 - 0.07 - Math.abs(x);
          const bz = H / 2 - 0.07 - Math.abs(z);
          if (Math.abs(Math.min(bx, bz)) < 0.008) return keep(lit(gold, c.n, { spec: 0.5 }));
          const r = Math.hypot(x, z - 0.12);
          if (Math.abs(r - 0.16) < 0.012 || r < 0.05) return keep(lit(gold, c.n, { spec: 0.5 }));
          if (
            Math.abs(x) < 0.26 &&
            (Math.abs(z + 0.25) < 0.02 || (Math.abs(z + 0.33) < 0.012 && Math.abs(x) < 0.17))
          )
            return keep(lit(gold, c.n, { spec: 0.5 }));
          return cloth(c);
        },
      });
      // The pages that stay on the right, with a picture on top. The two
      // pages seen when the book lies open (this one and the underside of the
      // last leaf) get most of the splats, so their words stay sharp; hidden
      // page faces get few.
      const PW = W - 0.035;
      const PH = H - 0.05;
      const block = BOOK.pb - leaves * lt;
      const sides = (face) => (face === 2 || face === 3 ? null : keep(shade(paper, 0.84)));
      k.add(evenBox(PW, block, PH), {
        pos: [PW / 2 + 0.005, ct + block / 2, 0],
        flat: 0.15,
        weight: 2.4,
        even: true,
        jitter: 0,
        size: 1,
        color: (c) => {
          if (c.s.face === 2 || c.s.face === 3) return null;
          if (c.s.face === 1) return shade(paper, 0.8);
          return keep(pageEdge(c.p[1]));
        },
      });
      k.add(quad(PW, PH), {
        pos: [PW / 2 + 0.005, ct + block, 0],
        flat: 0.15,
        weight: 6,
        even: true,
        jitter: 0.01,
        size: 1.25,
        color: (c) => pageCol(c, c.p[0], c.p[2], 3, true, false, true),
      });
      // The words on the two pages seen while the book lies open (lane
      // Sharpness A): every font pixel is a 2 x 2 grid of small ink dots
      // laid exactly on it, just off the paper, like the laptop's keys
      // (random splats on the page blurred the letters).
      const inkDots = (seed, picture, flipped, y, part) => {
        const page = pageText(seed, picture);
        const dots = [];
        page.lines.forEach((line, r) => {
          for (let s0 = 0; s0 < 6 * line.length; s0++)
            for (let gy = 0; gy < 7; gy++) {
              const t0 = r * 10 + gy;
              if (!inked(page.lines, s0 + 0.5, t0 + 0.5)) continue;
              for (let a2 = 0; a2 < 2; a2++)
                for (let b2 = 0; b2 < 2; b2++) {
                  const sp = (s0 + (a2 + 0.5) / 2) * PX;
                  const ax = flipped ? W - margin - sp : margin + sp;
                  const z = (t0 + page.skip * 10 + (b2 + 0.5) / 2) * PX - H / 2 + 0.12;
                  dots.push([ax, y, z]);
                }
            }
        });
        const r = PX * 0.6;
        k.cloud({ count: dots.length, pattern: false, part }, (rand, j, n) => {
          const d = dots[Math.floor((j * dots.length) / n)];
          const m = Math.sqrt(Math.max(1, dots.length / n));
          return {
            p: d,
            scales: [r * m, r * 0.15, r * m],
            quat: [0, 0, 0, 1],
            color: ink,
            opacity: 1,
          };
        });
      };
      inkDots(3, true, false, ct + block + 0.0012, undefined);
      // Leaves that flip one after another.
      for (let i = 0; i < leaves; i++) {
        const part = k.part("leaf" + i, { pivot, axis: [0, 0, 1] });
        const y = T - ct - (i + 0.5) * lt;
        const pos = [PW / 2 + 0.005, y, 0];
        k.add(evenBox(PW, lt * 0.8, PH), {
          pos,
          part,
          flat: 0.15,
          weight: 0.25,
          even: true,
          jitter: 0,
          size: 0.6,
          color: (c) => sides(c.s.face),
        });
        for (const up of [1, -1]) {
          const last = i === leaves - 1;
          // The last leaf's upper face would draw over its turned-up
          // underside, so it is left out (it only shows mid-turn).
          if (last && up > 0) continue;
          const shown = up < 0 && last;
          k.add(quad(PW, PH, up), {
            pos: [pos[0], y + up * lt * 0.4, 0],
            part,
            flat: 0.15,
            weight: shown ? 6 : 0.35,
            even: true,
            jitter: 0.01,
            size: 1.25,
            color: (c) =>
              pageCol(c, c.p[0], c.p[2], i * 2 + (up < 0 ? 1 : 0), false, up < 0, shown),
          });
          if (shown) inkDots(i * 2 + 1, false, true, y + up * lt * 0.4 - 0.0012, part);
        }
      }
      // The left pile's edges, shown once the leaves under the top one hide.
      const pileH = (leaves - 1) * lt;
      k.add(evenBox(PW, pileH, PH), {
        pos: [-PW / 2 - 0.005, ct + pileH / 2, 0],
        part: k.part("pile"),
        flat: 0.15,
        weight: 1,
        even: true,
        jitter: 0,
        size: 1.1,
        color: (c) => {
          if (c.s.face === 2 || c.s.face === 3) return null;
          return keep(pageEdge(c.p[1]));
        },
      });
      k.reach([-W, 0, H / 2]);
      k.reach([-W, 0, -H / 2]);
    },
  },

  // A laptop you can use: tap its keys (or type on your own keyboard) and the
  // letters appear on the screen; tap or drag on the trackpad to move the
  // pointer. Tap anywhere else to close or open the lid.
  laptop: {
    alive: true,
    options: [{ key: "color", label: "Case", type: "color", default: "#b9bec6" }],
    controls: [
      { key: "open", label: "Open", type: "toggle", default: 1, ease: 1.3 },
      { key: "type", label: "Type", type: "pulse", ease: 0.2 },
      { key: "pad", label: "Trackpad", type: "pulse", ease: 0.3 },
    ],
    action: {
      key: "open",
      label: "Open or close",
      quiet: ["type", "pad"],
      at(p, c) {
        if (c.open < 0.9 || Math.abs(p[1] - LAPTOP.hb) > 0.05) return null;
        const i = LAPTOP_KEYS.findIndex((k) => Math.abs(p[0] - k.x) < k.w / 2 + 0.008 && Math.abs(p[2] - k.z) < k.d / 2 + 0.008); // prettier-ignore
        // Taps queue up, so quick typing never loses a key between frames.
        if (i >= 0) {
          LAPTOP_STATE.queue.push({ pick: i });
          return { key: "type", pick: i };
        }
        if (onPad(p)) {
          LAPTOP_STATE.queue.push({ pad: p.slice() });
          return { key: "pad" };
        }
        return null;
      },
    },
    typeKey(ch) {
      if (!LAPTOP_STATE.open) return null;
      const i = keyFor(ch);
      if (i < 0) return null;
      LAPTOP_STATE.queue.push({ pick: i, typed: ch.length === 1 ? ch : null });
      return { key: "type", pick: i };
    },
    drag: {
      at: (p) => LAPTOP_STATE.open && onPad(p),
      start(p) {
        LAPTOP_STATE.dragFrom = p;
      },
      move(p) {
        const st = LAPTOP_STATE;
        if (!st.dragFrom) return;
        // Relative, like a real trackpad: the pointer moves with the finger.
        st.target = [
          clamp(st.target[0] + ((p[0] - st.dragFrom[0]) / PAD.w) * 1.2, 0.02, 0.94),
          clamp(st.target[1] + ((p[2] - st.dragFrom[2]) / PAD.d) * 1.2, 0.02, 0.9),
        ];
        st.dragFrom = p;
      },
      end() {
        LAPTOP_STATE.dragFrom = null;
      },
    },
    screen: {
      width: 640,
      height: 396,
      reset() {
        Object.assign(LAPTOP_STATE, laptopStart());
      },
      version(time) {
        const st = LAPTOP_STATE;
        const blink = Math.floor(time * 2) % 2;
        const ripple = time - st.clickAt < 0.5 ? Math.floor(time * 30) : -1;
        return \`\${st.text}|\${st.pointer[0].toFixed(3)},\${st.pointer[1].toFixed(3)}|\${blink}|\${ripple}\`;
      },
      draw(g, time) {
        drawLaptopScreen(g, time);
      },
    },
    drive(t, c, out, info) {
      const st = LAPTOP_STATE;
      st.open = c.open > 0.9;
      // modeled open; closing turns the lid back down onto the keys.
      const a = LAPTOP.open * (1 - ease3(c.open));
      out.parts.lid = { angle: a };
      out.parts.bezel = { angle: a, visible: smoothstep(0.02, 0.3, c.open) };
      out.parts.screen = { angle: a, visible: smoothstep(0.72, 1, c.open) };
      out.parts.deck = { visible: smoothstep(0.02, 0.2, c.open) };
      for (const ev of st.queue.splice(0)) {
        if (ev.pick !== undefined) {
          const k = LAPTOP_KEYS[ev.pick];
          typeInto(st, k, ev.typed);
          st.pressKey = ev.pick;
          st.pressAt = info.time;
          out.cues.push(k.id === "SPACE" ? { voice: "keytap", f: 1500, vol: 0.9 } : { voice: "keytap", f: 2200 + 60 * (ev.pick % 7) }); // prettier-ignore
        } else if (ev.pad) {
          // A tap on the trackpad: the pointer jumps to the matching spot
          // and clicks there.
          st.target = padUV(ev.pad);
          st.clickAt = info.time + 0.2;
          out.cues.push({ voice: "click", f: 900, decay: 1.5, vol: 0.8 });
        }
      }
      // The pointer glides to its target.
      const k = 1 - Math.exp(-(info.time - (st.lastTime ?? info.time)) * 14);
      st.lastTime = info.time;
      st.pointer = [st.pointer[0] + (st.target[0] - st.pointer[0]) * k, st.pointer[1] + (st.target[1] - st.pointer[1]) * k]; // prettier-ignore
      const since = info.time - st.pressAt;
      if (since >= 0 && since < 0.2) out.press = st.pressKey + 0.999 * Math.sin((Math.PI * since) / 0.2); // prettier-ignore
    },
    build(k, o) {
      const alu = o.color;
      const { W, D, hb, hl } = LAPTOP;
      // Bead-blasted aluminum: smooth, lit, a faint soft grain (no speckle).
      const metal = (c) => {
        const grain = 0.985 + 0.02 * c.noise(c.p[0] * 20, c.p[1] * 20, c.p[2] * 20);
        return lit(shade(alu, grain), c.n, { amb: 0.66, dif: 0.4, spec: 0.35, pow: 20 });
      };
      const shell = { flat: 0.15, even: true, size: 1.1, jitter: 0.006 };
      // Base; the deck with the keys is its own part so it can hide under
      // the closed lid (splats are ordered by their modeled positions).
      // Thin sides get small, dense splats so the edges stay crisp.
      k.add(roundBox(W, hb, D, 0.02, { bottom: false, top: false }), {
        ...shell,
        even: false,
        size: 1.4,
        weight: 3,
        opacity: 1,
        pos: [0, hb / 2, 0],
        color: metal,
      });
      const deck = k.part("deck", { pivot: [0, hb, 0] });
      k.add(quad(W - 0.04, D - 0.04), {
        ...shell,
        pos: [0, hb, 0],
        part: deck,
        weight: 1.3,
        color: (c) => {
          const [x, , z] = c.p;
          // Under a key there is nothing (the key covers it); round the keys,
          // the dark well they sit in.
          for (const key of LAPTOP_KEYS) {
            if (Math.abs(x - key.x) < key.w / 2 - 0.004 && Math.abs(z - key.z) < key.d / 2 - 0.004) return null; // prettier-ignore
          }
          if (Math.abs(x) < 0.66 && z > -0.41 && z < 0.08) return keep(lit("#50555d", c.n, { spec: 0.05 }), 0.8); // prettier-ignore
          if (onPad(c.p)) {
            const e = Math.min(PAD.w / 2 - Math.abs(x - PAD.x), PAD.d / 2 - Math.abs(z - PAD.z));
            return keep(e < 0.006 ? shade(metal(c), 0.8) : lit(shade(alu, 1.03), c.n, { amb: 0.7, spec: 0.15 }), 1.1); // prettier-ignore
          }
          return metal(c);
        },
      });
      // Key caps: dark and raised. Each one goes down when pressed
      // (behavior "key").
      const legendDots = [];
      LAPTOP_KEYS.forEach((key, i) => {
        const legend = key.label;
        k.add(k.box(key.w, 0.012, key.d), {
          pos: [key.x, hb + 0.006, key.z],
          part: deck,
          kind: "key",
          params: [i, 0],
          flat: 0.15,
          even: true,
          weight: 3.2,
          size: 0.8,
          jitter: 0,
          pattern: false,
          color: (c) => {
            if (c.n[1] < -0.5) return null;
            const cap = "#2a2d33";
            if (c.n[1] > 0.5) return keep(lit(cap, c.n, { amb: 0.9, dif: 0.25, spec: 0.12 }), 0.9); // prettier-ignore
            return keep(lit(shade(cap, 0.8), c.n, { amb: 0.9, dif: 0.25, spec: 0 }));
          },
        });
        // Its letters' pixels (5 x 7 font), each filled by a 3 x 3 grid of
        // dots, just above the cap.
        if (!legend) return;
        const gp = Math.min(0.006, (0.78 * key.w) / (6 * legend.length - 1));
        const gw = (6 * legend.length - 1) * gp;
        for (let t = 0; t < 7; t++) {
          for (let s = 0; s < 6 * legend.length; s++) {
            if (!inked([legend], s + 0.5, t + 0.5)) continue;
            for (let a = 0; a < 3; a++) {
              for (let b = 0; b < 3; b++) {
                legendDots.push({
                  key: i,
                  x: key.x - gw / 2 + (s + (a + 0.5) / 3) * gp,
                  z: key.z - 3.5 * gp + (t + (b + 0.5) / 3) * gp,
                });
              }
            }
          }
        }
      });
      // The letters: sharp because every dot sits on its pixel (random
      // splats on the caps made them blurry). A dot is about a third of a
      // font pixel across (0.0022 / the laptop's base splat size, which
      // goes as 1 / sqrt(budget)); on a small budget there are fewer dots
      // (the list is sampled) and they are bigger.
      const dotSize = 0.0022 / (0.0056 * Math.sqrt(200000 / k.count));
      k.cloud({ count: legendDots.length, pattern: false, part: deck }, (rand, j, n) => {
        const dot = legendDots[Math.floor((j * legendDots.length) / n)];
        return {
          p: [dot.x, hb + 0.0126, dot.z],
          n: [0, 1, 0],
          flat: 0.2,
          color: "#eef1f5",
          opacity: 1,
          size: dotSize * Math.sqrt(Math.max(1, legendDots.length / n)),
          kind: "key",
          params: [dot.key, 0],
        };
      });
      // The lid, hinged along the back edge and modeled standing open.
      const pivot = [0, hb + hl / 2, -D / 2 + 0.01];
      const q = quatAxisAngle([1, 0, 0], -LAPTOP.open);
      const place = (p) => add(pivot, quatRotate(q, sub(p, pivot)));
      const lid = k.part("lid", { pivot, axis: [1, 0, 0] });
      const bezel = k.part("bezel", { pivot, axis: [1, 0, 0] });
      const screen = k.part("screen", { pivot, axis: [1, 0, 0] });
      const lidY = hb + hl / 2 + 0.002;
      k.add(roundBox(W, hl, D, 0.012, { bottom: false }), {
        ...shell,
        even: false,
        size: 1.3,
        weight: 1.6,
        opacity: 1,
        pos: place([0, lidY, 0]),
        quat: q,
        part: lid,
        color: metal,
      });
      const SW = W - 0.14;
      const SD = D - 0.16;
      // The black bezel only round the screen: under the screen there is
      // nothing, so the two never sort through each other (that was the
      // speckle on the old screen).
      k.add(quad(W - 0.03, D - 0.03, -1), {
        pos: place([0, lidY - hl / 2 - 0.001, 0]),
        quat: q,
        part: bezel,
        flat: 0.12,
        even: true,
        size: 1.1,
        jitter: 0,
        pattern: false,
        color: (c) => {
          const [x, , z] = c.lp;
          if (Math.abs(x) < SW / 2 - 0.004 && Math.abs(z - 0.005) < SD / 2 - 0.004) return null;
          if (Math.hypot(x, z - (D - 0.03) / 2 + 0.035) < 0.01) return keep("#3a4250");
          // Smaller splats at the outer edge, so the bezel stops at the case.
          const inner = Math.max(Math.abs(x) - SW / 2, Math.abs(z - 0.005) - SD / 2);
          const edge = Math.min(
            (W - 0.03) / 2 - Math.abs(x),
            (D - 0.03) / 2 - Math.abs(z),
            inner + 0.004,
          );
          const col = mix("#0b0e13", "#1a1f27", 0.5 + 0.4 * (z / D));
          return keep(col, 0.35 + 0.65 * clamp(edge / 0.03, 0, 1));
        },
      });
      // The screen: every splat shows the live picture (behavior "screen").
      k.add(quad(SW, SD, -1), {
        pos: place([0, lidY - hl / 2 - 0.002, 0.005]),
        quat: q,
        part: screen,
        kind: "screen",
        params: (c) => [c.u, 1 - c.v],
        flat: 0.08,
        even: true,
        weight: 7,
        size: 1.05,
        jitter: 0,
        pattern: false,
        color: () => keep("#202838"),
      });
    },
  },

  "music-box": {
    alive: true,
    options: [{ key: "wood", label: "Wood", type: "color", default: "#8a4526" }],
    controls: [{ key: "open", label: "Open", type: "toggle", default: 1, ease: 1.4 }],
    action: { key: "open", label: "Open or close" },
    // Hands-on (lane Hands engine B): lift the lid on its hinge, and turn
    // the crank by dragging round it: each click of the crank plays the
    // tune's next note, and the dancer turns with it.
    hands: {
      joints: [
        {
          type: "hinge",
          part: "lid",
          pivot: [0, 0.5, -0.38],
          axis: [-1, 0, 0],
          min: 0,
          max: 1.95,
          bounce: 0.15,
          start: (c) => 1.95 * ease3(c.open),
          pos: [0, 0.55, 0],
          pick: [0.6, 0.12, 0.42],
          sound: (ev, vol) => (ev.v < 1 ? { voice: "wood", f: 450, decay: 1.1, vol: vol * 0.9 } : { voice: "wood", f: 600, decay: 0.4, vol: vol * 0.4 }), // prettier-ignore
          // The lid's top hides once it stands open (the mirror shows), and
          // the dancer rises out of the box as it opens.
          also: (a, parts) => {
            if (parts.lid) parts.lidTop = { ...parts.lid, visible: 1 - smoothstep(1.15, 1.6, a) };
            parts.dancer = { ...parts.dancer, offset: [0, -0.34 * (1 - smoothstep(0.7, 1.95, a)), 0] }; // prettier-ignore
            // The floating notes only while it stands open.
            if (a < 1.3) NOTE_PATHS.forEach((n, i) => (parts["note" + i] = { visible: 0 }));
            MUSIC_HAND.lid = a;
          },
        },
        {
          type: "dial",
          part: "crank",
          pivot: [0.58, 0.25, 0],
          axis: [1, 0, 0],
          detents: MUSIC_CLICKS,
          drag: 2.5,
          // (Small on a phone: a press on the box's side near it finds it.)
          pos: [0.6, 0.3, 0],
          pick: [0.12, 0.22, 0.24],
          sound: (ev) => {
            if (ev.kind !== "detent") return null;
            const n = MUSIC_TUNE[((ev.n % MUSIC_TUNE.length) + MUSIC_TUNE.length) % MUSIC_TUNE.length]; // prettier-ignore
            return n === "-" ? null : { voice: "tine", f: n, vol: 0.7 };
          },
          also: (a, parts) => {
            parts.dancer = { ...parts.dancer, angle: 0.5 * a };
            MUSIC_HAND.a = 0.5 * a;
          },
        },
      ],
    },
    drive(t, c, out) {
      const m = mem(c);
      // Turned by hand (Hands-on): sorted again every quarter radian she (or
      // the lid) turns, and once more on the frame after (lane Hands engine B).
      if (MUSIC_HAND.a !== null) {
        const slot = Math.round(MUSIC_HAND.a / 0.25) * 64 + Math.round(MUSIC_HAND.lid / 0.25);
        if (slot !== MUSIC_HAND.slot || MUSIC_HAND.again) {
          MUSIC_HAND.again = slot !== MUSIC_HAND.slot;
          MUSIC_HAND.slot = slot;
          out.resortPose = true;
        }
      }
      const o = ease3(c.open);
      out.parts.lid = { angle: -1.95 * o };
      out.parts.lidTop = { angle: -1.95 * o, visible: 1 - smoothstep(0.55, 0.8, c.open) };
      out.parts.dancer = {
        angle: integrate(m, "spin", t, 2.4 * c.open),
        offset: [0, -0.34 * (1 - smoothstep(0.35, 1, c.open)), 0],
      };
      out.parts.crank = { angle: integrate(m, "crank", t, 3 * c.open) };
      NOTE_PATHS.forEach((n, i) => {
        const s = (t * 0.28 + n.phase) % 1;
        out.parts["note" + i] = {
          offset: [0.12 * Math.sin(s * 5 + i), s * 0.75, 0],
          visible:
            smoothstep(0.6, 1, c.open) * smoothstep(0, 0.12, s) * (1 - smoothstep(0.75, 1, s)),
        };
      });
    },
    build(k, o) {
      const wood = o.wood;
      const gold = "#d8b25a";
      const velvet = "#9e1b32";
      const W = 1.1;
      const H = 0.5;
      const D = 0.76;
      const top = H;
      // Polished wood like the Enigma machine's case (lane Sharpness A):
      // broad, soft grain bands and a sheen, no fine noise.
      const grain = (c) => {
        const g =
          0.5 +
          0.5 * Math.sin(c.p[1] * 22 + c.p[2] * 9 + c.p[0] * 4 + Math.sin(c.p[0] * 3.1) * 1.4);
        return keep(
          lit(mix(wood, shade(wood, 0.84), g), c.n, {
            amb: 0.66,
            dif: 0.42,
            spec: 0.3,
          }),
        );
      };
      k.add(roundBox(W, H, D, 0.03, { top: false, bottom: false, even2d: true }), {
        even: true,
        opacity: 1,
        jitter: 0.008,
        weight: 1.8,
        pos: [0, H / 2, 0],
        flat: 0.15,
        color: (c) => {
          if (Math.abs(c.p[1] - 0.12) < 0.012 || Math.abs(c.p[1] - (H - 0.05)) < 0.01)
            return keep(lit(gold, c.n, { spec: 0.5 }));
          return grain(c);
        },
      });
      // Velvet lining and the floor the dancer stands on.
      k.add(evenBox(W - 0.07, H - 0.06, D - 0.07), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, H / 2 + 0.03, 0],
        flat: 0.3,
        color: (c) => (c.s.face === 2 ? null : shade(velvet, 0.78 + 0.08 * c.rand())),
      });
      // The lid with a mirror inside, hinged at the back. Its top is a part
      // of its own that hides while the lid stands open, so the mirror shows
      // (splats keep the order of the closed box).
      const lid = k.part("lid", { pivot: [0, top, -D / 2], axis: [1, 0, 0] });
      const lidTop = k.part("lidTop", { pivot: [0, top, -D / 2], axis: [1, 0, 0] });
      k.add(roundBox(W, 0.1, D, 0.03, { top: false, even2d: true }), {
        even: true,
        opacity: 1,
        jitter: 0.008,
        weight: 1.8,
        pos: [0, top + 0.05, 0],
        part: lid,
        flat: 0.15,
        color: (c) => {
          const [x, , z] = c.p;
          if (c.s.face === 3) {
            const inM = Math.abs(x) < W / 2 - 0.1 && Math.abs(z) < D / 2 - 0.1;
            if (inM) return keep(mix("#c9d3de", "#f4f7fb", 0.5 + 0.5 * Math.sin((x - z) * 5)));
            return shade(velvet, 0.8);
          }
          return grain(c);
        },
      });
      k.add(quad(W - 0.06, D - 0.06), {
        even: true,
        opacity: 1,
        jitter: 0.008,
        weight: 1.8,
        pos: [0, top + 0.1, 0],
        part: lidTop,
        flat: 0.15,
        color: (c) => {
          const [x, , z] = c.p;
          const r = Math.hypot(x, z);
          if (
            Math.abs(r - 0.2) < 0.012 ||
            Math.abs(Math.max(Math.abs(x) / (W / 2 - 0.08), Math.abs(z) / (D / 2 - 0.08)) - 1) <
              0.02
          )
            return keep(lit(gold, c.n, { spec: 0.5 }));
          return grain(c);
        },
      });
      // The dancer on her turntable (she rises as the lid opens).
      const base = 0.06;
      const dancer = k.part("dancer", { pivot: [0, base, 0.02] });
      const skin = "#f3cfb3";
      const pink = "#ff8fb8";
      const d = (shape, opts) =>
        k.add(shape, {
          opacity: 1,
          jitter: 0.015,
          part: dancer,
          flat: 0.25,
          weight: 2.2,
          pattern: false,
          ...opts,
        });
      d(k.cylinder(0.12, 0.02), {
        pos: [0, top - 0.05, 0.02],
        color: (c) => lit(gold, c.n, { spec: 0.5 }),
      });
      for (const s of [-1, 1])
        d(k.cylinder(0.011, 0.2, { caps: false }), {
          pos: [s * 0.015, top + 0.06, 0.02],
          rot: [0, 0, s * 4],
          color: (c) => lit(skin, c.n),
        });
      d(k.cone(0.13, 0.02, 0.06), {
        pos: [0, top + 0.17, 0.02],
        color: (c) =>
          lit(mix(pink, "#ffffff", 0.3 * ((c.u * 18) % 1 < 0.5)), c.n, { amb: 0.75, dif: 0.35 }),
      });
      d(k.ellipsoid(0.035, 0.06, 0.03), {
        pos: [0, top + 0.23, 0.02],
        color: (c) => lit(pink, c.n),
      });
      d(k.sphere(0.033), { pos: [0, top + 0.315, 0.02], color: (c) => lit(skin, c.n) });
      d(k.sphere(0.018), { pos: [0, top + 0.35, 0.005], color: (c) => lit("#4a2c1d", c.n) });
      d(
        k.tube(
          (tt) => {
            const a = Math.PI * (0.1 + 0.8 * tt);
            return [Math.cos(a) * 0.07, top + 0.26 + Math.sin(a) * 0.13, 0.02];
          },
          0.008,
          { samples: 48, grid: 24 },
        ),
        { color: (c) => lit(skin, c.n) },
      );
      // The crank on the side.
      const crank = k.part("crank", { pivot: [W / 2 + 0.03, H / 2, 0], axis: [1, 0, 0] });
      k.add(evenCylinder(0.02, 0.02, 0.06), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [W / 2 + 0.03, H / 2, 0],
        rot: [0, 0, 90],
        part: crank,
        weight: 2,
        color: (c) => lit(gold, c.n, { spec: 0.5 }),
      });
      k.add(evenCylinder(0.015, 0.015, 0.14), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [W / 2 + 0.06, H / 2 + 0.06, 0],
        part: crank,
        weight: 2,
        color: (c) => lit(gold, c.n, { spec: 0.5 }),
      });
      k.add(k.sphere(0.03), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [W / 2 + 0.06, H / 2 + 0.13, 0],
        part: crank,
        weight: 2,
        color: (c) => lit("#f4efe6", c.n),
      });
      // Musical notes that float up while it plays.
      NOTE_PATHS.forEach((n, i) => {
        const part = k.part("note" + i, { pivot: [n.x, top + 0.2, n.z] });
        const col = ["#f2c14e", "#ff8fb8", "#8ecae6"][i];
        const at = [n.x, top + 0.25, n.z];
        k.add(evenEllipsoid(k, 0.04, 0.03, 0.02), {
          even: true,
          opacity: 1,
          jitter: 0.015,
          pos: at,
          rot: [0, 0, 25],
          part,
          weight: 3,
          pattern: false,
          color: (c) => keep(lit(col, c.n, { spec: 0.5 })),
        });
        k.add(evenCylinder(0.008, 0.008, 0.14, false), {
          even: true,
          opacity: 1,
          jitter: 0.015,
          pos: [at[0] + 0.035, at[1] + 0.07, at[2]],
          part,
          weight: 3,
          pattern: false,
          color: col,
        });
        k.add(evenEllipsoid(k, 0.035, 0.012, 0.01), {
          even: true,
          opacity: 1,
          jitter: 0.015,
          pos: [at[0] + 0.06, at[1] + 0.125, at[2]],
          rot: [0, 0, -30],
          part,
          weight: 3,
          pattern: false,
          color: col,
        });
      });
      k.reach([0, top + 1.0, 0]);
    },
  },

  clock: {
    alive: true,
    options: [
      { key: "color", label: "Color", type: "color", default: "#d6453d" },
      // Lane Fix5: the time zone the hands show (this device's own by
      // default, read by the browser with no permission needed).
      {
        key: "zone",
        label: "Time zone",
        type: "select",
        default: "local",
        choices: CLOCK_ZONES.map(([id, label]) => ({ id, label })),
      },
    ],
    controls: [{ key: "ring", label: "Ring", type: "pulse", ease: 2.2 }],
    action: { key: "ring", label: "Ring the bell" },
    // Hands-on (lane Hands-on H3): drag round the face to set the time. The
    // minute hand turns under the finger, clicking at each minute, and the
    // hour hand follows a twelfth as fast; the second hand keeps ticking.
    // (Twelve turns either way at most; ↺ winds back to the real time.)
    hands: {
      joints: (d) => [
        {
          type: "dial",
          part: "minute",
          pivot: [0, 0, 0],
          axis: [0, 0, 1],
          min: -13 * TAU,
          max: 13 * TAU,
          detents: 60,
          drag: 9,
          start: () => {
            const [hh, mm, ss] = clockTime(new Date(), d?.zone);
            const m = mm + ss / 60;
            CLOCK_HAND.a0 = (-m / 60) * TAU;
            CLOCK_HAND.h0 = (-((hh % 12) + m / 60) / 12) * TAU;
            return CLOCK_HAND.a0;
          },
          pos: [0, 0, 0.2],
          pick: [0.74, 0.74, 0.3],
          sound: (ev, vol) =>
            ev.kind === "detent" ? { voice: "click", f: 2400, decay: 0.03, vol: 0.12 + 0.2 * Math.min(1, vol) } : null, // prettier-ignore
          also: (a, parts) => {
            parts.hour = { angle: CLOCK_HAND.h0 + (a - CLOCK_HAND.a0) / 12 };
          },
        },
      ],
    },
    drive(t, c, out, info) {
      // The hands show the real time, in this device's zone or the one
      // picked in the Toy tab.
      const d = new Date();
      const [hh, mm, ss] = clockTime(d, info?.data?.zone);
      const s = ss + d.getMilliseconds() / 1000;
      const m = mm + s / 60;
      const h = (hh % 12) + m / 60;
      const tick = Math.floor(s) + ease3(clamp((s % 1) / 0.18, 0, 1));
      out.parts.hour = { angle: (-h / 12) * TAU };
      out.parts.minute = { angle: (-m / 60) * TAU };
      out.parts.second = { angle: (-tick / 60) * TAU };
      // Splats sort in the pose they were built in (the hands at 12), so a
      // hand turned round would sort as if it still pointed up and the dial
      // could draw over it. Sort the hands where they stand each time the
      // second hand has ticked (lane Fix4).
      const kd = info?.data;
      const now = Math.floor(h * 3600 - 0.2);
      if (kd && now !== kd.handsSorted) {
        kd.handsSorted = now;
        out.resortPose = true;
      }
      const r = c.ring;
      const time = info?.time ?? t;
      out.parts.hammer = { angle: r > 0 ? 0.5 * Math.sin(time * 70) * Math.min(1, r * 2) : 0 };
      out.body = {
        quat: [
          0,
          0,
          Math.sin(0.025 * Math.sin(time * 55) * r),
          Math.cos(0.025 * Math.sin(time * 55) * r),
        ],
        offset: [0, 0.015 * Math.abs(Math.sin(time * 40)) * r, 0],
      };
    },
    build(k, o) {
      // drive() keeps when it last sorted the hands here, and reads the
      // time zone (lane Fix5).
      k.data = { zone: o.zone && o.zone !== "local" ? o.zone : null };
      const body = o.color;
      const R = 0.8;
      const Dp = 0.34;
      const zf = Dp / 2;
      const dial = "#fbf8f0";
      // Body: a drum facing the viewer.
      k.add(k.cylinder(R, Dp, { caps: "bottom" }), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        rot: [90, 0, 0],
        flat: 0.15,
        interior: 0.06,
        core: "#6a6f78",
        color: (c) => lit(body, c.n, { amb: 0.64, dif: 0.45, spec: 0.45, pow: 26 }),
      });
      k.add(evenTorus(k, R, 0.055), {
        opacity: 1,
        jitter: 0.015,
        even: true,
        pos: [0, 0, zf],
        rot: [90, 0, 0],
        flat: 0.2,
        weight: 1.3,
        color: (c) => chrome(c.n),
      });
      // The dial: ticks, numbers and a maker's line.
      // The dial: one face only, spread evenly, so no splats are wasted on
      // its back and the case never shows through as speckle.
      const dialR = R - 0.03;
      const dialShape = k.param(
        (u, v) => [dialR * v * Math.sin(TAU * u), dialR * v * Math.cos(TAU * u), 0],
        { grid: 96 },
      );
      k.add(dialShape, {
        opacity: 1,
        jitter: 0.01,
        even: true,
        pos: [0, 0, zf + 0.002],
        flat: 0.12,
        pattern: false,
        color: (c) => {
          const x = c.p[0];
          const y = c.p[1];
          const r = Math.hypot(x, y);
          const a = (Math.atan2(x, y) / TAU + 1) % 1;
          const mm = a * 60;
          const md = Math.abs(mm - Math.round(mm));
          const hour = Math.round(mm) % 5 === 0;
          if (
            r > 0.6 &&
            r < 0.72 &&
            md * ((r * TAU) / 60) < (hour ? 0.018 : 0.006) &&
            (hour || r > 0.66)
          )
            return keep("#1d1d22");
          const hn = Math.round(a * 12) || 12;
          const ha = (hn / 12) * TAU;
          const cx = Math.sin(ha) * 0.49;
          const cy = Math.cos(ha) * 0.49;
          const sz = 0.05;
          if (
            Math.hypot(x - cx, y - cy) < 0.12 &&
            textDist(String(hn), (x - cx) / sz, (y - cy) / sz) < 0.24
          )
            return keep("#1d1d22");
          return keep(shade(dial, 0.97 + 0.03 * (1 - r)));
        },
      });
      // Hands (parts turning about the center). Each is a thin, flat blade
      // with a round boss, stacked on a visible arbor a few millimetres apart
      // like a real clock's: high enough above the dial that the dial's big,
      // flat splats never sort in front of a hand (lane Fix4).
      const HAND_Z = { hour: 0.04, minute: 0.055, second: 0.07 };
      const hand = (name, len, w, col, back = 0, tip = 0.5) => {
        const part = k.part(name, { pivot: [0, 0, 0], axis: [0, 0, 1] });
        const z = zf + HAND_Z[name];
        const look = {
          even: true,
          opacity: 1,
          jitter: 0.015,
          part,
          flat: 0.15,
          weight: 3,
          pattern: false,
          color: (c) => keep(lit(col, [0, 0, 1], { spec: 0.4 })),
        };
        // The blade: full width at the center, tapering to a point.
        const blade = k.param(
          (u, v) => {
            const y = -back + v * (len + back);
            const f = y < 0 ? 1 : 1 - (1 - tip) * (y / len);
            const pt = y > len - w ? (len - y) / w : 1;
            return [(u - 0.5) * w * f * Math.max(0, pt), y, 0];
          },
          { grid: 48 },
        );
        k.add(blade, { ...look, pos: [0, 0, z] });
        // The boss round the arbor.
        k.add(k.disc(w * 0.85 + 0.012), { ...look, pos: [0, 0, z + 0.001], rot: [90, 0, 0] });
        return part;
      };
      hand("hour", 0.36, 0.055, "#1d1d22", 0.05, 0.55);
      hand("minute", 0.55, 0.04, "#1d1d22", 0.06, 0.45);
      const sec = hand("second", 0.6, 0.012, "#d62828", 0.16, 0.8);
      k.add(k.disc(0.035), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, -0.11, zf + HAND_Z.second + 0.001],
        rot: [90, 0, 0],
        part: sec,
        weight: 3,
        pattern: false,
        color: (c) => keep(lit("#d62828", [0, 0, 1], { spec: 0.4 })),
      });
      // The arbor the hands turn on, from the dial up through them, and the
      // little cap nut that holds them on.
      k.add(k.cylinder(0.014, HAND_Z.second + 0.01, { caps: false }), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, 0, zf + (HAND_Z.second + 0.01) / 2],
        rot: [90, 0, 0],
        weight: 3,
        pattern: false,
        color: (c) => chrome(c.n, "#c9a45c"),
      });
      k.add(k.sphere(0.022), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, 0, zf + HAND_Z.second + 0.008],
        scale: [1, 1, 0.55],
        weight: 3,
        pattern: false,
        color: (c) => chrome(c.n, "#c9a45c"),
      });
      // Bells, a handle and a hammer between them.
      for (const s of [-1, 1]) {
        k.add(
          k.lathe(
            [
              [0.3, 0],
              [0.29, 0.06],
              [0.24, 0.16],
              [0.14, 0.23],
              [0, 0.25],
            ],
            { grid: 64 },
          ),
          {
            even: true,
            opacity: 1,
            jitter: 0.015,
            pos: [s * 0.46, 0.66, 0],
            rot: [0, 0, s * -32],
            flat: 0.15,
            color: (c) => chrome(c.n, "#e8c06a"),
          },
        );
        k.add(k.cylinder(0.035, 0.18), {
          even: true,
          opacity: 1,
          jitter: 0.015,
          pos: [s * 0.42, -0.83, 0],
          rot: [0, 0, s * 22],
          weight: 2,
          color: (c) => chrome(c.n),
        });
      }
      k.add(
        k.tube(
          (tt) => {
            const a = Math.PI * (0.12 + 0.76 * tt);
            return [Math.cos(a) * 0.55, 0.66 + Math.sin(a) * 0.42, -0.02];
          },
          0.028,
          { samples: 64, grid: 32 },
        ),
        { opacity: 1, jitter: 0.015, flat: 0.2, weight: 1.5, color: (c) => chrome(c.n) },
      );
      const hammer = k.part("hammer", { pivot: [0, 0.8, 0], axis: [0, 0, 1] });
      k.add(k.cylinder(0.012, 0.22), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, 0.9, 0.02],
        part: hammer,
        weight: 2,
        color: (c) => chrome(c.n),
      });
      k.add(k.sphere(0.04), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, 1.01, 0.02],
        part: hammer,
        weight: 2,
        color: (c) => chrome(c.n),
      });
    },
  },

  "gift-box": {
    // Lane Any pose: turned over in Hands-on, its rising splats keep to the
    // toy's own frame (the confetti bursts out of the open lid), not the
    // world's up.
    gravity: false,
    alive: true,
    options: [
      { key: "paper", label: "Paper", type: "color", default: "#e8435a" },
      { key: "ribbon", label: "Ribbon", type: "color", default: "#f6c343" },
    ],
    controls: [{ key: "open", label: "Open", type: "toggle", default: 0, ease: 1 }],
    action: { key: "open", label: "Open the present" },
    // Hands-on (lane Hands-on H3): lift the lid off and the star springs up
    // out of the box, with the confetti; set the lid back on (near its
    // place, or point at its place) and it clicks home, pushing the star
    // back down. The box itself stays put, so the lid can rest on it.
    hands: {
      floor: 0,
      pieces: () => [
        { part: "lid", pos: [0, 0.81, 0], pivot: [0, 0.81, -0.5], solid: GIFT_LID, points: surfacePoints(GIFT_LID, 1), pick: [0.6, 0.24, 0.6], mass: 0.3, friction: 0.7, restitution: 0.2 }, // prettier-ignore
        // The box: ground for the lid, never picked up.
        { pos: [0, 0.39, 0], solid: GIFT_BOX, pick: [1e-3, 1e-3, 1e-3] },
      ],
      joints: [
        {
          type: "socket",
          part: "lid",
          snap: 0.3,
          sound: () => ({ voice: "hollow", f: 180, decay: 0.2, vol: 0.5 }),
          also: (v, parts) => {
            const o = parts.lid?.offset;
            GIFT_HAND.off = o ? len(o) : 0;
          },
        },
      ],
      sound: (hit, vol) => ({ voice: "hollow", f: 140, decay: 0.15, vol: vol * 0.7 }),
    },
    drive(t, c, out) {
      const o = c.open;
      // By hand: the star springs up once the lid is off, and back down as
      // it goes on (a spring stepped on the toy's clock; lane Hands-on H3).
      const g = GIFT_HAND;
      const dt = g.t === null ? 0 : clamp(t - g.t, 0, 0.05);
      g.t = t;
      const want = smoothstep(0.35, 0.6, g.off);
      g.v += (90 * (want - g.pop) - 9 * g.v) * dt;
      g.pop += g.v * dt;
      if (want === 0 && g.pop < 0.002 && Math.abs(g.v) < 0.01) g.pop = g.v = 0;
      const up = easeOutBack(clamp(o / 0.7, 0, 1));
      out.parts.lid = { offset: [0, 0.55 * up, -0.45 * ease3(o)], angle: -0.9 * ease3(o) };
      const star = Math.max(easeOutBack(window01(o, 0.25, 1)), g.pop);
      out.parts.star = {
        offset: [0, 0.82 * star, 0],
        angle: 0.5 * Math.sin(t * 1.2) * Math.max(o, clamp(g.pop, 0, 1)),
      };
      out.parts.confetti = { visible: Math.max(smoothstep(0.25, 0.6, o), smoothstep(0.3, 0.8, g.pop)) }; // prettier-ignore
      out.amount = 0.6 + 0.6 * o;
    },
    build(k, o) {
      const paper = o.paper;
      const ribbon = o.ribbon;
      const S = 1;
      const H = 0.78;
      const band = 0.085;
      const wrap = (c, faceUp) => {
        const [x, y, z] = c.p;
        const f = c.s.face;
        const onX = Math.abs(x) < band && f !== 0 && f !== 1;
        const onZ = Math.abs(z) < band && f !== 4 && f !== 5;
        if (onX || onZ || (faceUp && (Math.abs(x) < band || Math.abs(z) < band)))
          return lit(ribbon, c.n, { amb: 0.7, dif: 0.35, spec: 0.5, pow: 20 });
        // Polka dots.
        const g = 0.16;
        const a = f < 2 ? z : x;
        const b = f === 2 || f === 3 ? z : y;
        const du = ((((a / g) % 1) + 1) % 1) - 0.5;
        const dv = ((((b / g + 0.5 * (Math.floor(a / g) % 2)) % 1) + 1) % 1) - 0.5;
        const dot2 = Math.hypot(du, dv) < 0.2;
        return lit(dot2 ? mix(paper, "#ffffff", 0.75) : paper, c.n, {
          amb: 0.66,
          dif: 0.42,
          spec: 0.18,
        });
      };
      k.add(roundBox(S, H, S, 0.025, { top: false, bottom: false, even2d: true }), {
        even: true,
        opacity: 1,
        jitter: 0.01,
        pos: [0, H / 2, 0],
        flat: 0.15,
        color: (c) => wrap(c, false),
      });
      k.add(evenBox(S - 0.03, H - 0.02, S - 0.03), {
        even: true,
        opacity: 1,
        jitter: 0.01,
        pos: [0, H / 2 + 0.01, 0],
        flat: 0.2,
        color: (c) => (c.s.face === 2 ? null : shade(paper, 0.45)),
      });
      // The lid, with the bow on top.
      const lidY = H + 0.03;
      const lid = k.part("lid", { pivot: [0, lidY, -S / 2], axis: [1, 0, 0] });
      k.add(roundBox(S + 0.07, 0.16, S + 0.07, 0.03, { even2d: true }), {
        even: true,
        opacity: 1,
        jitter: 0.01,
        pos: [0, lidY, 0],
        part: lid,
        flat: 0.15,
        color: (c) => (c.s.face === 3 ? shade(paper, 0.55) : wrap(c, c.s.face === 2)),
      });
      const bowY = lidY + 0.08;
      for (const s of [-1, 1]) {
        k.add(evenTorusOut(k, 0.13, 0.04), {
          even: true,
          opacity: 1,
          jitter: 0.01,
          pos: [s * 0.13, bowY + 0.1, 0],
          rot: [90, 0, s * -30],
          scale: [1.15, 1, 0.7],
          part: lid,
          flat: 0.2,
          weight: 1.4,
          color: (c) => lit(ribbon, c.n, { amb: 0.66, dif: 0.42, spec: 0.5, pow: 20 }),
        });
        k.add(evenBox(0.09, 0.012, 0.3), {
          even: true,
          opacity: 1,
          jitter: 0.01,
          pos: [s * 0.06, bowY + 0.005, 0.2],
          rot: [0, s * 25, 0],
          part: lid,
          flat: 0.15,
          weight: 1.4,
          color: (c) => lit(ribbon, c.n, { spec: 0.4 }),
        });
      }
      k.add(k.sphere(0.06), {
        even: true,
        opacity: 1,
        jitter: 0.01,
        pos: [0, bowY + 0.04, 0],
        part: lid,
        weight: 2,
        flat: 0.2,
        color: (c) => lit(ribbon, c.n, { spec: 0.5 }),
      });
      // The surprise: a golden star on a spring, and confetti.
      const star = k.part("star", { pivot: [0, H * 0.55, 0] });
      const pts = starPoints(0.3, 0.13);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        for (const z of [-0.04, 0.04])
          k.add(
            triShape(
              [0, H * 0.55, z * 1.6],
              [a[0], H * 0.55 + a[1], z],
              [b[0], H * 0.55 + b[1], z],
            ),
            {
              part: star,
              weight: 2,
              flat: 0.2,
              pattern: false,
              color: (c) =>
                keep(
                  lit("#ffd23f", c.n[2] * z > 0 ? c.n : mul(c.n, -1), {
                    amb: 0.75,
                    dif: 0.4,
                    spec: 0.6,
                  }),
                ),
            },
          );
      }
      k.add(
        k.tube(
          (tt) => [
            0.06 * Math.cos(tt * 30),
            0.05 + tt * (H * 0.55 - 0.3),
            0.06 * Math.sin(tt * 30),
          ],
          0.01,
          { samples: 200, grid: 32 },
        ),
        { part: star, weight: 2, flat: 0.3, color: (c) => chrome(c.n) },
      );
      const confetti = k.part("confetti", { pivot: [0, H, 0] });
      const cols = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff8fab"];
      k.cloud({ share: 0.025, size: 1.8, part: confetti, pattern: false }, (rand) => ({
        p: [(rand() - 0.5) * 0.7, H - 0.1 + rand() * 0.2, (rand() - 0.5) * 0.7],
        n: [rand() - 0.5, rand() - 0.5, rand() - 0.5],
        flat: 0.1,
        color: cols[Math.floor(rand() * cols.length)],
        opacity: 1,
        kind: "rise",
        params: [0.9 + 0.8 * rand(), rand()],
      }));
      k.reach([0, H + 1.05, 0]);
    },
  },

  umbrella: {
    alive: true,
    options: [
      {
        key: "style",
        label: "Canopy",
        type: "select",
        default: "rainbow",
        choices: [
          { id: "rainbow", label: "Rainbow" },
          { id: "stripes", label: "Stripes" },
          { id: "plain", label: "Plain" },
        ],
      },
      { key: "color", label: "Color", type: "color", default: "#d7263d" },
    ],
    controls: [{ key: "open", label: "Open", type: "toggle", default: 1, ease: 1.1 }],
    action: { key: "open", label: "Open or close" },
    // Hands-on (lane Hands-on H3): slide the runner down the shaft to close
    // it and up to open it; the ribs fold and spread with it. Open, the
    // runner is caught by the top latch: a firm pull frees it with a click.
    hands: {
      joints: [
        {
          type: "slider",
          part: "runner",
          pivot: [0, UMB.ry, 0],
          axis: [0, 1, 0],
          min: umbrellaRunner(UMB.shut),
          max: 0,
          stick: 0.05,
          gravity: false,
          friction: 3,
          damping: 8,
          bounce: 0.05,
          start: (c) => umbrellaRunner(UMB.shut * (1 - ease3(c.open))),
          pos: [0, UMB.ry, 0],
          pick: [0.2, 0.3, 0.2],
          sound: (ev, vol) =>
            ev.kind === "free" || ev.v > -0.01
              ? { voice: "click", f: 1800, decay: 0.05, vol: 0.5 }
              : { voice: "rustle", vol: vol * 0.6 },
          also: (v, parts) => {
            const th = umbrellaFold(v);
            for (let i = 0; i < 8; i++) parts["panel" + i] = { angle: th };
          },
        },
      ],
    },
    drive(t, c, out) {
      const close = 1 - ease3(c.open);
      for (let i = 0; i < 8; i++) out.parts["panel" + i] = { angle: UMB.shut * close };
      out.parts.runner = { offset: [0, umbrellaRunner(UMB.shut * close), 0] };
      out.body = { quat: quatAxisAngle([0, 1, 0], 0.15 * Math.sin(t * 0.5)) };
    },
    build(k, o) {
      const R = 1.05;
      const top = 0.72;
      const droop = 0.42;
      const handleCol = "#6b3f22";
      for (let i = 0; i < 8; i++) {
        const th = (i / 8) * TAU;
        const axis = [Math.cos(th), 0, -Math.sin(th)];
        const part = k.part("panel" + i, { pivot: [0, top, 0], axis });
        const col =
          o.style === "rainbow"
            ? hsv(i / 8, 0.7, 0.95)
            : o.style === "stripes"
              ? i % 2
                ? "#f7f4ee"
                : o.color
              : o.color;
        const w = Math.PI / 8;
        const panel = k.param(
          (u, v) => {
            const a = th + (u - 0.5) * 2 * w;
            const s = v;
            const scallop = 1 - 0.07 * Math.pow(Math.sin((u - 0.5) * Math.PI + Math.PI / 2), 2) * s;
            const r =
              s * R * (0.97 + 0.03 * Math.cos((u - 0.5) * 2 * w * 8)) * (2 - scallop) * 0.5 * 2;
            return [
              Math.sin(a) * r * scallop,
              top - droop * Math.pow(s, 1.7) + 0.06 * s * (1 - s),
              Math.cos(a) * r * scallop,
            ];
          },
          { grid: 40 },
        );
        k.add(panel, {
          even: true,
          opacity: 1,
          jitter: 0.015,
          part,
          flat: 0.12,
          color: (c) => {
            const e = Math.abs(c.u - 0.5) * 2;
            const n = c.n[1] < 0 ? mul(c.n, -1) : c.n;
            const base = lit(col, n, { amb: 0.66, dif: 0.42, spec: 0.25 });
            if (e > 0.965) return shade(base, 0.6);
            return c.v > 0.965 ? shade(base, 0.8) : base;
          },
        });
        // A rib under the seam.
        k.add(
          k.tube(
            (tt) => {
              const r = tt * R * 0.99;
              const a = th + w;
              return [
                Math.sin(a) * r * 0.93,
                top - droop * Math.pow(tt, 1.7) + 0.06 * tt * (1 - tt) - 0.012,
                Math.cos(a) * r * 0.93,
              ];
            },
            0.009,
            { samples: 32, grid: 16 },
          ),
          {
            even: true,
            opacity: 1,
            jitter: 0.015,
            part,
            weight: 1.5,
            flat: 0.3,
            color: "#3b3b40",
          },
        );
      }
      // The runner (lane Hands-on H3): the sleeve that slides up the shaft
      // to open the canopy, and its collar.
      const runner = k.part("runner", { pivot: [0, UMB.ry, 0] });
      k.add(evenCylinder(0.04, 0.04, 0.1), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, UMB.ry, 0],
        part: runner,
        flat: 0.2,
        weight: 1.5,
        color: (c) => lit("#2e2e33", c.n, { spec: 0.35 }),
      });
      k.add(evenCylinder(0.05, 0.05, 0.018), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, UMB.ry + 0.05, 0],
        part: runner,
        weight: 1.5,
        color: (c) => chrome(c.n),
      });
      // Shaft, tip and a crook handle.
      k.add(evenCylinder(0.022, 0.022, top + 0.95), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, (top - 0.95) / 2, 0],
        weight: 1.5,
        color: (c) => chrome(c.n),
      });
      k.add(evenCylinder(0.03, 0.005, 0.12), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, top + 0.06, 0],
        weight: 2,
        color: (c) => chrome(c.n),
      });
      k.add(
        evenTube(
          k,
          (tt) => {
            if (tt < 0.45) return [0, -0.95 - tt * 0.5, 0];
            const a = ((tt - 0.45) / 0.55) * Math.PI;
            return [0.14 - Math.cos(a) * 0.14, -1.175 - Math.sin(a) * 0.14, 0];
          },
          0.04,
          { samples: 96, grid: 32, caps: true },
        ),
        {
          even: true,
          opacity: 1,
          jitter: 0.015,
          flat: 0.2,
          weight: 1.3,
          color: (c) => lit(handleCol, c.n, { spec: 0.45 }),
        },
      );
    },
  },

  "desk-fan": {
    alive: true,
    options: [{ key: "color", label: "Color", type: "color", default: "#6cc2b3" }],
    controls: [
      { key: "power", label: "On", type: "toggle", default: 1, ease: 1.8 },
      { key: "swing", label: "Swing", type: "toggle", default: 1, ease: 1 },
    ],
    action: { key: "power", label: "Switch on or off" },
    // Hands-on (lane Hands-on H3): push the head up or down to tilt it on
    // its stiff hinge; it stays where it is left (and keeps swinging and
    // spinning), stopping with a knock at its tilt's ends.
    hands: {
      joints: [
        {
          type: "hinge",
          part: "head",
          pivot: FAN.yawAt,
          axis: [1, 0, 0],
          min: -0.5,
          max: 0.32,
          gravity: false,
          damping: 14,
          bounce: 0.05,
          pos: [0, FAN.hub[1], 0.04],
          pick: [0.42, 0.42, 0.34],
          sound: (ev, vol) => ({ voice: "clack", f: 420, decay: 0.08, vol: vol * 0.6 }),
          also: (a, parts) => {
            const S = FAN.yawAt;
            const Hc = FAN.hub;
            const q = quatMul(quatAxisAngle([0, 1, 0], FAN_HAND.yaw), quatAxisAngle([1, 0, 0], a));
            parts.head = { quat: q, offset: [0, 0, 0] };
            const moved = add(S, quatRotate(q, sub(Hc, S)));
            parts.blades = { quat: quatMul(q, quatAxisAngle([0, 0, 1], -FAN_HAND.spin)), offset: sub(moved, Hc) }; // prettier-ignore
          },
        },
      ],
    },
    drive(t, c, out) {
      const m = mem(c);
      const spin = integrate(m, "spin", t, 24 * c.power * c.power);
      const yaw = 0.55 * Math.sin(integrate(m, "osc", t, 0.55 * c.swing * c.power));
      FAN_HAND.yaw = yaw;
      FAN_HAND.spin = spin;
      const qy = quatAxisAngle([0, 1, 0], yaw);
      const qs = quatAxisAngle([0, 0, 1], -spin);
      out.parts.head = { quat: qy };
      const S = FAN.yawAt;
      const Hc = FAN.hub;
      const moved = add(S, quatRotate(qy, sub(Hc, S)));
      out.parts.blades = { quat: quatMul(qy, qs), offset: sub(moved, Hc) };
    },
    build(k, o) {
      const body = o.color;
      const paint = (c) => lit(body, c.n, { amb: 0.66, dif: 0.42, spec: 0.45, pow: 26 });
      const S = FAN.yawAt;
      const Hc = FAN.hub;
      // Base and stand.
      k.add(
        k.lathe(
          [
            [0.4, 0],
            [0.4, 0.05],
            [0.36, 0.09],
            [0.12, 0.11],
            [0.06, 0.13],
            [0, 0.13],
          ],
          { grid: 64 },
        ),
        { even: true, opacity: 1, jitter: 0.015, flat: 0.15, color: paint },
      );
      for (const [x, col] of [
        [-0.12, "#f4f1ea"],
        [0, "#f4f1ea"],
        [0.12, "#e05a47"],
      ])
        k.add(k.cylinder(0.03, 0.03), {
          even: true,
          opacity: 1,
          jitter: 0.015,
          pos: [x, 0.09, 0.3],
          rot: [-15, 0, 0],
          weight: 2,
          color: (c) => lit(col, c.n),
        });
      k.add(k.cylinder(0.035, S[1] - 0.1), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, (S[1] + 0.1) / 2, S[2]],
        color: (c) => chrome(c.n),
      });
      // The head: motor and cage turn together.
      const head = k.part("head", { pivot: S, axis: [0, 1, 0] });
      k.add(k.ellipsoid(0.16, 0.16, 0.2), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, Hc[1], Hc[2] - 0.22],
        part: head,
        flat: 0.15,
        color: paint,
      });
      k.add(k.sphere(0.06), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, S[1], S[2]],
        part: head,
        color: paint,
      });
      const cz = Hc[2];
      const Rg = 0.5;
      // Thin wire: softly lit steel rather than mirror chrome, so a wire a
      // few pixels wide reads as smooth metal, not black and white speckle.
      const wire = {
        part: head,
        flat: 0.35,
        weight: 1.2,
        jitter: 0.01,
        color: (c) => lit("#8a8f97", c.n, { amb: 0.72, dif: 0.35, spec: 0.3, pow: 10 }),
      };
      k.add(evenTorus(k, Rg, 0.016), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, Hc[1], cz + 0.02],
        rot: [90, 0, 0],
        ...wire,
        weight: 2,
      });
      for (const r of [0.14, 0.26, 0.38])
        k.add(evenTorus(k, r, 0.006), {
          even: true,
          opacity: 1,
          jitter: 0.015,
          pos: [0, Hc[1], cz + 0.09],
          rot: [90, 0, 0],
          ...wire,
        });
      k.add(evenTorus(k, Rg * 0.9, 0.008), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, Hc[1], cz - 0.1],
        rot: [90, 0, 0],
        ...wire,
      });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        const dx = Math.sin(a);
        const dy = Math.cos(a);
        k.add(
          k.tube(
            (tt) => {
              const r = 0.06 + tt * (Rg - 0.06);
              return [dx * r, Hc[1] + dy * r, cz + 0.1 - 0.08 * tt * tt];
            },
            0.005,
            { samples: 16, grid: 12 },
          ),
          wire,
        );
        k.add(
          k.tube(
            (tt) => {
              const r = Rg * (1 - 0.1 * tt);
              return [dx * r, Hc[1] + dy * r, cz + 0.02 - 0.12 * tt];
            },
            0.005,
            { samples: 8, grid: 8 },
          ),
          wire,
        );
      }
      k.add(k.cylinder(0.06, 0.02), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, Hc[1], cz + 0.1],
        rot: [90, 0, 0],
        part: head,
        weight: 2,
        color: (c) => chrome(c.n),
      });
      // Blades (their own part: spin plus the head's swing).
      const blades = k.part("blades", { pivot: Hc, axis: [0, 0, 1] });
      for (let b = 0; b < 4; b++) {
        const th = (b / 4) * TAU + 0.3;
        k.add(
          k.param(
            (u, v) => {
              const r = 0.07 + v * 0.36;
              const wa = 0.55 * Math.sin(Math.PI * Math.min(1, v * 1.15 + 0.1)) + 0.12;
              const a = th + (u - 0.5) * wa;
              return [Math.sin(a) * r, Hc[1] + Math.cos(a) * r, cz + (u - 0.5) * 0.09];
            },
            { grid: 24 },
          ),
          {
            even: true,
            jitter: 0.015,
            part: blades,
            flat: 0.12,
            opacity: 0.9,
            color: (c) => {
              const n = c.n[2] < 0 ? mul(c.n, -1) : c.n;
              return lit(mix(body, "#ffffff", 0.45), n, { amb: 0.7, dif: 0.35, spec: 0.4 });
            },
          },
        );
      }
      k.add(k.cylinder(0.07, 0.07), {
        even: true,
        opacity: 1,
        jitter: 0.015,
        pos: [0, Hc[1], cz - 0.02],
        rot: [90, 0, 0],
        part: blades,
        weight: 2,
        color: paint,
      });
    },
  },

  lamp: {
    alive: true,
    density: 1,
    options: [{ key: "color", label: "Color", type: "color", default: "#3c7fc4" }],
    controls: [{ key: "light", label: "Light", type: "toggle", default: 1, ease: 0.35 }],
    action: { key: "light", label: "Switch the light" },
    // Hands-on (lane Hands-on H3): bend the arm at its joints to point the
    // light: the lower arm on the base, the upper arm at the elbow and the
    // shade at the top. The springs hold each where it is left, and the pool
    // of light moves over the desk where the shade points.
    hands: {
      joints: [
        { type: "hinge", part: "lower", name: "lower", pivot: LAMP.base, axis: [0, 0, 1], min: -0.45, max: 0.4, gravity: false, damping: 12, bounce: 0.05, pos: mul(add(LAMP.base, LAMP.elbow), 0.5), pick: [0.16, 0.42, 0.16] }, // prettier-ignore
        { type: "hinge", part: "upper", name: "upper", parent: "lower", pivot: LAMP.elbow, axis: [0, 0, 1], min: -0.7, max: 0.6, gravity: false, damping: 12, bounce: 0.05, pos: mul(add(LAMP.elbow, LAMP.joint), 0.5), pick: [0.3, 0.2, 0.2] }, // prettier-ignore
        {
          type: "hinge",
          part: "head",
          name: "head",
          parent: "upper",
          pivot: LAMP.joint,
          axis: [0, 0, 1],
          min: -0.8,
          max: 0.9,
          gravity: false,
          damping: 12,
          bounce: 0.05,
          pos: add(LAMP.head, mul(LAMP.dir, 0.08)),
          pick: [0.3, 0.26, 0.3],
          also: (a, parts) => {
            const h = parts.head;
            if (!h) return;
            const on = LAMP_HAND.light;
            parts.glow = { ...h, visible: on };
            parts.beam = { ...h, visible: on };
            // The pool: where the light now meets the desk.
            const at = (p) => add(add(LAMP.joint, quatRotate(h.quat, sub(p, LAMP.joint))), h.offset); // prettier-ignore
            const bulb = at(LAMP.bulbAt);
            const d = quatRotate(h.quat, LAMP.dir);
            const down = smoothstep(0.3, 0.6, -d[1]);
            const pool = down > 0 ? add(bulb, mul(d, -bulb[1] / d[1])) : LAMP.pool;
            parts.pool = { offset: sub(pool, LAMP.pool), visible: on * down };
          },
        },
      ],
    },
    drive(t, c, out) {
      LAMP_HAND.light = c.light;
      out.parts.glow = { visible: c.light };
      out.parts.beam = { visible: c.light };
      out.parts.pool = { visible: c.light };
    },
    build(k, o) {
      const paint = (c) => lit(o.color, c.n, { amb: 0.64, dif: 0.45, spec: 0.5, pow: 26 });
      const { base, elbow, joint } = LAMP;
      // The arms and the shade turn at the joints by hand (lane Hands-on H3).
      const lower = k.part("lower", { pivot: base, axis: [0, 0, 1] });
      const upper = k.part("upper", { pivot: elbow, axis: [0, 0, 1] });
      const headPart = k.part("head", { pivot: joint, axis: [0, 0, 1] });
      k.add(
        k.lathe(
          [
            [0.36, 0],
            [0.36, 0.05],
            [0.32, 0.09],
            [0.08, 0.11],
            [0, 0.11],
          ],
          { grid: 64 },
        ),
        {
          pos: [0, 0, -0.1],
          flat: 0.15,
          even: true,
          opacity: 1,
          jitter: 0.012,
          color: paint,
        },
      );
      k.add(k.cylinder(0.03, 0.03), {
        pos: [0.22, 0.1, 0.1],
        weight: 2,
        color: (c) => chrome(c.n),
      });
      const rod = (a, b, r, part) =>
        k.add(
          k.tube((tt) => add(a, mul(sub(b, a), tt)), r, { samples: 16, grid: 24 }),
          {
            flat: 0.2,
            weight: 1.3,
            opacity: 1,
            jitter: 0.012,
            part,
            color: paint,
          },
        );
      for (const dz of [-0.035, 0.035]) {
        rod(add(base, [0, 0, dz]), add(elbow, [0, 0, dz]), 0.018, lower);
        rod(add(elbow, [0, 0, dz]), add(joint, [0, 0, dz]), 0.018, upper);
      }
      for (const [p, part] of [
        [base, undefined],
        [elbow, upper],
        [joint, headPart],
      ])
        k.add(k.cylinder(0.045, 0.11), {
          pos: p,
          rot: [90, 0, 0],
          weight: 2,
          part,
          color: (c) => chrome(c.n),
        });
      // Springs beside the arms.
      const spring = (a, b, part) =>
        k.add(
          k.tube(
            (tt) => {
              const d = unit(sub(b, a));
              const side = unit(cross(d, [0, 0, 1]));
              const q = add(add(a, mul(sub(b, a), 0.2 + 0.5 * tt)), mul(side, 0.06));
              return add(
                q,
                add(mul(side, 0.015 * Math.cos(tt * 70)), [0, 0, 0.015 * Math.sin(tt * 70)]),
              );
            },
            0.004,
            { samples: 400, grid: 16 },
          ),
          { weight: 1.5, flat: 0.4, part, color: (c) => chrome(c.n) },
        );
      spring(base, elbow, lower);
      spring(elbow, joint, upper);
      // The shade points down at the desk in front.
      const { dir, head } = LAMP;
      const q = quatFromTo([0, -1, 0], dir);
      k.add(
        k.lathe(
          [
            [0.05, 0.16],
            [0.08, 0.1],
            [0.16, 0.0],
            [0.26, -0.12],
            [0.3, -0.2],
          ],
          { grid: 64 },
        ),
        {
          pos: head,
          quat: q,
          flat: 0.15,
          even: true,
          opacity: 1,
          jitter: 0.012,
          part: headPart,
          color: (c) =>
            dot(c.n, dir) > 0.2 ? lit("#f4efe2", mul(c.n, -1), { amb: 0.9, dif: 0.2 }) : paint(c),
        },
      );
      const bulbAt = add(head, mul(dir, 0.07));
      k.add(k.sphere(0.085), { pos: bulbAt, weight: 2, even: true, part: headPart, color: "#e9e4d8" }); // prettier-ignore
      // (The glow and the beam turn with the head, about its joint.)
      const glow = k.part("glow", { pivot: joint });
      k.add(k.sphere(0.095), {
        pos: bulbAt,
        part: glow,
        weight: 2,
        pattern: false,
        even: true,
        jitter: 0.01,
        color: (c) => keep(mix("#fff7d6", "#ffffff", 0.6)),
      });
      // A faint cone of light and a warm pool on the desk.
      const beam = k.part("beam", { pivot: joint });
      const poolPart = k.part("pool", { pivot: LAMP.pool });
      const floorT = (0 - bulbAt[1]) / dir[1];
      const pool = add(bulbAt, mul(dir, floorT));
      // Both are spread evenly (not at random), so the light reads as a
      // smooth glow rather than blotches.
      const ref = unit(cross(dir, [0, 0, 1]));
      const ref2 = cross(dir, ref);
      k.cloud({ share: 0.08, size: 2, part: beam, pattern: false }, (rand, i, n) => {
        // Jittered within its cell, so the even points show no lattice.
        const cell = 1 / Math.cbrt(n);
        const [e0, e1, e2] = evenPoint(i, 3).map((e) => {
          const v = e + (rand() - 0.5) * cell * 0.4;
          return v - Math.floor(v);
        });
        const s = Math.sqrt(e0);
        const rr = (0.08 + s * 0.5) * Math.sqrt(e1);
        const a = e2 * TAU;
        const p = add(
          add(bulbAt, mul(dir, s * floorT * 0.9)),
          add(mul(ref, Math.cos(a) * rr), mul(ref2, Math.sin(a) * rr)),
        );
        return { p, dir, stretch: 6, color: "#ffe9a8", opacity: 0.025 + 0.035 * (1 - s) };
      });
      k.cloud({ share: 0.06, size: 3, part: poolPart, pattern: false }, (rand, i, n) => {
        // A sunflower spiral: the evenest way to fill a disc.
        const a = i * 2.39996323;
        const r = Math.sqrt((i + 0.5) / n) * 0.62;
        return {
          p: [pool[0] + Math.sin(a) * r, 0.003, pool[2] + Math.cos(a) * r],
          n: [0, 1, 0],
          color: "#ffe39a",
          opacity: 0.4 * (1 - (r / 0.62) ** 2),
        };
      });
    },
  },

  "potion-bottle": {
    // Lane Any pose: turned over in Hands-on, its rising splats keep to the
    // toy's own frame (the puff leaves the neck), not the world's up.
    gravity: false,
    alive: true,
    options: [{ key: "color", label: "Potion", type: "color", default: "#b44cff" }],
    controls: [{ key: "pop", label: "Pop the cork", type: "pulse", ease: 1.8 }],
    action: { key: "pop", label: "Pop the cork" },
    // Hands-on (lane Hands-on H3): pull the cork and it holds, wiggles, then
    // pops out with a puff of sparkles; set it back on the neck (or point at
    // the neck) and it squeaks back in, held fast again.
    hands: {
      floor: -0.5,
      pieces: () => [
        { part: "cork", pos: [0, 0.88, 0], pivot: [0, 0.86, 0], solid: POTION_CORK, points: surfacePoints(POTION_CORK, 1), pick: [0.16, 0.16, 0.16], mass: 0.1, friction: 0.8, restitution: 0.35 }, // prettier-ignore
        // The flask: ground for the cork, never picked up.
        { pos: [0, 0, 0], solid: POTION_FLASK, pick: [1e-3, 1e-3, 1e-3] },
      ],
      joints: [
        {
          type: "break",
          part: "cork",
          at: [0, 0.8, 0],
          pull: 0.16,
          give: 0.04,
          reseat: { snap: 0.25 },
          sound: (ev) =>
            ev.kind === "snap"
              ? { voice: "pop", f: 520, vol: 0.8 }
              : ev.kind === "socket"
                ? { voice: "twist", f: 300, decay: 0.15, vol: 0.5 }
                : undefined,
          also: (v, parts) => {
            const o = parts.cork?.offset;
            POTION_HAND.off = o ? len(o) : 0;
          },
        },
      ],
      sound: (hit, vol) => ({ voice: "wood", f: 700, decay: 0.08, vol: vol * 0.5 }),
    },
    drive(t, c, out) {
      // By hand: the puff when the cork leaves the neck (lane Hands-on H3).
      const H = POTION_HAND;
      const away = H.off > 0.06;
      if (away && !H.out) H.t0 = t;
      H.out = away;
      const hp = clamp((t - H.t0) / 1.2, 0, 1);
      const p = 1 - c.pop;
      const on = c.pop > 0;
      const fly = on ? bump(clamp(p / 0.75, 0, 1)) : 0;
      out.parts.cork = { offset: [0.12 * fly, 0.55 * fly, 0], angle: on ? 2.4 * fly : 0 };
      const puff = Math.max(on ? 1 - smoothstep(0.3, 0.8, p) : 0, hp < 1 ? 1 - smoothstep(0.25, 0.7, hp) : 0); // prettier-ignore
      out.parts.puff = { visible: puff };
      out.amount = 1 + 1.5 * Math.max(c.pop, hp < 1 ? 1 - hp : 0);
    },
    build(k, o) {
      const potion = o.color;
      const glassTint = "#a9cbd6";
      const R = 0.5;
      const level = 0.08;
      const glass = (c) => {
        const rim = 1 - Math.abs(dot(c.n, VIEW));
        let col = mix(glassTint, "#ffffff", 0.6 * rim * rim);
        col = mix(col, [1, 1, 1], 0.9 * Math.pow(Math.max(0, dot(c.n, HALF)), 40));
        return col;
      };
      // The flask: a round body and a neck.
      k.add(
        k.lathe(
          [
            [0, -R],
            [0.28, -0.44],
            [0.46, -0.2],
            [0.5, 0.02],
            [0.42, 0.28],
            [0.2, 0.44],
            [0.13, 0.52],
            [0.12, 0.8],
            [0.15, 0.84],
          ],
          { grid: 96 },
        ),
        { flat: 0.15, opacity: 0.1, weight: 0.6, pattern: false, color: glass },
      );
      k.add(k.torus(0.14, 0.025), {
        pos: [0, 0.84, 0],
        flat: 0.2,
        weight: 1.5,
        opacity: 0.6,
        pattern: false,
        color: glass,
      });
      // The glowing potion inside.
      const liquid = [];
      for (let i = 0; i <= 12; i++) {
        const y = -0.47 + (i / 12) * (level + 0.47);
        const r =
          y < 0.02
            ? Math.sqrt(Math.max(0, 0.47 ** 2 - (y + 0.0) ** 2)) * (y < -0.2 ? 0.98 : 1)
            : 0.47;
        liquid.push([Math.min(r, 0.46), y]);
      }
      liquid.push([0, level]);
      k.add(k.lathe(liquid, { grid: 80 }), {
        flat: 0.25,
        kind: "twinkle",
        params: [0.05, 0],
        pattern: false,
        color: (c) => {
          const top = c.p[1] > level - 0.02;
          const glow = Math.pow(Math.max(0, dot(c.n, VIEW)), 1.5);
          const depth = clamp((level - c.p[1]) / 0.55, 0, 1);
          const col = mix(
            shade(potion, 0.72 + 0.2 * (1 - depth)),
            mix(potion, "#ffffff", 0.3),
            glow,
          );
          return keep(top ? mix(potion, "#ffffff", 0.4) : col);
        },
      });
      // Bubbles rising through it.
      k.cloud({ share: 0.006, size: 1.3, pattern: false }, (rand) => {
        const a = rand() * TAU;
        const r = 0.28 * Math.sqrt(rand());
        return {
          p: [Math.sin(a) * r, -0.42 + rand() * 0.2, Math.cos(a) * r],
          color: mix(potion, "#ffffff", 0.75),
          opacity: 0.9,
          kind: "rise",
          params: [0.16, rand()],
        };
      });
      // A cork that pops out, and a puff of sparkles.
      const cork = k.part("cork", { pivot: [0, 0.86, 0], axis: [0, 0, 1] });
      k.add(k.cone(0.105, 0.13, 0.2), {
        pos: [0, 0.88, 0],
        part: cork,
        flat: 0.2,
        weight: 1.5,
        color: (c) =>
          lit(
            mix("#c49a6c", "#8d6340", 0.5 + 0.4 * c.noise(c.p[0] * 40, c.p[1] * 40, c.p[2] * 40)),
            c.n,
          ),
      });
      const puff = k.part("puff", { pivot: [0, 0.95, 0] });
      k.cloud({ share: 0.03, size: 1.3, part: puff, pattern: false }, (rand) => ({
        p: [(rand() - 0.5) * 0.2, 0.95 + rand() * 0.1, (rand() - 0.5) * 0.2],
        color: mix(potion, "#ffffff", 0.3 + 0.7 * rand()),
        opacity: 0.9,
        kind: "rise",
        params: [0.6 + 0.5 * rand(), rand()],
      }));
      k.reach([0, 1.45, 0]);
    },
  },

  telescope: {
    alive: true,
    density: 0.6,
    controls: [{ key: "open", label: "Extend", type: "toggle", default: 1, ease: 1.2 }],
    action: { key: "open", label: "Extend or collapse" },
    // Hands-on (lane Hands-on H3): pull the draw tubes out and push them back
    // in by hand. The middle tube slides in the main tube and carries the
    // eyepiece tube, which slides in it; both hold where they are left and
    // knock at each end.
    hands: {
      joints: [
        {
          type: "slider",
          part: "tube2",
          pivot: TELE.mount,
          axis: TELE.dir,
          min: 0,
          max: 0.3,
          gravity: false,
          friction: 2,
          damping: 7,
          bounce: 0.1,
          start: (c) => 0.3 * (1 - ease3(c.open)),
          pos: add(TELE.mount, mul(TELE.dir, -0.49)),
          pick: [0.15, 0.15, 0.15],
          sound: (ev, vol) => ({ voice: "metal", f: ev.v > 0.15 ? 520 : 760, decay: 0.12, vol: vol * 0.5 }), // prettier-ignore
        },
        {
          type: "slider",
          part: "tube3",
          parent: "tube2",
          pivot: TELE.mount,
          axis: TELE.dir,
          min: 0,
          max: 0.3,
          gravity: false,
          friction: 2,
          damping: 7,
          bounce: 0.1,
          start: (c) => 0.3 * (1 - ease3(c.open)),
          pos: add(TELE.mount, mul(TELE.dir, -0.82)),
          pick: [0.14, 0.14, 0.14],
          sound: (ev, vol) => ({ voice: "metal", f: ev.v > 0.15 ? 640 : 900, decay: 0.1, vol: vol * 0.45 }), // prettier-ignore
        },
      ],
    },
    drive(t, c, out) {
      const e = ease3(c.open);
      const d = TELE.dir;
      out.parts.tube2 = { offset: mul(d, 0.3 * (1 - e)) };
      out.parts.tube3 = { offset: mul(d, 0.6 * (1 - e)) };
      out.body = { quat: quatAxisAngle([0, 1, 0], 0.1 * Math.sin(t * 0.4)) };
    },
    build(k) {
      const brass = "#d4a64a";
      const wood = "#6d4428";
      const { dir, mount } = TELE;
      const q = quatFromTo([0, 1, 0], dir);
      const seg = (from, to, r, part, col) =>
        k.add(k.cylinder(r, to - from, { caps: true }), {
          pos: add(mount, mul(dir, (from + to) / 2)),
          quat: q,
          part,
          flat: 0.15,
          color: (c) =>
            col ? lit(col, c.n, { amb: 0.6, dif: 0.5, spec: 0.4 }) : chrome(c.n, brass),
        });
      // The main tube, with the big lens at the far end.
      seg(-0.36, 0.56, 0.12, 0, "#2d3b55");
      seg(0.5, 0.64, 0.14, 0);
      seg(-0.4, -0.33, 0.13, 0);
      seg(0.02, 0.08, 0.125, 0);
      k.add(k.disc(0.12), {
        pos: add(mount, mul(dir, 0.645)),
        quat: q,
        weight: 2,
        pattern: false,
        color: (c) => keep(mix("#15305c", "#9ad1ff", 0.35 + 0.5 * Math.max(0, dot(c.n, HALF)))),
      });
      // Draw tubes that slide out toward the eye.
      const t2 = k.part("tube2", { pivot: mount });
      const t3 = k.part("tube3", { pivot: mount });
      seg(-0.68, -0.3, 0.095, t2);
      seg(-0.7, -0.65, 0.103, t2);
      seg(-0.98, -0.6, 0.068, t3);
      seg(-1.02, -0.95, 0.08, t3, "#2a2a2e");
      // Tripod.
      const top = add(mount, [0, -0.1, 0]);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + 0.6;
        const foot = [Math.sin(a) * 0.6, -1.0, Math.cos(a) * 0.6];
        k.add(
          k.tube((tt) => add(top, mul(sub(foot, top), tt)), 0.026, { samples: 8, grid: 24 }),
          {
            flat: 0.2,
            weight: 1.3,
            color: (c) => lit(wood, c.n, { spec: 0.3 }),
          },
        );
      }
      k.add(k.sphere(0.075), { pos: top, weight: 2, color: (c) => chrome(c.n, brass) });
      k.add(k.cylinder(0.03, 0.12), {
        pos: add(top, [0, 0.07, 0]),
        weight: 2,
        color: (c) => chrome(c.n, brass),
      });
    },
  },
};
`,T=(e,t=document)=>t.querySelector(e),E=(e,t=document)=>[...t.querySelectorAll(e)],D=matchMedia(`(prefers-reduced-motion: reduce)`),Ze=matchMedia(`(pointer: coarse)`).matches,O=matchMedia(`(max-width: 860px)`),Qe=(navigator.deviceMemory||8)<=2||(navigator.hardwareConcurrency||8)<=2,$e=Qe?6e4:Ze?14e4:2e5,et=e=>new URL(e,document.baseURI).href,tt=`https://ryanjosephkamp.github.io/splashery/`,nt=`#s=j.eyJhcHAiOiJzcGxhc2hlcnkiLCJ2ZXJzaW9uIjozLCJ0b3kiOnsia2luZCI6ImJ1aWx0aW4iLCJpZCI6ImdyYXBlIn19`,k=T(`#stage`),A;try{A=new he(k)}catch(e){throw T(`[data-hud=load]`).textContent=`This page needs WebGL2 to draw its splats.`,e}window.stage=A;var j=Object.fromEntries(E(`[data-hud]`).map(e=>[e.dataset.hud,e])),M=(e,t)=>{j[e]&&j[e].textContent!==t&&(j[e].textContent=t)},N=new Map,rt={grape:`grape.sog`,chest:`chest · objects.js`,eq:`splat program`,walnut:`walnut.vol.gz`},P=null,it=null,F=!1,I=null,L=new Map;function at(e){return N.has(e)?Promise.resolve(N.get(e)):(L.has(e)||L.set(e,ot(e).finally(()=>L.delete(e))),L.get(e))}async function ot(e){let t;if(e===`grape`)M(`load`,`Fetching grape-lite.sog, 1.3 MB`),t=await A.data.call(`sog`,{key:e,url:et(`./assets/grape-lite.sog`),upright:!0}),rt.grape=`grape-lite.sog`,Qe||ct().catch(e=>console.warn(e));else if(e===`chest`)t=await A.data.call(`chest`,{key:e,count:K.budget,wood:K.wood}),t.made={budget:K.budget,wood:K.wood},K.result=t;else if(e===`walnut`)t=await A.data.call(`walnut`,{key:e,url:et(`./assets/walnut.vol.gz`),budget:Ze?16e4:32e4});else if(e===`eq`){let n=Y.live.frame(0);await A.data.call(`raw`,{key:e,set:lt(n)}),t={gpu:Y.live.gpu.slice(),pos:n.pos.slice(),parts:n.part.slice(),count:n.count}}return N.set(e,t),t}var st=!1;async function ct(){if(st)return;st=!0;let e;try{e=await A.data.call(`sog`,{key:`grape-full`,url:et(`./assets/grape.sog`),upright:!0})}catch(e){console.warn(`The full grape did not load; keeping the lite one.`,e);return}let t=()=>!F&&(P!==`grape`||!B.frozen&&!B.auto&&!U.result&&R!==`dial`&&A.drawCount==null);for(;!t();)await new Promise(e=>setTimeout(e,250));await A.data.call(`rename`,{from:`grape-full`,to:`grape`}),N.set(`grape`,e),rt.grape=`grape.sog`,G.ready=!1,G.building=null,P===`grape`&&await A.setCloud(e)}function lt(e){return{count:e.count,pos:e.pos.slice(),scale:e.scale.slice(),rot:e.rot.slice(),color:e.color.slice(),part:e.part.slice()}}var ut=null;function dt(e){return it=e,ut||=ft().finally(()=>{ut=null}),ut}async function ft(){F=!0;try{for(;it!==P;){let e=it,t=P;if(await at(e),it===e){if(t&&pt(t),!t)await A.setCloud(N.get(e));else{t===`eq`&&await A.data.call(`raw`,{key:`eq`,set:lt(Y.live.set)});let n=await A.data.call(`pair`,{from:t,to:e});an=`flying`,await A.fly(n,{duration:2.4,spread:.6,arc:.45}),await A.setCloud(N.get(e))}P=e,an=null,k.classList.add(`is-live`),$.hidden=!0,k.classList.remove(`is-stopped`),mt(e)}}}finally{F=!1,an=null}}function pt(e){e===`chest`&&(A.clearParts(),A.partTint=!1),e===`eq`&&(I=null),e===`walnut`&&(A.cut=[0,0,0,0])}function mt(e){e===`chest`&&(qt(q.angle),Ut(),Gt()),e===`eq`&&(I=Y.live),e===`walnut`&&tn()}var ht={hero:{yaw:-.5,pitch:.2,zoom:1.22,target:[0,0,0]},frame:{yaw:.9,pitch:.25,zoom:1.22,target:[0,0,0]},splat:{yaw:.2,pitch:.12,zoom:1.3,target:[0,0,0]},dial:{yaw:-.8,pitch:.3,zoom:1.25,target:[0,0,0]},recipe:{yaw:Math.PI-.55,pitch:.45,zoom:1.5,target:[0,0,0]},parts:{yaw:Math.PI-.4,pitch:.38,zoom:1.55,target:[0,0,0]},equation:{yaw:.4,pitch:.55,zoom:1.3,target:[0,0,0]},walnut:{yaw:0,pitch:.12,zoom:1.32,target:[0,0,0]},link:{yaw:-.4,pitch:.2,zoom:1.28,target:[0,0,0]},claims:{yaw:.3,pitch:.18,zoom:1.35,target:[0,0,0]}},gt={hero:`grape`,frame:`grape`,splat:`grape`,dial:`grape`,recipe:`chest`,parts:`chest`,equation:`eq`,walnut:`walnut`,link:`grape`,claims:`grape`},R=null,z={};function _t(e){if(e===R)return;let t=R;R=e,k.dataset.step=e,A.wake(),pn();for(let t of E(`[data-for]`))t.classList.toggle(`is-on`,t.dataset.for.split(` `).includes(e));t&&z[t]?.leave&&z[t].leave(e);let n=ht[e];n&&A.view({...n,zoom:n.zoom*(O.matches?1.14:1),yaw:A.cam.yaw+vt(A.cam.yaw,n.yaw)},1.6),dt(gt[e]).catch(e=>gn(e,()=>dt(gt[R]))),z[e]?.enter?.(t)}var vt=(e,t)=>Math.atan2(Math.sin(t-e),Math.cos(t-e));function yt(){let e=E(`.step`),t=()=>{let t=O.matches?innerHeight*.72:innerHeight*.5,n=e[0];for(let r of e)r.getBoundingClientRect().top<t&&(n=r);n&&_t(n.dataset.step)};addEventListener(`scroll`,t,{passive:!0}),addEventListener(`resize`,t),t()}var B={u:0,target:0,active:!1,used:!1,frozen:!1,teased:!1,auto:null};z.hero={enter(){A.gesture=`pull`},leave(){A.gesture=`orbit`,B.target=0}},A.onPull=(e,t)=>{P!==`grape`||F||(e===`start`?(B.active=!0,B.auto=null):e===`move`?(B.frozen||bt(),B.target=i(t,-1,1),B.used||(B.used=!0,T(`.hud-hint`).classList.add(`is-used`))):(B.active=!1,B.target=0))};function bt(){A.freeze(),B.frozen=!0,B.base={yaw:A.cam.yaw,pitch:A.cam.pitch,zoom:A.cam.zoom},A.camTween=null,k.classList.add(`is-frozen`)}function xt(e){if(B.auto){let t=B.auto;t.t+=e;let n=t.t/t.dur;B.target=n<.35?t.to*o(n/.35):n<.7?t.to:t.to*(1-o((n-.7)/.3)),!B.frozen&&Math.abs(B.target)>.001&&bt(),n>=1&&(B.auto=null,B.target=0)}if(!B.frozen)return;let t=B.active?14:5;B.u=a(B.u,B.target,1-Math.exp(-e*t));let n=Math.abs(B.u),r=A.explode;r.amount=s(Math.min(1,n*1.15));let i=B.base;A.cam.yaw=i.yaw+B.u*1.05,A.cam.pitch=i.pitch+n*.18,A.cam.zoom=i.zoom*(1+.75*n),!B.active&&!B.auto&&n<.002&&(A.cam.yaw=i.yaw,A.cam.pitch=i.pitch,A.cam.zoom=i.zoom,B.u=0,B.frozen=!1,A.thaw(),k.classList.remove(`is-frozen`))}T(`[data-act=explode]`).addEventListener(`click`,()=>{B.used=!0,T(`.hud-hint`).classList.add(`is-used`),St(.9,4.2)});function St(e=.85,t=3.2){P===`grape`&&(B.auto={t:0,dur:D.matches?.01:t,to:e})}var Ct={0:``,1:[`near`,`far`],2:[`drawn first`,`drawn last`],3:[`α = 0`,`α = 1`],4:[`1 splat`,`on a pixel`]},V={t:0,on:!1,done:!1};z.frame={enter(){A.gesture=`orbit`;let e=Number(T(`#blend`).value);e<1e3&&(A.drawCount=Math.round(e/1e3*A.count)),!V.done&&!D.matches&&setTimeout(()=>{R===`frame`&&!V.done&&P===`grape`&&Object.assign(V,{t:0,on:!0,done:!0})},700)},leave(){A.drawCount=null,A.pass=0,A.spinOn=!0,H(E(`[data-pass]`),`0`,`pass`),T(`#blend`).value=1e3,M(`legend`,``),T(`#blend-out`).textContent=`all`}};function wt(e){T(`#blend`).value=String(e);let t=Math.round(e/1e3*A.count);A.drawCount=e>=1e3?null:t,A.spinOn=e>=1e3,T(`#blend-out`).textContent=e>=1e3?`all`:b(t)}function Tt(e){if(!V.on)return;if(R!==`frame`)return void(V.on=!1);V.t+=e/3.4;let t=Math.min(1,V.t);wt(Math.round(1e3*(t<.08?0:o((t-.08)/.92)))),t>=1&&(V.on=!1)}T(`#blend`).addEventListener(`input`,e=>{V.on=!1;let t=Number(e.target.value),n=Math.round(t/1e3*A.count);A.drawCount=t>=1e3?null:n,A.spinOn=t>=1e3,T(`#blend-out`).textContent=t>=1e3?`all`:b(n)});for(let e of E(`[data-pass]`))e.addEventListener(`click`,()=>{let t=Number(e.dataset.pass);A.pass=t,H(E(`[data-pass]`),e.dataset.pass,`pass`),Et(t),t===4&&Dt()});function Et(e){let t=j.legend;t.textContent=``;let n=Ct[e];if(!n)return;let r=document.createElement(`span`);r.className=`ramp`;let i=[];for(let t=0;t<=8;t++){let n=e===3?[t/8,t/8,t/8]:te(e===4?.08+.92*t/8:t/8);i.push(`rgb(${n.map(e=>Math.round(e*255)).join(` `)})`)}r.style.background=`linear-gradient(90deg, ${i.join(`, `)})`;let a=document.createElement(`span`);a.textContent=n[0];let o=document.createElement(`span`);o.textContent=n[1],o.dataset.hud=`legend-end`,t.append(a,r,o)}function Dt(){requestAnimationFrame(()=>requestAnimationFrame(()=>{let e=A.gl.overdrawStats();if(!e)return;A.overdrawMax=Math.max(8,e.max);let t=T(`[data-hud=legend-end]`);t&&(t.textContent=`${b(e.max)}${e.saturated?`+`:``} splats on one pixel · ${b(e.mean)} on average`)}))}function H(e,t,n){for(let r of e)r.setAttribute(`aria-checked`,String(r.dataset[n]===t))}var U={result:null,lift:0,liftTarget:0,busy:!1};z.splat={enter(){A.gesture=`orbit`,A.shiftTarget=O.matches?[-.3,.06]:[-.22,.04],A.onTap=(e,t)=>Ot(e,t),setTimeout(()=>{R===`splat`&&!U.result&&P===`grape`&&kt()},900)},leave(){A.onTap=null,A.shiftTarget=[0,.04],At()}};async function Ot(e,t){if(!(P!==`grape`||U.busy)){U.busy=!0;try{let n=await A.pick(`grape`,e,t);if(!n)return;U.result=n,A.selected=n.index,A.dimTarget=0,A.spinOn=!1,U.liftTarget=1,Pt(n)}finally{U.busy=!1}}}async function kt(){if(P!==`grape`||U.busy)return;U.busy=!0;let e=null;try{for(let[t,n]of[[.5,.45],[.46,.52],[.54,.4],[.42,.42],[.56,.55],[.5,.6]]){let r=await A.pick(`grape`,t,n);r&&(!e||r.share*r.opacity>e.share*e.opacity)&&(e=r)}}finally{U.busy=!1}e&&R===`splat`&&(U.result=e,A.selected=e.index,A.dimTarget=0,A.spinOn=!1,U.liftTarget=1,Pt(e))}function At(){U.result=null,U.liftTarget=0,A.selected=-1,A.dimTarget=1,A.spinOn=!0,A.lift=0}T(`[data-act=pick-again]`).addEventListener(`click`,()=>Ot(.3+Math.random()*.4,.3+Math.random()*.4)),T(`[data-act=pick-out]`).addEventListener(`click`,At);var jt=T(`#panel`),Mt=()=>(O.matches?T(`#panel-slot`):k).append(jt);O.addEventListener(`change`,Mt),Mt();var W=Object.fromEntries(E(`[data-pick]`).map(e=>[e.dataset.pick,e])),Nt=(e,t=4)=>Math.abs(e)<1e-12?`0`:e.toFixed(t);function Pt(e){W.title.textContent=`Splat ${b(e.index)}`,W.of.textContent=`of ${b(A.count)}`,W.mu.textContent=e.mu.map(e=>Nt(e,4)).join(`  `),W.sd.textContent=e.sd.map(e=>Nt(e,5)).join(`  `),W.q.textContent=e.rot.map(e=>Nt(e,3)).join(`  `),Ft(W.sigma,[[e.sigma[0],e.sigma[1],e.sigma[2]],[e.sigma[1],e.sigma[3],e.sigma[4]],[e.sigma[2],e.sigma[4],e.sigma[5]]],!0);let t=`#`+e.color.map(e=>e.toString(16).padStart(2,`0`)).join(``);W.swatch.style.background=t,W.rgb.textContent=`${t}  (${e.color.join(`, `)})`,W.alpha.textContent=e.opacity.toFixed(3),W.share.textContent=`${Math.round(e.share*100)}% · ${b(e.layers-1)} others here`}function Ft(e,t,n){let r=0;for(let e of t)for(let t of e)r=Math.max(r,Math.abs(t));let i=n&&r>0?Math.floor(Math.log10(r)):0,a=10**-i;e.textContent=``;for(let r of t)for(let t of r){let r=document.createElement(`span`);r.textContent=(t*a).toFixed(n?3:1),e.append(r)}if(e.dataset.exp=i?`×10${It(i)}`:``,e.nextSibling?.classList?.contains(`exp`)&&e.nextSibling.remove(),i){let t=document.createElement(`span`);t.className=`unit exp`,t.textContent=`×10${It(i)}`,e.after(t)}}var It=e=>String(e).split(``).map(e=>`⁰¹²³⁴⁵⁶⁷⁸⁹`[`0123456789`.indexOf(e)]??(e===`-`?`⁻`:e)).join(``);function Lt(e,t,n){let r=t.m,[i,a,o]=e.world,s=r[0]*i+r[4]*a+r[8]*o+r[12],c=r[1]*i+r[5]*a+r[9]*o+r[13],l=r[2]*i+r[6]*a+r[10]*o+r[14],u=h(e.worldScale,e.rot),d=[u[0],u[1],u[2],u[1],u[3],u[4],u[2],u[4],u[5]],f=[r[0],r[4],r[8],r[1],r[5],r[9],r[2],r[6],r[10]],p=[n/l,0,-n*s/(l*l),0,n/l,-n*c/(l*l)],m=[];for(let e=0;e<2;e++)for(let t=0;t<3;t++)m[e*3+t]=p[e*3]*f[t]+p[e*3+1]*f[3+t]+p[e*3+2]*f[6+t];let g=[];for(let e=0;e<2;e++)for(let t=0;t<3;t++)g[e*3+t]=m[e*3]*d[t]+m[e*3+1]*d[3+t]+m[e*3+2]*d[6+t];return[g[0]*m[0]+g[1]*m[1]+g[2]*m[2]+.3,-(g[0]*m[3]+g[1]*m[4]+g[2]*m[5]),g[3]*m[3]+g[4]*m[4]+g[5]*m[5]+.3]}var G={levels:0,ready:!1,building:null,L:-1,loading:!1,value:19,want:null};z.dial={async enter(){A.gesture=`orbit`,!G.ready&&!G.building&&(M(`built`,``),G.building=(async()=>{await at(`grape`);let e=await A.data.call(`tree`,{key:`grape`});G.levels=e.levels,G.ready=!0,M(`levels`,`2⁰ to 2${It(e.levels)}, then all`);let t=T(`#dial`);t.max=String(e.levels+1),t.value=String(e.levels+1),G.value=e.levels+1})()),!G.played&&!D.matches&&setTimeout(async()=>{R!==`dial`||G.played||(await G.building,R===`dial`&&P===`grape`&&(G.played=!0,G.play={t:0}))},600)},leave(){A.displayCount=null,G.L>=0&&P===`grape`&&(G.L=-1,A.morph.manual=!1,A.setCloud(N.get(`grape`))),T(`#dial`).value=T(`#dial`).max,T(`#dial-out`).textContent=`all`,A.repTarget=[1,0,0,0],H(E(`[data-rep]`),`0`,`rep`)}},T(`#dial`).addEventListener(`input`,e=>{G.play=null,zt(Number(e.target.value))});function Rt(e){let t=G.play;if(!t)return;if(R!==`dial`)return void(G.play=null);if(G.loading)return;t.t+=e;let n=G.levels+1,r=e=>e*e*(3-2*e),a=t.t,o=i((a-2.6)/6.5,0,1),s=a<1.8?n*(1-r(a/1.8)):a<2.6?0:n*r(o);T(`#dial`).value=String(s),zt(s),o>=1&&(G.play=null)}async function zt(e){if(G.want=e,G.ready||await G.building,P!==`grape`||F||G.loading)return;let t=G.levels+1;for(;G.want!==null;){let e=Math.min(G.want,t);G.want=null;let n=Math.floor(e),r=e-n;if(n>=t&&(n=t-1,r=1),n!==G.L){G.loading=!0;let e=await A.data.call(`level`,{key:`grape`,level:n});G.loading=!1,await A.showPair(e,r),G.L=n}else A.morph.t=r;let i=n+1>=t?A.count:2**(n+1),a=r>=.999?i:2**n;A.displayCount=e>=t?null:a,T(`#dial-out`).textContent=e>=t?`all`:b(a)}}for(let e of E(`[data-rep]`))e.addEventListener(`click`,()=>{let t=[0,0,0,0];t[Number(e.dataset.rep)]=1,A.repTarget=t,H(E(`[data-rep]`),e.dataset.rep,`rep`)});var K={wood:`#8a5a2b`,budget:$e,result:null,building:!1},Bt=(()=>{let e=Xe.split(`
`),t=e.findIndex(e=>e.startsWith(`  chest: {`)),n=t+1;for(;n<e.length&&!/^ {2}[a-zA-Z"-]+: \{/.test(e[n]);)n++;return e.slice(t,n).join(`
`).trimEnd()})(),Vt=new TextEncoder().encode(Bt).length;M(`recipe-size`,`${(Vt/1024).toFixed(1)} KB, src/packs/objects.js`),j[`recipe-src`].innerHTML=Ht(Bt);function Ht(e){let t=e=>e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`);return e.split(`
`).map(e=>{let n=e.match(/^(.*?)(\/\/.*)?$/),r=t(n[1]);return r=r.replace(/("[^"]*"|`[^`]*`)/g,`<span class="s">$1</span>`).replace(/\b(const|let|return|for|of|if|else|new|function)\b/g,`<span class="k">$1</span>`).replace(/(?<![\w#">])(-?\d+\.?\d*)(?![\w"])/g,`<span class="n">$1</span>`),r+(n[2]?`<span class="c">${t(n[2])}</span>`:``)}).join(`
`)}for(let e of E(`[data-budget]`))e.setAttribute(`aria-checked`,String(Number(e.dataset.budget)===K.budget));if(!E(`[data-budget]`).some(e=>Number(e.dataset.budget)===K.budget)){let e=document.createElement(`button`);e.type=`button`,e.setAttribute(`role`,`radio`),e.setAttribute(`aria-checked`,`true`),e.dataset.budget=String(K.budget),e.textContent=`${K.budget/1e3}k`;let t=E(`[data-budget]`);t.find(e=>Number(e.dataset.budget)>K.budget)?.before(e)||t[0].parentNode.append(e),e.addEventListener(`click`,()=>Wt({budget:K.budget},e))}z.recipe={enter(){A.gesture=`orbit`,Ut()}};function Ut(){let e=N.get(`chest`);if(!e)return M(`built`,`Building on this device…`);M(`built`,`${b(e.count)} splats · built in ${Math.round(e.ms)} ms on this device · recipe ${(Vt/1024).toFixed(1)} KB`)}async function Wt(e,t){if(Object.assign(K,e),!(K.building||P!==`chest`||F)){K.building=!0,M(`built`,`Building on this device…`);try{let t={budget:K.budget,wood:K.wood},n=await A.data.call(`chest`,{key:`chest-next`,count:t.budget,wood:t.wood});n.made=t;let r=await A.data.call(`pair`,{from:`chest`,to:`chest-next`});await A.data.call(`rename`,{from:`chest-next`,to:`chest`}),N.set(`chest`,n),K.result=n,A.clearParts(),await A.fly(r,{duration:e.wood?1.2:1.8,spread:.85,arc:e.wood?0:.12}),await A.setCloud(n),qt(q.angle),Ut()}finally{K.building=!1}P===`chest`&&Gt()}}function Gt(){let e=N.get(`chest`)?.made;e&&(e.wood!==K.wood||e.budget!==K.budget)&&setTimeout(()=>Wt({}),0)}for(let e of E(`[data-wood]`))e.addEventListener(`click`,()=>{H(E(`[data-wood]`),e.dataset.wood,`wood`),Wt({wood:e.dataset.wood})});for(let e of E(`[data-budget]`))e.addEventListener(`click`,()=>{Number(e.dataset.budget)!==K.budget&&(H(E(`[data-budget]`),e.dataset.budget,`budget`),Wt({budget:Number(e.dataset.budget)}))});var q={open:0,target:0,angle:0};z.parts={enter(){A.gesture=`orbit`,A.onTap=()=>J(),setTimeout(()=>{R===`parts`&&q.target===0&&!q.touched&&J(!0)},1400)},leave(e){A.onTap=null,e!==`recipe`&&(q.target=0,Kt(`lid`,!1)),A.partTint=!1,Kt(`tint`,!1)}};function J(e){e&&P!==`chest`||(e||(q.touched=!0),q.target=+!q.target,Kt(`lid`,!!q.target),T(`[data-act=lid]`).textContent=q.target?`Close the lid`:`Open the lid`)}T(`[data-act=lid]`).addEventListener(`click`,()=>J()),T(`[data-act=tint]`).addEventListener(`click`,()=>{A.partTint=!A.partTint,Kt(`tint`,A.partTint)});function Kt(e,t){T(`[data-act=${e}]`).setAttribute(`aria-pressed`,String(t))}function qt(e){let t=N.get(`chest`);if(!t?.parts||P!==`chest`)return;let n=t.parts.findIndex(e=>e.name===`lid`);n<0||A.setParts(t.parts,{[n]:e})}function Jt(e){let t=e/1.1;q.open<q.target?q.open=Math.min(q.target,q.open+t):q.open>q.target&&(q.open=Math.max(q.target,q.open-t));let n=q.open,r=-1.95*(n<.5?2*n*n:1-(-2*n+2)**2/2);r!==q.angle&&(q.angle=r,P===`chest`&&!F&&!K.building&&qt(r))}var Y={id:`klein`,live:null,t:0},X=T(`#program`),Yt=T(`#program-msg`);function Xt(e,t){try{if(Y.live=new Ye(qe(e)),Yt.textContent=`${b(Y.live.n)} splats, placed again every frame`,Yt.classList.remove(`is-error`),P===`eq`){I=Y.live;let e=I.frame(Y.t);A.setCloud({gpu:I.gpu,pos:e.pos,parts:e.part,count:e.count})}else N.delete(`eq`);return!0}catch(e){return Yt.textContent=e.message,Yt.classList.add(`is-error`),!1}}X.value=Ge(We.klein),Xt(X.value,!0);var Zt=0;X.addEventListener(`input`,()=>{clearTimeout(Zt),Zt=setTimeout(()=>{H(E(`[data-preset]`),``,`preset`),Xt(X.value)},350)});for(let e of E(`[data-preset]`))e.addEventListener(`click`,()=>{H(E(`[data-preset]`),e.dataset.preset,`preset`),X.value=Ge(We[e.dataset.preset]),Xt(X.value,!0)});z.equation={enter(){A.gesture=`orbit`}};function Qt(e){if(!I||P!==`eq`||F||!A.awake)return;D.matches||(Y.t=(Y.t+e*Math.PI*2/8)%(Math.PI*2));let t=I.frame(Y.t);A.liveSet(I.gpu,t.pos,t.count)}var Z={v:1,dragging:null};z.walnut={enter(){A.gesture=`cut`,A.onCut=e=>{Z.touched=!0,Z.anim=null,Z.v=i(Z.v-e*1.6,0,1),T(`#cut`).value=String(Math.round(Z.v*1e3)),tn()},setTimeout(()=>{R===`walnut`&&Z.v===1&&!Z.touched&&$t(.5)},2600)},leave(){A.gesture=`orbit`,A.onCut=null}},T(`#cut`).addEventListener(`input`,e=>{Z.touched=!0,Z.anim=null,Z.v=Number(e.target.value)/1e3,tn()});function $t(e){Z.anim={from:Z.v,to:e,t:0,dur:D.matches?.01:1.6}}function en(e){let t=Z.anim;if(!t)return;t.t+=e;let n=i(t.t/t.dur,0,1);Z.v=a(t.from,t.to,o(n)),T(`#cut`).value=String(Math.round(Z.v*1e3)),tn(),n>=1&&(Z.anim=null)}function tn(){let e=a(-.85,1.15,Z.v);P===`walnut`&&(A.cut=Z.v>=.999?[0,0,0,0]:[0,0,-1,-e]);let t=N.get(`walnut`),n=t?Math.max(0,(e-t.zmin)*t.mmPerUnit).toFixed(1):``;T(`#cut-out`).textContent=Z.v>=.999?`whole`:`${n} mm in`}z.link={enter(){A.gesture=`orbit`,rn()}},T(`#link-open`).href=tt+nt,T(`[data-act=decode]`).addEventListener(`click`,()=>rn()),M(`link-len`,`97`);var nn=null;function rn(){let e=nt,t=e.slice(5),n=atob(t.replace(/-/g,`+`).replace(/_/g,`/`)+`===`.slice((t.length+3)%4)),r=j.link,i=j.json,a=e=>e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`),o=Math.ceil(t.length/4),s=0;clearInterval(nn);let c=()=>{let c=t.slice(0,s*4),l=t.slice(s*4,s*4+4),u=t.slice(s*4+4);r.innerHTML=`<span class="seen">${a(e.slice(0,5))}</span><span class="seen">${a(c)}</span><span class="hot">${a(l)}</span><span class="dimmed">${a(u)}</span>`;let d=Math.min(n.length,Math.floor((s+1)*4*3/4)),f=a(n.slice(0,d));s>=o&&(f=f.replace(`grape`,`<span class="hot">grape</span>`)),i.innerHTML=f+(s<o?`<span class="hot"> </span>`:``)};D.matches?(s=o,c()):(c(),nn=setInterval(()=>{s++,c(),s>=o&&clearInterval(nn)},70))}T(`#embed-start`).addEventListener(`click`,()=>{let e=document.createElement(`iframe`);e.src=`${tt}embed/?toy=toy-piano&sound=on&theme=dark&turntable=off`,e.title=`Splashery's toy piano, live`,e.allow=`fullscreen; autoplay`,T(`#embed`).replaceChildren(e)});var an=null,on=0;A.on(e=>{let t=e.dt;if(xt(t),Tt(t),Rt(t),Jt(t),Qt(t),en(t),U.lift=a(U.lift,U.liftTarget,1-Math.exp(-t*4)),A.lift=U.lift,U.result){let t=e.view,n=A.cam.distance*Math.tan(A.cam.fov/2),r=n*(A.cssW/A.cssH),a=O.matches?[.52,-.3]:[.42,-.48],o=(a[0]-A.shift[0])*r,s=(a[1]-A.shift[1])*n;A.liftPos=[0,1,2].map(e=>A.cam.target[e]+t.right[e]*o+t.up[e]*s);let c=Math.max(...U.result.worldScale);if(A.liftScale=i(.075*Math.min(r,n)/c,1,600),on++,on%6==0){let n=Lt(U.result,t,e.focal);Ft(W.sigma2,[[n[0],n[1]],[n[1],n[2]]],!1)}}cn(e)}),A.overlayHook=(e,t,n,r)=>{if(U.result&&U.lift>.02){let i=A.cam.focal(r),o=le(t,i,n,r,A.shift,U.result.world),s=le(t,i,n,r,A.shift,A.liftPos);if(o&&s){let t=n/A.cssW;e.save(),e.strokeStyle=`rgba(255, 212, 0, ${.8*U.lift})`,e.lineWidth=1*t,e.setLineDash([4*t,4*t]),e.beginPath(),e.moveTo(o[0],o[1]),e.lineTo(a(o[0],s[0],U.lift),a(o[1],s[1],U.lift)),e.stroke(),e.setLineDash([]),e.beginPath(),e.arc(o[0],o[1],4*t,0,Math.PI*2),e.stroke(),e.restore()}}};var sn=0;function cn(e){if(!(e.now-sn<250)){if(sn=e.now,M(`state`,$.hidden?k.classList.contains(`is-live`)?B.frozen?`frozen`:an||(A.morph.t<1&&!A.morph.manual?`flying`:e.idle?`idle`:`live`):`loading`:`stopped`),M(`file`,rt[P]||``),M(`count`,A.drawCount==null?`${b(A.displayCount??A.count)} ${A.displayCount===1?`splat`:`splats`}`:`${b(A.drawCount)} of ${b(A.count)} splats`),M(`sort`,`sort ${A.sortMs.toFixed(1)} ms · worker`),M(`fps`,e.idle?`no redraws`:`${Math.round(A.fps)} fps`),B.frozen){let e=Math.round(A.count/A.explode.slabs);M(`frozen`,`Frame frozen. ${b(A.count)} splats in the order they are blended,\nshown as ${A.explode.slabs} layers of about ${b(e)}.`)}else M(`frozen`,``)}}for(let e of[`scroll`,`keydown`,`pointerdown`,`input`])addEventListener(e,()=>A.wake(),{passive:!0,capture:!0});function ln(){let e=T(`.stage-col`).getBoundingClientRect(),t=document.documentElement.style;t.setProperty(`--stage-left`,`${Math.round(e.left)}px`),t.setProperty(`--stage-width`,`${Math.round(e.width)}px`)}addEventListener(`resize`,ln),ln();for(let e of E(`.step`))e.addEventListener(`focusin`,()=>{if(e.dataset.step===R)return;let t=e.getBoundingClientRect().top+scrollY,n=O.matches?T(`.stage-col`).getBoundingClientRect().height:0;window.scrollTo({top:Math.max(0,t-n),behavior:`instant`}),_t(e.dataset.step)});function un(e,t,n,r=!1){e.addEventListener(`keydown`,a=>{let o=+e.min,s=+e.max,c=r?Math.round(+e.value):+e.value,l={ArrowRight:c+t,ArrowUp:c+t,ArrowLeft:c-t,ArrowDown:c-t,PageUp:c+n,PageDown:c-n,Home:o,End:s}[a.key];l!==void 0&&(a.preventDefault(),e.value=String(i(l,o,s)),e.dispatchEvent(new Event(`input`,{bubbles:!0})))})}un(T(`#blend`),20,100),un(T(`#cut`),20,100),un(T(`#dial`),1,4,!0);function dn(e){let t=()=>E(`[role="radio"]`,e),n=()=>{let e=t(),n=e.find(e=>e.getAttribute(`aria-checked`)===`true`)||e[0];for(let t of e)t.tabIndex=t===n?0:-1};e.addEventListener(`keydown`,e=>{let n=t(),r=n.indexOf(document.activeElement);if(r<0)return;let i=n.length,a={ArrowRight:r+1,ArrowDown:r+1,ArrowLeft:r-1,ArrowUp:r-1,Home:0,End:i-1}[e.key];if(a===void 0)return;e.preventDefault();let o=n[(a+i)%i];o.focus(),o.click()}),n(),new MutationObserver(n).observe(e,{subtree:!0,childList:!0,attributes:!0,attributeFilter:[`aria-checked`]})}E(`[role="radiogroup"]`).forEach(dn);var fn={hero:`Arrow keys turn it · Enter takes the frame apart`,splat:`Arrows turn it · Enter picks at the crosshair · Esc lets go`,parts:`Arrow keys turn it · Enter opens or closes the lid`},pn=()=>M(`stage-keys`,fn[R]||`Arrow keys turn it`);j[`stage-keys`]=T(`#stage-keys`);var Q=null;for(let e of E(`[data-act=to-stage]`))e.addEventListener(`click`,()=>{Q=e,k.focus()});var mn=()=>E(`a[href], button:not([disabled]), input:not([disabled]), textarea, summary, [tabindex="0"]`).filter(e=>e.tabIndex>=0&&e.getClientRects().length&&getComputedStyle(e).visibility!==`hidden`);k.addEventListener(`keydown`,e=>{if(e.target!==k||e.key!==`Tab`||!Q)return;let t=mn(),n=t[t.indexOf(Q)+ +!e.shiftKey]||Q;Q=null,e.preventDefault(),n.focus()}),k.addEventListener(`focusout`,()=>{setTimeout(()=>{document.activeElement!==k&&(Q=null)},0)}),k.addEventListener(`keydown`,e=>{if(e.target!==k||e.altKey||e.ctrlKey||e.metaKey)return;let t=A.cam,n={ArrowLeft:[-.16,0],ArrowRight:[.16,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]}[e.key];n?(e.preventDefault(),A.camTween=null,A.idleAt=performance.now(),t.yaw+=n[0],t.pitch=i(t.pitch+n[1],-1.2,1.2)):e.key===`Enter`||e.key===` `?(e.preventDefault(),R===`splat`?Ot(.5,.5):R===`hero`?(B.used=!0,T(`.hud-hint`).classList.add(`is-used`),St(.9,4.2)):R===`parts`&&J()):e.key===`Escape`&&U.result&&(e.preventDefault(),At())});var $=T(`#error`),hn=null;function gn(e,t){let n=e&&(e.message||String(e))||`Something stopped the page.`;console.error(e),T(`#error-msg`).textContent=n.replace(/^Error: /,``),hn=A.broken?()=>location.reload():t,T(`#error-retry`).textContent=A.broken?`Reload the page`:`Retry`,$.hidden=!1,k.classList.add(`is-stopped`),M(`load`,``)}T(`#error-retry`).addEventListener(`click`,()=>{$.hidden=!0,k.classList.remove(`is-stopped`);let e=hn;hn=null,e&&e()}),A.onError=e=>gn(e,()=>location.reload());async function _n(){$.hidden=!0;let e=performance.now();try{await dt(gt[R]||`grape`)}catch(e){gn(e,_n);return}k.classList.add(`is-live`),M(`load`,``),console.log(`first cloud in ${Math.round(performance.now()-e)} ms`),R===`hero`&&setTimeout(()=>{!B.used&&R===`hero`&&St(.42,2.8)},900),setTimeout(()=>at(`chest`).then(()=>at(`walnut`)).catch(()=>{}),1500)}yt(),_n(),window.pitch={demoPull:St,pull:B,goTo:dt,setStep:_t,pickAt:Ot,setDial:zt,toggleLid:J,animateCut:$t,decode:rn};