var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t,t.exports),e=null),t.exports),s=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},c=(n,r,o)=>(o=n==null?{}:e(i(n)),s(r||!n||!n.__esModule||!a.call(n,`default`)?t(o,`default`,{value:n,enumerable:!0}):o,n)),l=Uint8Array,u=Uint16Array,d=Int32Array,f=new l([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),p=new l([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),m=new l([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),h=function(e,t){for(var n=new u(31),r=0;r<31;++r)n[r]=t+=1<<e[r-1];for(var i=new d(n[30]),r=1;r<30;++r)for(var a=n[r];a<n[r+1];++a)i[a]=a-n[r]<<5|r;return{b:n,r:i}},g=h(f,2),_=g.b,v=g.r;_[28]=258,v[258]=28;var y=h(p,0),b=y.b;y.r;for(var x=new u(32768),S=0;S<32768;++S){var C=(S&43690)>>1|(S&21845)<<1;C=(C&52428)>>2|(C&13107)<<2,C=(C&61680)>>4|(C&3855)<<4,x[S]=((C&65280)>>8|(C&255)<<8)>>1}for(var w=(function(e,t,n){for(var r=e.length,i=0,a=new u(t);i<r;++i)e[i]&&++a[e[i]-1];var o=new u(t);for(i=1;i<t;++i)o[i]=o[i-1]+a[i-1]<<1;var s;if(n){s=new u(1<<t);var c=15-t;for(i=0;i<r;++i)if(e[i])for(var l=i<<4|e[i],d=t-e[i],f=o[e[i]-1]++<<d,p=f|(1<<d)-1;f<=p;++f)s[x[f]>>c]=l}else for(s=new u(r),i=0;i<r;++i)e[i]&&(s[i]=x[o[e[i]-1]++]>>15-e[i]);return s}),T=new l(288),S=0;S<144;++S)T[S]=8;for(var S=144;S<256;++S)T[S]=9;for(var S=256;S<280;++S)T[S]=7;for(var S=280;S<288;++S)T[S]=8;for(var E=new l(32),S=0;S<32;++S)E[S]=5;var D=/*#__PURE__*/ w(T,9,1),O=/*#__PURE__*/ w(E,5,1),ee=function(e){for(var t=e[0],n=1;n<e.length;++n)e[n]>t&&(t=e[n]);return t},k=function(e,t,n){var r=t/8|0;return(e[r]|e[r+1]<<8)>>(t&7)&n},te=function(e,t){var n=t/8|0;return(e[n]|e[n+1]<<8|e[n+2]<<16)>>(t&7)},A=function(e){return(e+7)/8|0},ne=function(e,t,n){return(t==null||t<0)&&(t=0),(n==null||n>e.length)&&(n=e.length),new l(e.subarray(t,n))},re=[`unexpected EOF`,`invalid block type`,`invalid length/literal`,`invalid distance`,`stream finished`,`no stream handler`,,`no callback`,`invalid UTF-8 data`,`extra field too long`,`date not in range 1980-2099`,`filename too long`,`stream finishing`,`invalid zip data`],j=function(e,t,n){var r=Error(t||re[e]);if(r.code=e,Error.captureStackTrace&&Error.captureStackTrace(r,j),!n)throw r;return r},ie=function(e,t,n,r){var i=e.length,a=r?r.length:0;if(!i||t.f&&!t.l)return n||new l(0);var o=!n,s=o||t.i!=2,c=t.i;o&&(n=new l(i*3));var u=function(e){var t=n.length;if(e>t){var r=new l(Math.max(t*2,e));r.set(n),n=r}},d=t.f||0,h=t.p||0,g=t.b||0,v=t.l,y=t.d,x=t.m,S=t.n,C=i*8;do{if(!v){d=k(e,h,1);var T=k(e,h+1,3);if(h+=3,!T){var E=A(h)+4,re=e[E-4]|e[E-3]<<8,ie=E+re;if(ie>i){c&&j(0);break}s&&u(g+re),n.set(e.subarray(E,ie),g),t.b=g+=re,t.p=h=ie*8,t.f=d;continue}if(T==1)v=D,y=O,x=9,S=5;else if(T==2){var ae=k(e,h,31)+257,M=k(e,h+10,15)+4,N=ae+k(e,h+5,31)+1;h+=14;for(var oe=new l(N),se=new l(19),P=0;P<M;++P)se[m[P]]=k(e,h+P*3,7);h+=M*3;for(var ce=ee(se),le=(1<<ce)-1,ue=w(se,ce,1),P=0;P<N;){var de=ue[k(e,h,le)];h+=de&15;var E=de>>4;if(E<16)oe[P++]=E;else{var fe=0,pe=0;for(E==16?(pe=3+k(e,h,3),h+=2,fe=oe[P-1]):E==17?(pe=3+k(e,h,7),h+=3):E==18&&(pe=11+k(e,h,127),h+=7);pe--;)oe[P++]=fe}}var me=oe.subarray(0,ae),he=oe.subarray(ae);x=ee(me),S=ee(he),v=w(me,x,1),y=w(he,S,1)}else j(1);if(h>C){c&&j(0);break}}s&&u(g+131072);for(var ge=(1<<x)-1,_e=(1<<S)-1,ve=h;;ve=h){var fe=v[te(e,h)&ge],ye=fe>>4;if(h+=fe&15,h>C){c&&j(0);break}if(fe||j(2),ye<256)n[g++]=ye;else if(ye==256){ve=h,v=null;break}else{var be=ye-254;if(ye>264){var P=ye-257,xe=f[P];be=k(e,h,(1<<xe)-1)+_[P],h+=xe}var Se=y[te(e,h)&_e],Ce=Se>>4;Se||j(3),h+=Se&15;var he=b[Ce];if(Ce>3){var xe=p[Ce];he+=te(e,h)&(1<<xe)-1,h+=xe}if(h>C){c&&j(0);break}s&&u(g+131072);var we=g+be;if(g<he){var Te=a-he,Ee=Math.min(he,we);for(Te+g<0&&j(3);g<Ee;++g)n[g]=r[Te+g]}for(;g<we;++g)n[g]=n[g-he]}}t.l=v,t.p=ve,t.b=g,t.f=d,v&&(d=1,t.m=x,t.d=y,t.n=S)}while(!d);return g!=n.length&&o?ne(n,0,g):n.subarray(0,g)},ae=/*#__PURE__*/ new l(0),M=function(e,t){return e[t]|e[t+1]<<8},N=function(e,t){return(e[t]|e[t+1]<<8|e[t+2]<<16|e[t+3]<<24)>>>0},oe=function(e,t){return N(e,t)+N(e,t+4)*4294967296},se=function(e){(e[0]!=31||e[1]!=139||e[2]!=8)&&j(6,`invalid gzip data`);var t=e[3],n=10;t&4&&(n+=(e[10]|e[11]<<8)+2);for(var r=(t>>3&1)+(t>>4&1);r>0;r-=!e[n++]);return n+(t&2)},P=function(e){var t=e.length;return(e[t-4]|e[t-3]<<8|e[t-2]<<16|e[t-1]<<24)>>>0};function ce(e,t){return ie(e,{i:2},t&&t.out,t&&t.dictionary)}function le(e,t){var n=se(e);return n+8>e.length&&j(6,`invalid gzip data`),ie(e.subarray(n,-8),{i:2},t&&t.out||new l(P(e)),t&&t.dictionary)}var ue=typeof TextDecoder<`u`&&/*#__PURE__*/ new TextDecoder;try{ue.decode(ae,{stream:!0})}catch{}var de=function(e){for(var t=``,n=0;;){var r=e[n++],i=(r>127)+(r>223)+(r>239);if(n+i>e.length)return{s:t,r:ne(e,n-1)};i?i==3?(r=((r&15)<<18|(e[n++]&63)<<12|(e[n++]&63)<<6|e[n++]&63)-65536,t+=String.fromCharCode(55296|r>>10,56320|r&1023)):i&1?t+=String.fromCharCode((r&31)<<6|e[n++]&63):t+=String.fromCharCode((r&15)<<12|(e[n++]&63)<<6|e[n++]&63):t+=String.fromCharCode(r)}};function fe(e,t){if(t){for(var n=``,r=0;r<e.length;r+=16384)n+=String.fromCharCode.apply(null,e.subarray(r,r+16384));return n}if(ue)return ue.decode(e);var i=de(e),a=i.s,n=i.r;return n.length&&j(8),a}var pe=function(e,t){return t+30+M(e,t+26)+M(e,t+28)},me=function(e,t,n){var r=M(e,t+28),i=M(e,t+30),a=fe(e.subarray(t+46,t+46+r),!(M(e,t+8)&2048)),o=t+46+r,s=he(e,o,i,n,N(e,t+20),N(e,t+24),N(e,t+42)),c=s[0],l=s[1],u=s[2];return[M(e,t+10),c,l,a,o+i+M(e,t+32),u]},he=function(e,t,n,r,i,a,o){var s=i==4294967295,c=a==4294967295,l=o==4294967295,u=t+n,d=s+c+l;if(r&&d){for(;t+4<u;t+=4+M(e,t+2))if(M(e,t)==1)return[s?oe(e,t+4+8*c):i,c?oe(e,t+4):a,l?oe(e,t+4+8*(c+s)):o,1];r<2&&j(13)}return[i,a,o,0]};function ge(e,t){for(var n={},r=e.length-22;N(e,r)!=101010256;--r)(!r||e.length-r>65558)&&j(13);var i=M(e,r+8);if(!i)return{};var a=N(e,r+16),o=N(e,r-20)==117853008;if(o){var s=N(e,r-12);o=N(e,s)==101075792,o&&(i=N(e,s+32),a=N(e,s+48))}for(var c=t&&t.filter,u=0;u<i;++u){var d=me(e,a,o),f=d[0],p=d[1],m=d[2],h=d[3],g=d[4],_=d[5],v=pe(e,_);a=g,(!c||c({name:h,size:p,originalSize:m,compression:f}))&&(f?f==8?n[h]=ce(e.subarray(v,v+p),{out:new l(m)}):j(14,`unknown compression type `+f):n[h]=ne(e,v,v+p))}return n}async function _e(e={}){var t=e,n=!!globalThis.window,r=!!globalThis.WorkerGlobalScope,i=globalThis.process?.versions?.node&&globalThis.process?.type!=`renderer`;if(i){let{createRequire:e}=await import(`./vite-browser-external-CAuylCxU.js`).then(e=>/* @__PURE__ */ c(e.default,1));var a=e(import.meta.url)}var o=import.meta.url,s=``;function l(e){return t.locateFile?t.locateFile(e,s):s+e}var u,d;if(i){var f=a("node:fs");o.startsWith(`file:`)&&(s=a("node:path").dirname(a("node:url").fileURLToPath(o))+`/`),d=e=>(e=g(e)?new URL(e):e,f.readFileSync(e)),u=async(e,t=!0)=>(e=g(e)?new URL(e):e,f.readFileSync(e,t?void 0:`utf8`)),process.argv.length>1&&process.argv[1].replace(/\\/g,`/`),process.argv.slice(2)}else if(n||r){try{s=new URL(`.`,o).href}catch{}r&&(d=e=>{var t=new XMLHttpRequest;return t.open(`GET`,e,!1),t.responseType=`arraybuffer`,t.send(null),new Uint8Array(t.response)}),u=async e=>{var t=await fetch(e,{credentials:`same-origin`});if(t.ok)return t.arrayBuffer();throw Error(t.status+` : `+t.url)}}console.log.bind(console);var p=console.error.bind(console),m,h=!1,g=e=>e.startsWith(`file://`);function _(){var e=Me.buffer;ne=new Int8Array(e),k=new Int16Array(e),t.HEAPU8=N=new Uint8Array(e),ie=new Uint16Array(e),te=new Int32Array(e),t.HEAPU32=ae=new Uint32Array(e),re=new Float32Array(e),j=new Float64Array(e),A=new BigInt64Array(e),M=new BigUint64Array(e)}function v(){if(t.preRun)for(typeof t.preRun==`function`&&(t.preRun=[t.preRun]);t.preRun.length;)le(t.preRun.shift());oe(ce)}function y(){Ie.c()}function b(){if(t.postRun)for(typeof t.postRun==`function`&&(t.postRun=[t.postRun]);t.postRun.length;)P(t.postRun.shift());oe(se)}function x(e){throw t.onAbort?.(e),e=`Aborted(${e})`,p(e),h=!0,e+=`. Build with -sASSERTIONS for more info.`,new WebAssembly.RuntimeError(e)}var S;function C(){return t.locateFile?l(`webp.wasm`):new URL(new URL(`webp.wasm-D-qyFmK3.wasm`,import.meta.url).href,``+import.meta.url).href}function w(e){if(e==S&&m)return new Uint8Array(m);if(d)return d(e);throw`both async and sync fetching of the wasm failed`}async function T(e){if(!m)try{var t=await u(e);return new Uint8Array(t)}catch{}return w(e)}async function E(e,t){try{var n=await T(e);return await WebAssembly.instantiate(n,t)}catch(e){p(`failed to asynchronously prepare wasm: ${e}`),x(e)}}async function D(e,t,n){if(!e&&!i)try{var r=fetch(t,{credentials:`same-origin`});return await WebAssembly.instantiateStreaming(r,n)}catch(e){p(`wasm streaming compile failed: ${e}`),p(`falling back to ArrayBuffer instantiation`)}return E(t,n)}function O(){return{a:Pe}}async function ee(){function e(e,t){return Ie=e.exports,Ne(Ie),_(),Ie}function n(t){return e(t.instance)}var r=O();return t.instantiateWasm?new Promise((n,i)=>{t.instantiateWasm(r,(t,r)=>{n(e(t,r))})}):(S??=C(),n(await D(m,S,r)))}var k,te,A,ne,re,j,ie,ae,M,N,oe=e=>{for(;e.length>0;)e.shift()(t)},se=[],P=e=>se.push(e),ce=[],le=e=>ce.push(e),ue=e=>ke(e),de=()=>je(),fe=()=>2147483648,pe=(e,t)=>Math.ceil(e/t)*t,me=e=>{var t=(e-Me.buffer.byteLength+65535)/65536|0;try{return Me.grow(t),_(),1}catch{}},he=e=>{var t=N.length;e>>>=0;var n=fe();if(e>n)return!1;for(var r=1;r<=4;r*=2){var i=t*(1+.2/r);if(i=Math.min(i,e+100663296),me(Math.min(n,pe(Math.max(e,i),65536))))return!0}return!1},ge=e=>t[`_`+e],_e=(e,t)=>{ne.set(e,t)},ve=e=>{for(var t=0,n=0;n<e.length;++n){var r=e.charCodeAt(n);r<=127?t++:r<=2047?t+=2:r>=55296&&r<=57343?(t+=4,++n):t+=3}return t},ye=(e,t,n,r)=>{if(!(r>0))return 0;for(var i=n,a=n+r-1,o=0;o<e.length;++o){var s=e.codePointAt(o);if(s<=127){if(n>=a)break;t[n++]=s}else if(s<=2047){if(n+1>=a)break;t[n++]=192|s>>6,t[n++]=128|s&63}else if(s<=65535){if(n+2>=a)break;t[n++]=224|s>>12,t[n++]=128|s>>6&63,t[n++]=128|s&63}else{if(n+3>=a)break;t[n++]=240|s>>18,t[n++]=128|s>>12&63,t[n++]=128|s>>6&63,t[n++]=128|s&63,o++}}return t[n]=0,n-i},be=(e,t,n)=>ye(e,N,t,n),xe=e=>Ae(e),Se=e=>{var t=ve(e)+1,n=xe(t);return be(e,n,t),n},Ce=globalThis.TextDecoder&&new TextDecoder,we=(e,t,n,r)=>{var i=t+n;if(r)return i;for(;e[t]&&!(t>=i);)++t;return t},Te=(e,t=0,n,r)=>{var i=we(e,t,n,r);if(i-t>16&&e.buffer&&Ce)return Ce.decode(e.subarray(t,i));for(var a=``;t<i;){var o=e[t++];if(!(o&128))a+=String.fromCharCode(o);else{var s=e[t++]&63;if((o&224)==192)a+=String.fromCharCode((o&31)<<6|s);else{var c=e[t++]&63;if(o=(o&240)==224?(o&15)<<12|s<<6|c:(o&7)<<18|s<<12|c<<6|e[t++]&63,o<65536)a+=String.fromCharCode(o);else{var l=o-65536;a+=String.fromCharCode(55296|l>>10,56320|l&1023)}}}}return a},Ee=(e,t,n)=>e?Te(N,e,t,n):``,De=(e,t,n,r,i)=>{var a={string:e=>{var t=0;return e!=null&&e!==0&&(t=Se(e)),t},array:e=>{var t=xe(e.length);return _e(e,t),t}};function o(e){return t===`string`?Ee(e):t===`boolean`?!!e:e}var s=ge(e),c=[],l=0;if(r)for(var u=0;u<r.length;u++){var d=a[n[u]];d?(l===0&&(l=de()),c[u]=d(r[u])):c[u]=r[u]}var f=s(...c);function p(e){return l!==0&&ue(l),o(e)}return f=p(f),f},Oe=(e,t,n,r)=>{var i=!n||n.every(e=>e===`number`||e===`boolean`);return t!==`string`&&i&&!r?ge(e):(...i)=>De(e,t,n,i,r)};if(t.noExitRuntime&&t.noExitRuntime,t.print&&t.print,t.printErr&&(p=t.printErr),t.wasmBinary&&(m=t.wasmBinary),t.arguments&&t.arguments,t.thisProgram&&t.thisProgram,t.preInit)for(typeof t.preInit==`function`&&(t.preInit=[t.preInit]);t.preInit.length>0;)t.preInit.shift()();t.cwrap=Oe;var ke,Ae,je,Me;function Ne(e){t._webp_encode_rgba=e.d,t._webp_encode_lossless_rgba=e.e,t._webp_encode_lossless_rgba_level=e.f,t._webp_decode_rgba=e.g,t._webp_free=e.h,t._malloc=e.i,t._free=e.j,ke=e.k,Ae=e.l,je=e.m,Me=e.b,e.__indirect_function_table}var Pe={a:he};async function Fe(){v();var e=t.setStatus;e&&(e(`Running...`),await new Promise(e=>setTimeout(e,1)),setTimeout(e,1,``)),!h&&(y(),t.onRuntimeInitialized?.(),b())}var Ie=await ee();return await Fe(),t}var ve=new URL(`webp.wasm-D-qyFmK3.wasm`,import.meta.url).href;const ye=(e,t)=>[e[0]+t[0],e[1]+t[1],e[2]+t[2]],be=(e,t)=>[e[0]*t,e[1]*t,e[2]*t],xe=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],Se=e=>Math.hypot(e[0],e[1],e[2]),Ce=e=>{let t=Se(e)||1;return[e[0]/t,e[1]/t,e[2]/t]};function we(e,t){let n=Ce(e),r=Math.sin(t/2);return[n[0]*r,n[1]*r,n[2]*r,Math.cos(t/2)]}function Te(e,t){return[e[3]*t[0]+t[3]*e[0]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]+t[3]*e[1]+e[2]*t[0]-e[0]*t[2],e[3]*t[2]+t[3]*e[2]+e[0]*t[1]-e[1]*t[0],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function Ee(e,t){let n=[e[0],e[1],e[2]],r=be(xe(n,t),2);return ye(ye(t,be(r,e[3])),xe(n,r))}function De(e){let[t,n,r,i]=e;return[1-2*(n*n+r*r),2*(t*n-i*r),2*(t*r+i*n),2*(t*n+i*r),1-2*(t*t+r*r),2*(n*r-i*t),2*(t*r-i*n),2*(n*r+i*t),1-2*(t*t+n*n)]}function Oe(e){let[t,n,r,i,a,o,s,c,l]=e,u=t+a+l,d,f,p,m;if(u>0){let e=Math.sqrt(u+1)*2;m=.25*e,d=(c-o)/e,f=(r-s)/e,p=(i-n)/e}else if(t>a&&t>l){let e=Math.sqrt(1+t-a-l)*2;m=(c-o)/e,d=.25*e,f=(n+i)/e,p=(r+s)/e}else if(a>l){let e=Math.sqrt(1+a-t-l)*2;m=(r-s)/e,d=(n+i)/e,f=.25*e,p=(o+c)/e}else{let e=Math.sqrt(1+l-t-a)*2;m=(i-n)/e,d=(r+s)/e,f=(o+c)/e,p=.25*e}let h=Math.hypot(d,f,p,m)||1;return[d/h,f/h,p/h,m/h]}function ke(e,t){let n=De(t),r=[n[0]*e[0],n[1]*e[1],n[2]*e[2],n[3]*e[0],n[4]*e[1],n[5]*e[2],n[6]*e[0],n[7]*e[1],n[8]*e[2]],i=(e,t)=>r[e*3]*r[t*3]+r[e*3+1]*r[t*3+1]+r[e*3+2]*r[t*3+2];return[i(0,0),i(0,1),i(0,2),i(1,1),i(1,2),i(2,2)]}function Ae(e,t={s:[0,0,0],q:[0,0,0,1]}){let n=[[e[0],e[1],e[2]],[e[1],e[3],e[4]],[e[2],e[4],e[5]]],r=[[1,0,0],[0,1,0],[0,0,1]];for(let e=0;e<12&&!(n[0][1]*n[0][1]+n[0][2]*n[0][2]+n[1][2]*n[1][2]<1e-30);e++)for(let e=0;e<2;e++)for(let t=e+1;t<3;t++){if(Math.abs(n[e][t])<1e-30)continue;let i=(n[t][t]-n[e][e])/(2*n[e][t]),a=Math.sign(i||1)/(Math.abs(i)+Math.sqrt(i*i+1)),o=1/Math.sqrt(a*a+1),s=a*o;for(let r=0;r<3;r++){let i=n[r][e],a=n[r][t];n[r][e]=o*i-s*a,n[r][t]=s*i+o*a}for(let r=0;r<3;r++){let i=n[e][r],a=n[t][r];n[e][r]=o*i-s*a,n[t][r]=s*i+o*a}for(let n=0;n<3;n++){let i=r[n][e],a=r[n][t];r[n][e]=o*i-s*a,r[n][t]=s*i+o*a}}if(r[0][0]*(r[1][1]*r[2][2]-r[1][2]*r[2][1])-r[0][1]*(r[1][0]*r[2][2]-r[1][2]*r[2][0])+r[0][2]*(r[1][0]*r[2][1]-r[1][1]*r[2][0])<0)for(let e=0;e<3;e++)r[e][2]=-r[e][2];return t.s[0]=Math.sqrt(Math.max(n[0][0],1e-14)),t.s[1]=Math.sqrt(Math.max(n[1][1],1e-14)),t.s[2]=Math.sqrt(Math.max(n[2][2],1e-14)),t.q=Oe([r[0][0],r[0][1],r[0][2],r[1][0],r[1][1],r[1][2],r[2][0],r[2][1],r[2][2]]),t}const je=/* @__PURE__ */ new Float32Array(1),Me=new Uint32Array(je.buffer);function Ne(e){je[0]=e;let t=Me[0],n=t>>>16&32768,r=(t>>>23&255)-127+15,i=t&8388607;if(r>=31)return n|31743;if(r<=0){if(r<-10)return n;i|=8388608;let e=14-r;return n|(i>>e)+(i>>e-1&1)}return(n|r<<10|i>>13)+(i>>12&1)}function Pe(e){return je[0]=e,Me[0]}function Fe(e){let t=(e^2654435769)>>>0;return t=Math.imul(t^t>>>16,569420461),t=Math.imul(t^t>>>15,1935289751),t=(t^t>>>15)>>>0,t/4294967296}function Ie(e){return{count:e,pos:new Float32Array(e*3),scale:new Float32Array(e*3),rot:new Float32Array(e*4),color:new Uint8Array(e*4),part:new Uint8Array(e)}}function Le(e,t){let n=e.count,r=t||new Uint32Array(Math.ceil(n/1024)*1024*8),{pos:i,scale:a,rot:o,color:s,part:c}=e;for(let e=0;e<n;e++){let t=e*8,n=e*3,l=e*4;r[t]=Pe(i[n]),r[t+1]=Pe(i[n+1]),r[t+2]=Pe(i[n+2]),r[t+3]=(s[l]|s[l+1]<<8|s[l+2]<<16|s[l+3]<<24)>>>0,r[t+4]=(Ne(a[n])|Ne(a[n+1])<<16)>>>0,r[t+5]=(Ne(a[n+2])|Ne(o[l])<<16)>>>0,r[t+6]=(Ne(o[l+1])|Ne(o[l+2])<<16)>>>0,r[t+7]=(Ne(o[l+3])|Ne(c?c[e]:0)<<16)>>>0}return r}function Re(e,t=.98){let n=e.count,r=Math.max(1,Math.floor(n/2e4)),i=[],a=[],o=[];for(let t=0;t<n;t+=r)e.color[t*4+3]<40||(i.push(e.pos[t*3]),a.push(e.pos[t*3+1]),o.push(e.pos[t*3+2]));let s=e=>e.sort((e,t)=>e-t)[e.length>>1]??0,c=[s(i.slice()),s(a.slice()),s(o.slice())],l=i.map((e,t)=>Math.hypot(e-c[0],a[t]-c[1],o[t]-c[2])).sort((e,t)=>e-t);return{center:c,radius:l[Math.min(l.length-1,Math.floor(l.length*t))]||1}}function ze(e,t=1){let n=Re(e),r=t/n.radius;for(let t=0;t<e.count;t++)for(let i=0;i<3;i++)e.pos[t*3+i]=(e.pos[t*3+i]-n.center[i])*r,e.scale[t*3+i]*=r;return{center:n.center,scale:r}}const Be=.28209479177387814;let Ve=null;async function He(){return Ve||=_e({locateFile:()=>ve}),Ve}function Ue(e,t){let n=e._malloc(t.length),r=e._malloc(4),i=e._malloc(4),a=e._malloc(4);if(e.HEAPU8.set(t,n),!e._webp_decode_rgba(n,t.length,r,i,a))throw Error(`A WebP picture in the SOG would not decode.`);let o=e.HEAPU32[r>>2],s=e.HEAPU32[i>>2],c=e.HEAPU32[a>>2],l=e.HEAPU8.slice(o,o+s*c*4);e._webp_free(o);for(let t of[n,r,i,a])e._free(t);return l}const We=e=>e<0?-(Math.exp(-e)-1):Math.exp(e)-1;async function Ge(e){let t=ge(new Uint8Array(e)),n=JSON.parse(fe(t[`meta.json`]));if(n.version!==2)throw Error(`Only version 2 SOG files are read here.`);let r=await He(),i=e=>Ue(r,t[e]),a=n.count,o=i(n.means.files[0]),s=i(n.means.files[1]),c=i(n.quats.files[0]),l=i(n.scales.files[0]),u=i(n.sh0.files[0]),{mins:d,maxs:f}=n.means,p=n.scales.codebook,m=n.sh0.codebook,h=Ie(a),g=[1,2,3,0,2,3,0,1,3,0,1,2],_=[0,0,0,0],v=e=>Math.max(0,Math.min(255,Math.round(e*255)));for(let e=0;e<a;e++){let t=e*4,n=e*3;for(let e=0;e<3;e++){let r=o[t+e]|s[t+e]<<8,i=We(d[e]+(f[e]-d[e])*(r/65535));h.pos[n+e]=e<2?-i:i}for(let e=0;e<3;e++)h.scale[n+e]=Math.exp(p[l[t+e]]);let r=c[t+3];if(r>=252&&r<=255){let e=r-252,n=(c[t]/255*2-1)/Math.SQRT2,i=(c[t+1]/255*2-1)/Math.SQRT2,a=(c[t+2]/255*2-1)/Math.SQRT2;_[0]=_[1]=_[2]=_[3]=0,_[g[e*3]]=n,_[g[e*3+1]]=i,_[g[e*3+2]]=a,_[e]=Math.sqrt(Math.max(0,1-(n*n+i*i+a*a)))}else _[0]=1,_[1]=_[2]=_[3]=0;let[i,a,y,b]=_;h.rot[t]=-y,h.rot[t+1]=a,h.rot[t+2]=i,h.rot[t+3]=-b,h.color[t]=v(.5+Be*m[u[t]]),h.color[t+1]=v(.5+Be*m[u[t+1]]),h.color[t+2]=v(.5+Be*m[u[t+2]]),h.color[t+3]=u[t+3]}return{set:h,meta:{count:a,generator:n.asset?.generator||``}}}function Ke(e){let t=e.count,n=Math.floor(Math.log2(t)),r=new Uint32Array(t);for(let e=0;e<t;e++)r[e]=e;let i=e.pos,a=[new Uint32Array([0,t])];for(let e=0;e<n;e++){let n=a[e],o=new Uint32Array(2**(e+1)+1),s=2**e;for(let e=0;e<s;e++){let t=n[e],a=n[e+1],s=t+a>>1;if(a-t>1){let e=Je(i,r,t,a);Ye(i,r,t,a-1,s,e)}o[2*e]=t,o[2*e+1]=s}o[2*s]=t,a.push(o)}let o=new Float32Array(t*6),s=new Float32Array(t),c=[0,0,0],l=[0,0,0,1];for(let n=0;n<t;n++){for(let t=0;t<3;t++)c[t]=e.scale[n*3+t];for(let t=0;t<4;t++)l[t]=e.rot[n*4+t];let t=ke(c,l);for(let e=0;e<6;e++)o[n*6+e]=t[e];s[n]=e.color[n*4+3]/255*c[0]*c[1]*c[2]+1e-15}return{levels:n,perm:r,bounds:a,cov:o,w:s,cache:/* @__PURE__ */ new Map}}const qe=e=>e.perm.length;function Je(e,t,n,r){let i=1/0,a=1/0,o=1/0,s=-1/0,c=-1/0,l=-1/0,u=r-n>4096?Math.floor((r-n)/2048):1;for(let d=n;d<r;d+=u){let n=t[d]*3,r=e[n],u=e[n+1],f=e[n+2];r<i&&(i=r),r>s&&(s=r),u<a&&(a=u),u>c&&(c=u),f<o&&(o=f),f>l&&(l=f)}let d=s-i,f=c-a,p=l-o;return d>=f&&d>=p?0:f>=p?1:2}function Ye(e,t,n,r,i,a){for(;r>n;){let o=e[t[n+r>>1]*3+a],s=n,c=r;for(;s<=c;){for(;e[t[s]*3+a]<o;)s++;for(;e[t[c]*3+a]>o;)c--;if(s<=c){let e=t[s];t[s]=t[c],t[c]=e,s++,c--}}if(i<=c)r=c;else if(i>=s)n=s;else return}}function Xe(e,t,n){if(e.cache.has(n))return e.cache.get(n);let r=e.bounds[n],i=r.length-1,a=Ie(i),{perm:o,cov:s,w:c}=e,l=t.pos,u=t.color,d={s:[0,0,0],q:[0,0,0,1]},f=[0,0,0,0,0,0];for(let e=0;e<i;e++){let t=r[e],n=r[e+1],i=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0,S=0,C=0,w=0,T=0;for(let e=t;e<n;e++){let t=o[e],n=c[t],r=t*3,a=l[r],d=l[r+1],f=l[r+2],E=t*6;i+=n,p+=n*a,m+=n*d,h+=n*f,g+=n*(s[E]+a*a),_+=n*(s[E+1]+a*d),v+=n*(s[E+2]+a*f),y+=n*(s[E+3]+d*d),b+=n*(s[E+4]+d*f),x+=n*(s[E+5]+f*f),S+=n*u[t*4],C+=n*u[t*4+1],w+=n*u[t*4+2],T+=Math.log(1-Math.min(.995,u[t*4+3]/255))}if(!(i<=0||n<=t)){p/=i,m/=i,h/=i,f[0]=g/i-p*p,f[1]=_/i-p*m,f[2]=v/i-p*h,f[3]=y/i-m*m,f[4]=b/i-m*h,f[5]=x/i-h*h,Ae(f,d),a.pos[e*3]=p,a.pos[e*3+1]=m,a.pos[e*3+2]=h;for(let t=0;t<3;t++)a.scale[e*3+t]=d.s[t];for(let t=0;t<4;t++)a.rot[e*4+t]=d.q[t];a.color[e*4]=S/i,a.color[e*4+1]=C/i,a.color[e*4+2]=w/i,a.color[e*4+3]=Math.round(255*Math.min(.98,1-Math.exp(.5*T)))}}return e.cache.set(n,a),a}function Ze(e,t,n){let r=Xe(e,t,n),i=n+1>e.levels,a=i?t.count:2**(n+1),o=Ie(a),s=Ie(a),c=e.bounds[n],l=i?null:Xe(e,t,n+1),u=(e,t,n,r)=>{for(let i=0;i<3;i++)e.pos[t*3+i]=n.pos[r*3+i],e.scale[t*3+i]=n.scale[r*3+i];for(let i=0;i<4;i++)e.rot[t*4+i]=n.rot[r*4+i],e.color[t*4+i]=n.color[r*4+i]};if(i)for(let n=0;n<c.length-1;n++)for(let i=c[n];i<c[n+1];i++)u(o,i,r,n),u(s,i,t,e.perm[i]);else for(let e=0;e<c.length-1;e++)for(let t of[2*e,2*e+1])u(o,t,r,e),u(s,t,l,t);return{from:o,to:s}}function Qe(e){return e&=1023,e=(e|e<<16)&50331903,e=(e|e<<8)&50393103,e=(e|e<<4)&51130563,e=(e|e<<2)&153391689,e}function $e(e){let t=e.count,n=[1/0,1/0,1/0],r=[-1/0,-1/0,-1/0];for(let i=0;i<t;i++)for(let t=0;t<3;t++){let a=e.pos[i*3+t];a<n[t]&&(n[t]=a),a>r[t]&&(r[t]=a)}let i=new Uint32Array(t),a=1023/(r[0]-n[0]||1),o=1023/(r[1]-n[1]||1),s=1023/(r[2]-n[2]||1);for(let r=0;r<t;r++){let t=(e.pos[r*3]-n[0])*a|0,c=(e.pos[r*3+1]-n[1])*o|0,l=(e.pos[r*3+2]-n[2])*s|0;i[r]=(Qe(t)|Qe(c)<<1|Qe(l)<<2)>>>0}let c=new Uint32Array(t);for(let e=0;e<t;e++)c[e]=e;return c.sort((e,t)=>i[e]-i[t]),c}function et(e,t,n,r,i){for(let a=0;a<3;a++)e.pos[t*3+a]=n.pos[r*3+a],e.scale[t*3+a]=i?0:n.scale[r*3+a];for(let i=0;i<4;i++)e.rot[t*4+i]=n.rot[r*4+i];for(let i=0;i<3;i++)e.color[t*4+i]=n.color[r*4+i];e.color[t*4+3]=i?0:n.color[r*4+3],e.part[t]=n.part?n.part[r]:0}function tt(e,t){let n=Math.max(e.count,t.count),r=$e(e),i=$e(t),a=Ie(n),o=Ie(n),s=e.count,c=t.count,l=-1,u=-1;for(let d=0;d<n;d++){let f=Math.floor(d*s/n),p=Math.floor(d*c/n);et(a,d,e,r[f],f===l),et(o,d,t,i[p],p===u),l=f,u=p}return{a,b:o}}function nt(e,t,n,r,i,a,o,s){let c=t,l=e.count,u=[],d=[0,0,0],f=[0,0,0,1],p=o-(a[0]+1)/2*r,m=(1-a[1])/2*i-s;for(let t=0;t<l;t++){let r=t*3,i=e.pos[r],a=e.pos[r+1],o=e.pos[r+2],s=c[0]*i+c[4]*a+c[8]*o+c[12],l=c[1]*i+c[5]*a+c[9]*o+c[13],h=c[2]*i+c[6]*a+c[10]*o+c[14];if(h<.01)continue;let g=n*s/h,_=n*l/h,v=p-g,y=m-_,b=3*Math.max(e.scale[r],e.scale[r+1],e.scale[r+2])*n/h+1.5;if(v*v+y*y>b*b)continue;let x=rt(e,t,c,n,s,l,h,d,f),S=x[0]+.3,C=x[1],w=x[2]+.3,T=S*w-C*C;if(T<=0)continue;let E=-.5*((w*v*v-2*C*v*y+S*y*y)/T);if(E<-4.5)continue;let D=Math.min(.99,e.color[t*4+3]/255*Math.exp(E));D<1/255||u.push({i:t,z:h,alpha:D,cov2:[S,C,w],screen:[g,_]})}u.sort((e,t)=>e.z-t.z);let h=1,g=null,_=0;for(let e of u){let t=e.alpha*h;if((!g||t>g.share)&&(g={...e,share:t,T:h}),h*=1-e.alpha,_++,h<.001)break}if(!g)return null;let v=g.i,y=e.transform||{center:[0,0,0],scale:1},b=1/y.scale,x=[0,1,2].map(t=>e.pos[v*3+t]*b+y.center[t]),S=[0,1,2].map(t=>e.scale[v*3+t]*b),C=[0,1,2,3].map(t=>e.rot[v*4+t]);return{index:v,mu:x,sd:S,rot:C,sigma:ke(S,C),color:[0,1,2].map(t=>e.color[v*4+t]),opacity:e.color[v*4+3]/255,share:g.share,through:g.T,behind:u.length,layers:_,depth:g.z,cov2:g.cov2,world:[0,1,2].map(t=>e.pos[v*3+t]),worldScale:[0,1,2].map(t=>e.scale[v*3+t])}}function rt(e,t,n,r,i,a,o,s,c){for(let n=0;n<3;n++)s[n]=e.scale[t*3+n];for(let n=0;n<4;n++)c[n]=e.rot[t*4+n];let l=ke(s,c),u=[l[0],l[1],l[2],l[1],l[3],l[4],l[2],l[4],l[5]],d=[n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]],f=o*o,p=[r/o,0,-r*i/f,0,r/o,-r*a/f],m=[0,0,0,0,0,0];for(let e=0;e<2;e++)for(let t=0;t<3;t++)m[e*3+t]=p[e*3]*d[t]+p[e*3+1]*d[3+t]+p[e*3+2]*d[6+t];let h=[0,0,0,0,0,0];for(let e=0;e<2;e++)for(let t=0;t<3;t++)h[e*3+t]=m[e*3]*u[t]+m[e*3+1]*u[3+t]+m[e*3+2]*u[6+t];return[h[0]*m[0]+h[1]*m[1]+h[2]*m[2],h[0]*m[3]+h[1]*m[4]+h[2]*m[5],h[3]*m[3]+h[4]*m[4]+h[5]*m[5]]}function it(e){let t=e>>>0;return function(){t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function at(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0}function ot(e,t){return(Math.imul(e>>>0^at(String(t)),2654435761)^2246822507)>>>0}function st(e){let t=it(e),n=/* @__PURE__ */ new Uint8Array(512),r=/* @__PURE__ */ new Uint8Array(256);for(let e=0;e<256;e++)r[e]=e;for(let e=255;e>0;e--){let n=Math.floor(t()*(e+1)),i=r[e];r[e]=r[n],r[n]=i}for(let e=0;e<512;e++)n[e]=r[e&255];let i=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],a=e=>e*e*e*(e*(e*6-15)+10),o=(e,t,n,r)=>{let a=i[e%12];return a[0]*t+a[1]*n+a[2]*r};function s(e,t,r){let i=Math.floor(e),s=Math.floor(t),c=Math.floor(r);e-=i,t-=s,r-=c;let l=i&255,u=s&255,d=c&255,f=a(e),p=a(t),m=a(r),h=n[l]+u,g=n[h]+d,_=n[h+1]+d,v=n[l+1]+u,y=n[v]+d,b=n[v+1]+d,x=(e,t,n)=>e+n*(t-e);return x(x(x(o(n[g],e,t,r),o(n[y],e-1,t,r),f),x(o(n[_],e,t-1,r),o(n[b],e-1,t-1,r),f),p),x(x(o(n[g+1],e,t,r-1),o(n[y+1],e-1,t,r-1),f),x(o(n[_+1],e,t-1,r-1),o(n[b+1],e-1,t-1,r-1),f),p),m)}return s.fbm=function(e,t,n,r=4){let i=0,a=1,o=0,c=1;for(let l=0;l<r;l++)i+=a*s(e*c,t*c,n*c),o+=a,a*=.5,c*=2.03;return i/o},s}[{id:`sphere`,label:`Sphere`},{id:`blob`,label:`Noise blob`},{id:`torus`,label:`Torus`},{id:`capsule`,label:`Capsule`},{id:`knot`,label:`Knot`}].map(e=>e.id),[{id:`candy`,label:`Candy`,stops:[`#ff5fa2`,`#ffd166`,`#7bdff2`,`#b388ff`],core:`#fff3b0`},{id:`ocean`,label:`Ocean`,stops:[`#03256c`,`#2541b2`,`#1768ac`,`#06bee1`,`#e8fbff`],core:`#ffcf56`},{id:`meadow`,label:`Meadow`,stops:[`#1b4332`,`#40916c`,`#95d5b2`,`#f1faee`],core:`#f4a259`},{id:`sunset`,label:`Sunset`,stops:[`#3d1766`,`#b5179e`,`#f72585`,`#ff9e00`,`#ffdd00`],core:`#fff1c1`},{id:`ink`,label:`Ink`,stops:[`#111111`,`#3a3a3a`,`#8c8c8c`,`#f2f2f2`],core:`#e63b2e`},{id:`neon`,label:`Neon`,stops:[`#00f5d4`,`#00bbf9`,`#9b5de5`,`#f15bb5`,`#fee440`],core:`#ffffff`},{id:`planet`,label:`Planet (tribute)`,stops:[],core:`#ff7b00`},{id:`mars`,label:`Mars (tribute)`,stops:[],core:`#ff7b00`},{id:`moon`,label:`Moon (tribute)`,stops:[],core:`#ff9a3c`},{id:`jupiter`,label:`Jupiter (tribute)`,stops:[],core:`#ffd27a`},{id:`neptune`,label:`Neptune (tribute)`,stops:[],core:`#9fd6ff`},{id:`frosting`,label:`Frosting`,stops:[],core:`#f6dfa4`}].map(e=>e.id),Object.freeze({shape:`blob`,palette:`candy`,seed:1,count:12e4,sizeJitter:.35,roughness:.3,colorNoise:.25});const ct={low:{maxCount:12e4,defaultCount:6e4},mid:{maxCount:24e4,defaultCount:14e4},high:{maxCount:3e5,defaultCount:2e5},max:{maxCount:4e5,defaultCount:28e4}};ct.weak=ct.low,ct.strong=ct.high;const lt=Math.PI*2;var ut=class{constructor(e,{anim:t=!1}={}){this.capacity=e,this.count=0,this.pos=new Float32Array(e*3),this.scale=new Float32Array(e*3),this.rot=new Float32Array(e*4),this.color=new Float32Array(e*4),this.anim=t?new Float32Array(e*4):null}push(e,t,n,r,i){if(this.count>=this.capacity)return-1;let a=this.count++;return i&&this.anim&&(this.anim[a*4]=i[0],this.anim[a*4+1]=i[1],this.anim[a*4+2]=i[2],this.anim[a*4+3]=i[3]),this.pos[a*3]=e[0],this.pos[a*3+1]=e[1],this.pos[a*3+2]=e[2],this.scale[a*3]=t[0],this.scale[a*3+1]=t[1],this.scale[a*3+2]=t[2],this.rot[a*4]=n[0],this.rot[a*4+1]=n[1],this.rot[a*4+2]=n[2],this.rot[a*4+3]=n[3],this.color[a*4]=r[0],this.color[a*4+1]=r[1],this.color[a*4+2]=r[2],this.color[a*4+3]=r[3],a}kill(e){this.scale[e*3]=this.scale[e*3+1]=this.scale[e*3+2]=0,this.color[e*4+3]=0}bounds(){let e=[1/0,1/0,1/0],t=[-1/0,-1/0,-1/0];for(let n=0;n<this.count;n++)if(!(this.color[n*4+3]<=0))for(let r=0;r<3;r++){let i=this.pos[n*3+r];i<e[r]&&(e[r]=i),i>t[r]&&(t[r]=i)}return e[0]===1/0?{min:[-1,-1,-1],max:[1,1,1]}:{min:e,max:t}}};function dt(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function ft(e,t){let n;n=e[2]<-.9999?[1,0,0,0]:pt([-e[1],e[0],0,1+e[2]]);let r=t*.5,i=Math.sin(r);return mt([e[0]*i,e[1]*i,e[2]*i,Math.cos(r)],n)}function pt(e){let t=Math.hypot(e[0],e[1],e[2],e[3])||1;return[e[0]/t,e[1]/t,e[2]/t,e[3]/t]}function mt(e,t){return[e[3]*t[0]+t[3]*e[0]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]+t[3]*e[1]+e[2]*t[0]-e[0]*t[2],e[3]*t[2]+t[3]*e[2]+e[0]*t[1]-e[1]*t[0],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function ht(e){let t=e()*2-1,n=e()*lt,r=Math.sqrt(1-t*t);return[r*Math.cos(n),t,r*Math.sin(n)]}function gt(e){return Math.max(15e3,Math.round(e*.2))}const _t={glslUniforms:``,wgslUniforms:``,glsl:``,wgsl:``},vt=`
uniform vec4 uSpClock;   // x time (s), y splat scale, z exposure, w seed
uniform vec4 uSpToy;     // xyz toy center (world), w radius
uniform vec4 uSpPoke0;   // xyz point, w start time
uniform vec4 uSpPoke1;
uniform vec4 uSpPoke2;
uniform vec4 uSpPoke3;
uniform vec4 uSpPokeP;   // x strength, y wobble
uniform vec4 uSpWind;    // xyz direction (unit), w strength (0 = off)
uniform vec4 uSpWindP;   // x time scale, yzw up axis
uniform vec4 uSpDiss;    // x progress 0..1, y spread, z stagger, w on
uniform vec4 uSpDrop;    // xyz gravity direction (unit), w seconds since the drop
uniform vec4 uSpDropP;   // x floor distance, y recall 0..1, z on, w restitution
uniform vec4 uSpDropQ;   // x scatter
uniform vec4 uSpMag;     // xyz point, w intensity 0..1
uniform vec4 uSpMagP;    // x strength -1..1, y radius (world)
uniform vec4 uSpGrab;    // xyz grabbed point, w radius (world)
uniform vec4 uSpGrabD;   // xyz how far it is pulled, w on
uniform vec4 uSpTwist;   // xyz axis (unit), w angle across the toy (radians)
uniform vec4 uSpSlice;   // xyz plane normal, w offset (world)
uniform vec4 uSpSliceP;  // x on, y glow width (world)
uniform vec4 uSpAccent;  // rgb accent color
uniform vec4 uSpBodyQ;   // whole-toy rotation (quaternion x, y, z, w)
uniform vec4 uSpBodyT;   // xyz whole-toy offset, w squash (+ flattens, - stretches)
uniform vec4 uSpBodyF;   // x floor distance below the toy center
uniform vec4 uSpBodyS;   // Hands-on squish (lane Physics): xyz axis, w amount (+ flattens)
uniform vec4 uSpBodyP;   // xyz the squish's pivot, where it touched
uniform vec4 uSpPoseQ;   // Any pose: the toy's turn in Hands-on (quaternion; src/effects-pose.js)
uniform vec4 uSpPoseT;   // xyz where its pivot is now, w on (0: upright at home)
uniform vec4 uSpPoseC;   // xyz its pivot at home
uniform vec4 uSpPoseUp;  // xyz the world's up in the toy's home frame, w the floor's distance below its center along it
uniform vec4 uSpPat;     // x on, y projection (0 wrap, 1 front, 2 globe), z repeats, w amount
uniform vec4 uSpPatB;    // x keep detail, y half height, z mean luminance, w half width
uniform sampler2D uSpPattern;
__KIT_UNIFORMS__
__KIT_PHOTO_UNIFORMS__
vec3 spHome = vec3(0.0);
vec3 spRest = vec3(0.0);
float spKitScale = 1.0;
float spFade = 1.0;
float spBright = 1.0;
vec3 spTint = vec3(0.0);
float spFlame = -1.0;
float spNoPat = 0.0;
float spPhotoBit = 0.0; // Photo fidelity: a photo-textured splat (src/photo-splats.js)
vec4 spBodyQ = vec4(0.0, 0.0, 0.0, 1.0);
vec4 spPartQ = vec4(0.0, 0.0, 0.0, 1.0);
float spCut = 0.0;
float spShrink = 0.0;
float spStretch = 0.0; // lane Hands engine C: how much the grab spreads splats here
float spLanded = 0.0;
float spShade = 0.0;
float spGlow = 0.0;
vec4 spRecol = vec4(0.0);
float spRecolK = 0.0;
vec4 spTwistQ = vec4(0.0, 0.0, 0.0, 1.0);

float spHash(uint n) {
  n = n ^ (uint(uSpClock.w) * 2654435761u);
  n = (n << 13u) ^ n;
  n = n * (n * n * 15731u + 789221u) + 1376312589u;
  return float(n & 0x7fffffffu) / 2147483647.0;
}

vec3 spHash3(uint n) {
  return vec3(spHash(n * 3u + 1u), spHash(n * 3u + 2u), spHash(n * 3u + 3u)) * 2.0 - 1.0;
}

vec3 spRotate(vec3 v, vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

vec4 spQuatMul(vec4 a, vec4 b) {
  return vec4(a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz), a.w * b.w - dot(a.xyz, b.xyz));
}

vec3 spQuatRotate(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

// Lane Any pose: a world point in the toy's home frame (where every effect
// is worked out), and back into its Hands-on pose (src/effects-pose.js).
vec3 spPoseIn(vec3 p) {
  return uSpPoseC.xyz + spQuatRotate(vec4(-uSpPoseQ.xyz, uSpPoseQ.w), p - uSpPoseT.xyz);
}

vec3 spPoseOut(vec3 p) {
  return uSpPoseT.xyz + spQuatRotate(uSpPoseQ, p - uSpPoseC.xyz);
}

// Whole-toy motion (bounce, spin, wobble, float): squash about the floor,
// rotate about the center, then move.
vec3 spBody(vec3 p) {
  vec4 q = uSpBodyQ;
  if (q.w == 0.0 && dot(q.xyz, q.xyz) == 0.0) q = vec4(0.0, 0.0, 0.0, 1.0);
  vec3 toy = uSpToy.xyz;
  vec3 rel = p - toy;
  float s = uSpBodyT.w;
  if (s != 0.0) {
    float f = uSpBodyF.x;
    rel = vec3(rel.x * (1.0 + 0.5 * s), (rel.y + f) * (1.0 - s) - f, rel.z * (1.0 + 0.5 * s));
  }
  spBodyQ = q;
  vec3 out3 = toy + spQuatRotate(q, rel) + uSpBodyT.xyz;
  // Lane Physics: a toy tossed in Hands-on squishes where it lands.
  float hs = uSpBodyS.w;
  if (hs != 0.0) {
    vec3 a = uSpBodyS.xyz;
    vec3 v = out3 - uSpBodyP.xyz;
    float h = dot(v, a);
    out3 = uSpBodyP.xyz + (v - a * h) * (1.0 + 0.5 * hs) + a * h * (1.0 - hs);
  }
  return out3;
}

// The pattern layer: a 2D design wrapped around the toy's rest pose.
vec3 spPattern(vec3 rgb) {
  vec3 q = spRest - uSpToy.xyz;
  vec2 uv;
  if (uSpPat.y < 0.5) {
    uv = vec2(atan(q.x, q.z) / 6.2831853 * uSpPat.z + 0.5, 0.5 - q.y / (2.0 * uSpPatB.y));
  } else if (uSpPat.y < 1.5) {
    uv = vec2(0.5 + q.x / (2.0 * uSpPatB.w), 0.5 - q.y / (2.0 * uSpPatB.y));
  } else if (uSpPat.y < 2.5) {
    vec3 d = normalize(q + vec3(1e-6));
    uv = vec2(atan(d.x, d.z) / 6.2831853 * uSpPat.z + 0.5, acos(clamp(d.y, -1.0, 1.0)) / 3.1415927);
  } else {
    // Top: seen from above, the design's top edge at the far side.
    uv = vec2(0.5 + q.x / (2.0 * uSpPatB.w), 0.5 + q.z / (2.0 * uSpPatB.y));
  }
  vec4 pc = textureLod(uSpPattern, uv, 0.0);
  float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
  float shade = mix(1.0, clamp(lum / max(uSpPatB.z, 0.05), 0.3, 1.7), uSpPatB.x);
  return mix(rgb, pc.rgb * shade, uSpPat.w * pc.a);
}
__KIT_FUNCTIONS__
vec3 spPoke(vec4 poke, vec3 home) {
  float age = uSpClock.x - poke.w;
  if (age < 0.0 || age > 6.0) return vec3(0.0);
  float R = uSpToy.w;
  float rn = distance(home, poke.xyz) / R;
  float k = mix(8.0, 18.0, uSpPokeP.y);
  float w = mix(9.0, 16.0, uSpPokeP.y);
  float damp = mix(2.4, 0.9, uSpPokeP.y);
  float front = smoothstep(0.0, 0.12, age * w / k - rn);
  float env = exp(-age * damp) * exp(-rn * 2.2) * front;
  float wave = sin(rn * k - age * w) * env;
  float slope = cos(rn * k - age * w) * env;
  float dent = exp(-rn * rn * 45.0) * exp(-age * 6.0);
  vec3 nrm = normalize(poke.xyz - uSpToy.xyz + vec3(1e-5));
  vec3 away = home - poke.xyz;
  away = normalize(away - nrm * dot(away, nrm) + vec3(1e-5));
  // Fake shading so the rings read even when they move along the view.
  spShade += (slope * 0.5 - dent * 0.6) * uSpPokeP.x;
  return (nrm * (wave * 0.07 - dent * 0.1) + away * (slope * 0.05 + dent * 0.06)) * uSpPokeP.x * R;
}

vec3 spWind(vec3 home) {
  float s = uSpWind.w;
  float R = uSpToy.w;
  vec3 up = uSpWindP.yzw;
  vec3 rel = (home - uSpToy.xyz) / R;
  float tip = smoothstep(-1.1, 1.0, dot(rel, up));
  tip *= tip;
  float t = uSpClock.x * uSpWindP.x;
  float phase = dot(rel, uSpWind.xyz) * 2.2 + dot(rel, up) * 1.3;
  float gust = 0.6 + 0.4 * sin(t * 1.3 - phase) * sin(t * 0.37 + 1.7);
  float sway = s * tip * (0.65 * gust + 0.22 * sin(t * 3.1 - phase * 2.0));
  float h = spHash(splat.index * 5u + 11u);
  vec3 side = normalize(cross(up, uSpWind.xyz) + vec3(1e-5));
  float flutter = s * sin(t * 11.0 + h * 6.2832) * (0.25 + tip);
  return (uSpWind.xyz * sway * 0.24 + side * flutter * 0.012 - up * sway * sway * 0.06) * R;
}

void modifySplatCenter(inout vec3 center) {
  if (uSpPoseT.w > 0.5) center = spPoseIn(center); // lane Any pose
  spRest = center;
  __KIT_CENTER__
  center = spBody(center);
  vec3 toy = uSpToy.xyz;
  float R = uSpToy.w;
  vec3 home = center;
  spHome = home;
  vec3 p = home;
  uint idx = splat.index;

  if (uSpTwist.w != 0.0) {
    vec3 a = uSpTwist.xyz;
    float ang = uSpTwist.w * dot(home - toy, a) / R;
    p = toy + spRotate(p - toy, a, ang);
    spTwistQ = vec4(a * sin(ang * 0.5), cos(ang * 0.5));
  }

  if (uSpWind.w > 0.0) p += spWind(home);

  if (uSpPokeP.x > 0.0) {
    p += spPoke(uSpPoke0, home) + spPoke(uSpPoke1, home) + spPoke(uSpPoke2, home) + spPoke(uSpPoke3, home);
  }

  if (uSpMag.w > 0.001) {
    vec3 d = p - uSpMag.xyz;
    float rad = max(uSpMagP.y, 1e-3);
    float f = uSpMag.w * exp(-dot(d, d) / (rad * rad) * 1.6);
    if (uSpMagP.x >= 0.0) {
      p = mix(p, uSpMag.xyz + d * 0.12, f * uSpMagP.x);
    } else {
      p += normalize(d + vec3(1e-5)) * (-uSpMagP.x) * rad * 1.1 * f;
    }
    spGlow = f * abs(uSpMagP.x);
  }

  // Grab (drag-to-stretch): splats near the grabbed point follow the pull,
  // fading with distance, so the toy stretches; it springs back on release.
  if (uSpGrabD.w > 0.5) {
    vec3 d = home - uSpGrab.xyz;
    float rad = max(uSpGrab.w, 1e-3);
    float gf = exp(-dot(d, d) / (rad * rad) * 1.5);
    p += uSpGrabD.xyz * gf;
    // Lane Hands engine C: splats grow where the pull spreads them apart, so
    // a stretched toy stays solid (no gaps, no speckle).
    spStretch = min(1.5, length(uSpGrabD.xyz) * gf * 3.0 * length(d) / (rad * rad)) * 0.6;
  }

  if (uSpDiss.w > 0.5) {
    float h = spHash(idx * 7u + 5u);
    float st = uSpDiss.z;
    float local = clamp(uSpDiss.x * (1.0 + st) - st * h, 0.0, 1.0);
    local = local * local * (3.0 - 2.0 * local);
    vec3 rel = home - toy;
    vec3 dir = normalize(spHash3(idx) + normalize(rel + vec3(1e-4)) * 0.9);
    vec3 dest = home + dir * R * uSpDiss.y * (0.4 + 0.8 * spHash(idx * 11u + 3u));
    dest = toy + spRotate(dest - toy, uSpWindP.yzw, local * 1.4);
    p = mix(p, dest, local);
    spShrink = local;
  }

  if (uSpDropP.z > 0.5) {
    vec3 g = uSpDrop.xyz;
    vec3 rel = p - toy;
    float rest = spHash(idx * 13u + 3u) * 0.06 * R;
    float h = max(0.0, uSpDropP.x - rest - dot(rel, g));
    float t = max(0.0, uSpDrop.w - spHash(idx * 17u + 1u) * 0.12);
    float acc = 7.0 * R;
    float t0 = sqrt(2.0 * h / acc);
    float fall;
    float landed = 0.0;
    if (t < t0) {
      fall = 0.5 * acc * t * t;
    } else {
      float e = uSpDropP.w;
      float v = acc * t0 * e;
      float tt = t - t0;
      fall = h;
      landed = 1.0;
      for (int k = 0; k < 6; k++) {
        float T = 2.0 * v / acc;
        if (tt < T) {
          fall = h - (v * tt - 0.5 * acc * tt * tt);
          landed = 0.4;
          break;
        }
        tt -= T;
        v *= e;
      }
    }
    float tl = max(0.0, t - t0);
    vec3 perp = rel - g * dot(rel, g);
    vec3 rnd = spHash3(idx * 19u + 7u);
    rnd -= g * dot(rnd, g);
    vec3 lat = (normalize(perp + vec3(1e-4)) * 0.7 + rnd * 0.6) * (0.2 + 0.8 * spHash(idx * 23u + 9u));
    lat *= uSpDropQ.x * sqrt(max(h, 0.0) * R) * 0.9;
    vec3 dropped = p + g * fall + lat * (1.0 - exp(-2.2 * tl));
    float r = uSpDropP.y;
    r = r * r * (3.0 - 2.0 * r);
    p = mix(dropped, p, r);
    spLanded = landed * (1.0 - r);
  }

  if (uSpSliceP.x > 0.5) {
    float side = dot(home - toy, uSpSlice.xyz) - uSpSlice.w;
    spCut = side > 0.0 ? 1.0 : 0.0;
  }

  center = uSpPoseT.w > 0.5 ? spPoseOut(p) : p; // lane Any pose
}

void modifySplatRotationScale(vec3 originalCenter, vec3 modifiedCenter, inout vec4 rotation, inout vec3 scale) {
  if (uSpPoseT.w > 0.5) {
    // Lane Any pose: the effects' turns are in the toy's home frame.
    vec4 fx = spQuatMul(spTwistQ, spQuatMul(spBodyQ, spPartQ));
    fx = spQuatMul(uSpPoseQ, spQuatMul(fx, vec4(-uSpPoseQ.xyz, uSpPoseQ.w)));
    rotation = spQuatMul(fx, rotation);
  } else {
    rotation = spQuatMul(spTwistQ, spQuatMul(spBodyQ, spQuatMul(spPartQ, rotation)));
  }
  scale *= uSpClock.y * spKitScale * (1.0 - 0.45 * spShrink) * (1.0 + 0.3 * spLanded) * (1.0 + spStretch);
  if (spCut > 0.5) scale = vec3(0.0);
}

void modifySplatColor(vec3 center, inout vec4 color) {
  __KIT_COLOR__
  __KIT_PHOTO__
  if (uSpPat.x > 0.5 && spNoPat < 0.5) color.rgb = spPattern(color.rgb);
  if (spFlame >= 0.0) {
    color.rgb = mix(color.rgb, vec3(1.0, 0.36, 0.06), smoothstep(0.08, 0.6, spFlame));
    color.rgb *= 1.0 - 0.45 * smoothstep(0.5, 1.0, spFlame);
  }
  vec4 paint = loadPaintColor();
  if (spRecol.a > 0.0) {
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 kept = spRecol.rgb * (lum / max(dot(spRecol.rgb, vec3(0.299, 0.587, 0.114)), 0.02));
    color.rgb = mix(color.rgb, mix(spRecol.rgb, kept, spRecolK), clamp(spRecol.a, 0.0, 1.0));
  }
  color.rgb = color.rgb * (1.0 - paint.a) + paint.rgb;
  if (uSpSliceP.x > 0.5) {
    float side = dot((uSpPoseT.w > 0.5 ? spPoseIn(center) : center) - uSpToy.xyz, uSpSlice.xyz) - uSpSlice.w;
    float glow = side > 0.0 ? 0.0 : 1.0 - smoothstep(0.0, uSpSliceP.y, -side);
    color.rgb = mix(color.rgb, uSpAccent.rgb, glow * 0.85);
    if (side > 0.0) color.a = 0.0;
  }
  color.rgb = mix(color.rgb, uSpAccent.rgb, clamp(spGlow, 0.0, 1.0) * 0.35);
  color.rgb = color.rgb * spBright + spTint;
  color.a *= spFade;
  color.rgb *= uSpClock.z * (1.0 + clamp(spShade, -0.6, 0.6));
}
`,yt=`
uniform uSpClock: vec4f;
uniform uSpToy: vec4f;
uniform uSpPoke0: vec4f;
uniform uSpPoke1: vec4f;
uniform uSpPoke2: vec4f;
uniform uSpPoke3: vec4f;
uniform uSpPokeP: vec4f;
uniform uSpWind: vec4f;
uniform uSpWindP: vec4f;
uniform uSpDiss: vec4f;
uniform uSpDrop: vec4f;
uniform uSpDropP: vec4f;
uniform uSpDropQ: vec4f;
uniform uSpMag: vec4f;
uniform uSpMagP: vec4f;
uniform uSpGrab: vec4f;
uniform uSpGrabD: vec4f;
uniform uSpTwist: vec4f;
uniform uSpSlice: vec4f;
uniform uSpSliceP: vec4f;
uniform uSpAccent: vec4f;
uniform uSpBodyQ: vec4f;
uniform uSpBodyT: vec4f;
uniform uSpBodyF: vec4f;
uniform uSpBodyS: vec4f;
uniform uSpBodyP: vec4f;
uniform uSpPoseQ: vec4f;
uniform uSpPoseT: vec4f;
uniform uSpPoseC: vec4f;
uniform uSpPoseUp: vec4f;
uniform uSpPat: vec4f;
uniform uSpPatB: vec4f;
var uSpPattern: texture_2d<f32>;
var uSpPatternSampler: sampler;
__KIT_UNIFORMS__
__KIT_PHOTO_UNIFORMS__
var<private> spRest: vec3f = vec3f(0.0);
var<private> spKitScale: f32 = 1.0;
var<private> spFade: f32 = 1.0;
var<private> spBright: f32 = 1.0;
var<private> spTint: vec3f = vec3f(0.0);
var<private> spFlame: f32 = -1.0;
var<private> spNoPat: f32 = 0.0;
var<private> spPhotoBit: f32 = 0.0; // Photo fidelity (src/photo-splats.js)
var<private> spBodyQ: vec4f = vec4f(0.0, 0.0, 0.0, 1.0);
var<private> spPartQ: vec4f = vec4f(0.0, 0.0, 0.0, 1.0);
var<private> spCut: f32 = 0.0;
var<private> spShrink: f32 = 0.0;
var<private> spStretch: f32 = 0.0; // lane Hands engine C
var<private> spLanded: f32 = 0.0;
var<private> spShade: f32 = 0.0;
var<private> spGlow: f32 = 0.0;
var<private> spRecol: vec4f = vec4f(0.0);
var<private> spRecolK: f32 = 0.0;
var<private> spTwistQ: vec4f = vec4f(0.0, 0.0, 0.0, 1.0);

fn spHash(m: u32) -> f32 {
  var n = m ^ (u32(uniform.uSpClock.w) * 2654435761u);
  n = (n << 13u) ^ n;
  n = n * (n * n * 15731u + 789221u) + 1376312589u;
  return f32(n & 0x7fffffffu) / 2147483647.0;
}

fn spHash3(n: u32) -> vec3f {
  return vec3f(spHash(n * 3u + 1u), spHash(n * 3u + 2u), spHash(n * 3u + 3u)) * 2.0 - vec3f(1.0);
}

fn spRotate(v: vec3f, axis: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

fn spQuatMul(a: vec4f, b: vec4f) -> vec4f {
  return vec4f(a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz), a.w * b.w - dot(a.xyz, b.xyz));
}

fn spQuatRotate(q: vec4f, v: vec3f) -> vec3f {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

// Lane Any pose: a world point in the toy's home frame, and back.
fn spPoseIn(p: vec3f) -> vec3f {
  return uniform.uSpPoseC.xyz + spQuatRotate(vec4f(-uniform.uSpPoseQ.xyz, uniform.uSpPoseQ.w), p - uniform.uSpPoseT.xyz);
}

fn spPoseOut(p: vec3f) -> vec3f {
  return uniform.uSpPoseT.xyz + spQuatRotate(uniform.uSpPoseQ, p - uniform.uSpPoseC.xyz);
}

fn spBody(p: vec3f) -> vec3f {
  var q = uniform.uSpBodyQ;
  if (q.w == 0.0 && dot(q.xyz, q.xyz) == 0.0) { q = vec4f(0.0, 0.0, 0.0, 1.0); }
  let toy = uniform.uSpToy.xyz;
  var rel = p - toy;
  let s = uniform.uSpBodyT.w;
  if (s != 0.0) {
    let f = uniform.uSpBodyF.x;
    rel = vec3f(rel.x * (1.0 + 0.5 * s), (rel.y + f) * (1.0 - s) - f, rel.z * (1.0 + 0.5 * s));
  }
  spBodyQ = q;
  var out3 = toy + spQuatRotate(q, rel) + uniform.uSpBodyT.xyz;
  // Lane Physics: a toy tossed in Hands-on squishes where it lands.
  let hs = uniform.uSpBodyS.w;
  if (hs != 0.0) {
    let a = uniform.uSpBodyS.xyz;
    let v = out3 - uniform.uSpBodyP.xyz;
    let h = dot(v, a);
    out3 = uniform.uSpBodyP.xyz + (v - a * h) * (1.0 + 0.5 * hs) + a * h * (1.0 - hs);
  }
  return out3;
}

fn spPattern(rgb: vec3f) -> vec3f {
  let q = spRest - uniform.uSpToy.xyz;
  var uv: vec2f;
  if (uniform.uSpPat.y < 0.5) {
    uv = vec2f(atan2(q.x, q.z) / 6.2831853 * uniform.uSpPat.z + 0.5, 0.5 - q.y / (2.0 * uniform.uSpPatB.y));
  } else if (uniform.uSpPat.y < 1.5) {
    uv = vec2f(0.5 + q.x / (2.0 * uniform.uSpPatB.w), 0.5 - q.y / (2.0 * uniform.uSpPatB.y));
  } else if (uniform.uSpPat.y < 2.5) {
    let d = normalize(q + vec3f(1e-6));
    uv = vec2f(atan2(d.x, d.z) / 6.2831853 * uniform.uSpPat.z + 0.5, acos(clamp(d.y, -1.0, 1.0)) / 3.1415927);
  } else {
    uv = vec2f(0.5 + q.x / (2.0 * uniform.uSpPatB.w), 0.5 + q.z / (2.0 * uniform.uSpPatB.y));
  }
  let pc = textureSampleLevel(uSpPattern, uSpPatternSampler, uv, 0.0);
  let lum = dot(rgb, vec3f(0.299, 0.587, 0.114));
  let shade = mix(1.0, clamp(lum / max(uniform.uSpPatB.z, 0.05), 0.3, 1.7), uniform.uSpPatB.x);
  return mix(rgb, pc.rgb * shade, uniform.uSpPat.w * pc.a);
}
__KIT_FUNCTIONS__
fn spPoke(poke: vec4f, home: vec3f) -> vec3f {
  let age = uniform.uSpClock.x - poke.w;
  if (age < 0.0 || age > 6.0) { return vec3f(0.0); }
  let R = uniform.uSpToy.w;
  let rn = distance(home, poke.xyz) / R;
  let k = mix(8.0, 18.0, uniform.uSpPokeP.y);
  let w = mix(9.0, 16.0, uniform.uSpPokeP.y);
  let damp = mix(2.4, 0.9, uniform.uSpPokeP.y);
  let front = smoothstep(0.0, 0.12, age * w / k - rn);
  let env = exp(-age * damp) * exp(-rn * 2.2) * front;
  let wave = sin(rn * k - age * w) * env;
  let slope = cos(rn * k - age * w) * env;
  let dent = exp(-rn * rn * 45.0) * exp(-age * 6.0);
  let nrm = normalize(poke.xyz - uniform.uSpToy.xyz + vec3f(1e-5));
  var away = home - poke.xyz;
  away = normalize(away - nrm * dot(away, nrm) + vec3f(1e-5));
  spShade = spShade + (slope * 0.5 - dent * 0.6) * uniform.uSpPokeP.x;
  return (nrm * (wave * 0.07 - dent * 0.1) + away * (slope * 0.05 + dent * 0.06)) * uniform.uSpPokeP.x * R;
}

fn spWind(home: vec3f) -> vec3f {
  let s = uniform.uSpWind.w;
  let R = uniform.uSpToy.w;
  let up = uniform.uSpWindP.yzw;
  let rel = (home - uniform.uSpToy.xyz) / R;
  var tip = smoothstep(-1.1, 1.0, dot(rel, up));
  tip = tip * tip;
  let t = uniform.uSpClock.x * uniform.uSpWindP.x;
  let phase = dot(rel, uniform.uSpWind.xyz) * 2.2 + dot(rel, up) * 1.3;
  let gust = 0.6 + 0.4 * sin(t * 1.3 - phase) * sin(t * 0.37 + 1.7);
  let sway = s * tip * (0.65 * gust + 0.22 * sin(t * 3.1 - phase * 2.0));
  let h = spHash(splat.index * 5u + 11u);
  let side = normalize(cross(up, uniform.uSpWind.xyz) + vec3f(1e-5));
  let flutter = s * sin(t * 11.0 + h * 6.2832) * (0.25 + tip);
  return (uniform.uSpWind.xyz * sway * 0.24 + side * flutter * 0.012 - up * sway * sway * 0.06) * R;
}

fn modifySplatCenter(center: ptr<function, vec3f>) {
  if (uniform.uSpPoseT.w > 0.5) { *center = spPoseIn(*center); } // lane Any pose
  spRest = *center;
  __KIT_CENTER__
  *center = spBody(*center);
  let toy = uniform.uSpToy.xyz;
  let R = uniform.uSpToy.w;
  let home = *center;
  var p = home;
  let idx = splat.index;

  if (uniform.uSpTwist.w != 0.0) {
    let a = uniform.uSpTwist.xyz;
    let ang = uniform.uSpTwist.w * dot(home - toy, a) / R;
    p = toy + spRotate(p - toy, a, ang);
    spTwistQ = vec4f(a * sin(ang * 0.5), cos(ang * 0.5));
  }

  if (uniform.uSpWind.w > 0.0) { p = p + spWind(home); }

  if (uniform.uSpPokeP.x > 0.0) {
    p = p + spPoke(uniform.uSpPoke0, home) + spPoke(uniform.uSpPoke1, home) + spPoke(uniform.uSpPoke2, home) + spPoke(uniform.uSpPoke3, home);
  }

  if (uniform.uSpMag.w > 0.001) {
    let d = p - uniform.uSpMag.xyz;
    let rad = max(uniform.uSpMagP.y, 1e-3);
    let f = uniform.uSpMag.w * exp(-dot(d, d) / (rad * rad) * 1.6);
    if (uniform.uSpMagP.x >= 0.0) {
      p = mix(p, uniform.uSpMag.xyz + d * 0.12, f * uniform.uSpMagP.x);
    } else {
      p = p + normalize(d + vec3f(1e-5)) * (-uniform.uSpMagP.x) * rad * 1.1 * f;
    }
    spGlow = f * abs(uniform.uSpMagP.x);
  }

  if (uniform.uSpGrabD.w > 0.5) {
    let d = home - uniform.uSpGrab.xyz;
    let rad = max(uniform.uSpGrab.w, 1e-3);
    let gf = exp(-dot(d, d) / (rad * rad) * 1.5);
    p = p + uniform.uSpGrabD.xyz * gf;
    spStretch = min(1.5, length(uniform.uSpGrabD.xyz) * gf * 3.0 * length(d) / (rad * rad)) * 0.6;
  }

  if (uniform.uSpDiss.w > 0.5) {
    let h = spHash(idx * 7u + 5u);
    let st = uniform.uSpDiss.z;
    var local = clamp(uniform.uSpDiss.x * (1.0 + st) - st * h, 0.0, 1.0);
    local = local * local * (3.0 - 2.0 * local);
    let rel = home - toy;
    let dir = normalize(spHash3(idx) + normalize(rel + vec3f(1e-4)) * 0.9);
    var dest = home + dir * R * uniform.uSpDiss.y * (0.4 + 0.8 * spHash(idx * 11u + 3u));
    dest = toy + spRotate(dest - toy, uniform.uSpWindP.yzw, local * 1.4);
    p = mix(p, dest, local);
    spShrink = local;
  }

  if (uniform.uSpDropP.z > 0.5) {
    let g = uniform.uSpDrop.xyz;
    let rel = p - toy;
    let rest = spHash(idx * 13u + 3u) * 0.06 * R;
    let h = max(0.0, uniform.uSpDropP.x - rest - dot(rel, g));
    let t = max(0.0, uniform.uSpDrop.w - spHash(idx * 17u + 1u) * 0.12);
    let acc = 7.0 * R;
    let t0 = sqrt(2.0 * h / acc);
    var fall: f32;
    var landed: f32 = 0.0;
    if (t < t0) {
      fall = 0.5 * acc * t * t;
    } else {
      let e = uniform.uSpDropP.w;
      var v = acc * t0 * e;
      var tt = t - t0;
      fall = h;
      landed = 1.0;
      for (var k: i32 = 0; k < 6; k = k + 1) {
        let T = 2.0 * v / acc;
        if (tt < T) {
          fall = h - (v * tt - 0.5 * acc * tt * tt);
          landed = 0.4;
          break;
        }
        tt = tt - T;
        v = v * e;
      }
    }
    let tl = max(0.0, t - t0);
    let perp = rel - g * dot(rel, g);
    var rnd = spHash3(idx * 19u + 7u);
    rnd = rnd - g * dot(rnd, g);
    var lat = (normalize(perp + vec3f(1e-4)) * 0.7 + rnd * 0.6) * (0.2 + 0.8 * spHash(idx * 23u + 9u));
    lat = lat * uniform.uSpDropQ.x * sqrt(max(h, 0.0) * R) * 0.9;
    let dropped = p + g * fall + lat * (1.0 - exp(-2.2 * tl));
    var r = uniform.uSpDropP.y;
    r = r * r * (3.0 - 2.0 * r);
    p = mix(dropped, p, r);
    spLanded = landed * (1.0 - r);
  }

  if (uniform.uSpSliceP.x > 0.5) {
    let side = dot(home - toy, uniform.uSpSlice.xyz) - uniform.uSpSlice.w;
    spCut = select(0.0, 1.0, side > 0.0);
  }

  *center = p;
  if (uniform.uSpPoseT.w > 0.5) { *center = spPoseOut(p); } // lane Any pose
}

fn modifySplatRotationScale(originalCenter: vec3f, modifiedCenter: vec3f, rotation: ptr<function, vec4f>, scale: ptr<function, vec3f>) {
  if (uniform.uSpPoseT.w > 0.5) {
    // Lane Any pose: the effects' turns are in the toy's home frame.
    var fx = spQuatMul(spTwistQ, spQuatMul(spBodyQ, spPartQ));
    fx = spQuatMul(uniform.uSpPoseQ, spQuatMul(fx, vec4f(-uniform.uSpPoseQ.xyz, uniform.uSpPoseQ.w)));
    *rotation = spQuatMul(fx, *rotation);
  } else {
    *rotation = spQuatMul(spTwistQ, spQuatMul(spBodyQ, spQuatMul(spPartQ, *rotation)));
  }
  *scale = *scale * (uniform.uSpClock.y * spKitScale * (1.0 - 0.45 * spShrink) * (1.0 + 0.3 * spLanded) * (1.0 + spStretch));
  if (spCut > 0.5) { *scale = vec3f(0.0); }
}

fn modifySplatColor(center: vec3f, color: ptr<function, vec4f>) {
  var base = (*color).rgb;
  __KIT_COLOR__
  __KIT_PHOTO__
  if (uniform.uSpPat.x > 0.5 && spNoPat < 0.5) { base = spPattern(base); }
  if (spFlame >= 0.0) {
    base = mix(base, vec3f(1.0, 0.36, 0.06), smoothstep(0.08, 0.6, spFlame));
    base = base * (1.0 - 0.45 * smoothstep(0.5, 1.0, spFlame));
  }
  if (spRecol.a > 0.0) {
    let lum = dot(base, vec3f(0.299, 0.587, 0.114));
    let kept = spRecol.rgb * (lum / max(dot(spRecol.rgb, vec3f(0.299, 0.587, 0.114)), 0.02));
    base = mix(base, mix(spRecol.rgb, kept, spRecolK), clamp(spRecol.a, 0.0, 1.0));
  }
  let paint = loadPaintColor();
  var rgb = base * (1.0 - paint.a) + paint.rgb;
  var a = (*color).a;
  if (uniform.uSpSliceP.x > 0.5) {
    let side = dot(select(center, spPoseIn(center), uniform.uSpPoseT.w > 0.5) - uniform.uSpToy.xyz, uniform.uSpSlice.xyz) - uniform.uSpSlice.w;
    let glow = select(1.0 - smoothstep(0.0, uniform.uSpSliceP.y, -side), 0.0, side > 0.0);
    rgb = mix(rgb, uniform.uSpAccent.rgb, glow * 0.85);
    if (side > 0.0) { a = 0.0; }
  }
  rgb = mix(rgb, uniform.uSpAccent.rgb, clamp(spGlow, 0.0, 1.0) * 0.35);
  rgb = rgb * spBright + spTint;
  a = a * spFade;
  *color = vec4f(rgb * uniform.uSpClock.z * (1.0 + clamp(spShade, -0.6, 0.6)), a);
}
`,F={none:0,orbit:1,beat:2,breathe:3,flame:4,rise:5,fall:6,twinkle:7,sway:8,grow:9,melt:10,pulse:11,wave:12,glint:13,token:14,screen:15,key:16,morph:17,band:18,fade:19,skin:20,leaf:21,lever:22,rim:23,relief:24,skin4:25,volume:26},bt=`
float spBeat(float x) {
  float f = fract(x);
  return exp(-pow((f - 0.12) * 18.0, 2.0)) + 0.6 * exp(-pow((f - 0.34) * 16.0, 2.0));
}

// One of the four channels of uSpMorph.
float spChan(float ch) {
  return dot(uSpMorph, step(abs(vec4(0.0, 1.0, 2.0, 3.0) - ch), vec4(0.5)));
}

vec3 spKitCenter(vec3 p) {
  vec4 an = loadSplatAnim();
  int pk = int(an.x + 0.5);
  int part = pk & 15;
  spNoPat = float((pk >> 4) & 1);
  spPhotoBit = float((pk >> 5) & 1);
  int kind = int(an.y + 0.5);
  vec3 toy = uSpToy.xyz;
  float R = uSpToy.w;
  vec3 up = vec3(0.0, 1.0, 0.0);
  // Lane Any pose: the world's real up, for what rises or falls (a flame,
  // embers, snow) in a toy lying on its side.
  vec3 gup = uSpPoseT.w > 0.5 ? uSpPoseUp.xyz : up;
  float t = uSpKit.x * uSpKit.z;
  float amt = uSpKitB.z;
  if (uSpKit.y > 0.5 && kind > 0) {
    float h = spHash(splat.index * 29u + 7u);
    vec3 rel = p - toy;
    if (kind == 1) {
      float r = length(rel.xz);
      float w = an.z * pow(max(r, 0.04 * R) / R, -an.w);
      p = toy + spRotate(rel, up, t * w);
    } else if (kind == 2) {
      p = toy + rel * (1.0 + amt * an.z * spBeat(t * 1.1 + an.w));
    } else if (kind == 3) {
      p = toy + rel * (1.0 + amt * an.z * sin(t * 1.3 + an.w));
    } else if (kind == 4 || kind == 5) {
      bool flame = kind == 4;
      float c = fract(t * (0.6 + 0.5 * h) * (flame ? 1.4 : 0.35) + an.w + h);
      float travel = amt * an.z * R;
      vec3 side = vec3(sin(t * 3.0 + h * 17.0), 0.0, cos(t * 2.3 + h * 11.0));
      p += gup * c * travel + (side - gup * dot(side, gup)) * (flame ? 0.07 : 0.22) * c * travel;
      spFade = smoothstep(0.0, 0.1, c) * (1.0 - smoothstep(0.55, 1.0, c));
      spKitScale = flame ? mix(1.0, 0.3, c) : mix(0.7, 1.25, c);
      if (flame) spFlame = c;
    } else if (kind == 6) {
      float c = fract(t * (0.72 + 0.25 * h) + an.w);
      p -= gup * c * an.z * R;
      spFade = smoothstep(0.0, 0.08, c) * (1.0 - smoothstep(0.85, 1.0, c));
    } else if (kind == 7) {
      spBright = 1.0 + amt * an.z * sin(t * (2.0 + 3.0 * h) + 6.2832 * h + an.w);
    } else if (kind == 8) {
      float k = max(0.0, dot(rel, up) - an.w) / R;
      vec3 d = vec3(sin(t * 1.3 + rel.x * 1.7 / R + rel.z * 1.1 / R), 0.0, 0.6 * cos(t * 1.1 + rel.z * 1.9 / R));
      p += d * amt * an.z * k * k * R;
    } else if (kind == 9) {
      spKitScale = smoothstep(an.z, an.z + 0.08, uSpKitB.x);
    } else if (kind == 10) {
      float m = clamp(uSpKit.w * an.z, 0.0, 1.0);
      float f = uSpKitB.y;
      float hgt = max(0.0, rel.y + f);
      float nh = hgt * (1.0 - m * (0.82 + 0.15 * h));
      float spread = 1.0 + m * (0.4 + 1.1 * (1.0 - nh / max(2.0 * f, 1e-3)));
      p = toy + vec3(rel.x * spread, nh - f, rel.z * spread);
    } else if (kind == 11) {
      float d = fract(t * 0.35);
      float g = exp(-pow((an.z - d) * 16.0, 2.0)) + exp(-pow((an.z - d + 1.0) * 16.0, 2.0));
      spTint += uSpGlowC.rgb * g * uSpGlowC.a;
    } else if (kind == 12) {
      p += up * sin(rel.x * 5.0 / R + rel.z * 3.0 / R - t * 2.0 + an.w) * amt * an.z * R;
    } else if (kind == 13) {
      float g = pow(max(0.0, sin(dot(uSpCam.xyz, vec3(3.1, 2.7, 3.7) * (0.5 + h)) + h * 40.0 + t * 0.5)), 24.0);
      spBright = 1.0 + an.z * g * 3.0;
    }
  }
  if (kind >= 17 && kind <= 20) {
    // Channel kinds: a morph moves to its packed target, a band glows as
    // its channel passes, a fade clears (or appears) as its channel passes,
    // a skin splat follows two tokens (an edge between moving corners).
    if (kind == 17) {
      float qx = floor(an.z / 4096.0);
      float qy = an.z - qx * 4096.0;
      float ch = floor(an.w / 4096.0);
      float qz = an.w - ch * 4096.0;
      // Lane Polish (engine): channels 4 to 7 are channels 0 to 3 for a
      // splat that also shrinks as it goes (to 40% at the target), so a
      // cloud of them reads as separate flat discs (Model to splats).
      if (ch > 3.5) {
        ch -= 4.0;
        spKitScale *= 1.0 - 0.6 * spChan(ch);
      }
      p += (vec3(qx, qy, qz) - 2048.0) * (${2 .toFixed(1)} / 2048.0) * spChan(ch);
    } else if (kind == 18) {
      float ch = floor(an.w);
      float x = (spChan(ch) - an.z) / max(an.w - ch, 0.005);
      spTint += uSpGlowC.rgb * uSpGlowC.a * exp(-x * x);
    } else if (kind == 19) {
      float aw = abs(an.w);
      float ch = floor(aw);
      float f = smoothstep(an.z, an.z + max(aw - ch, 0.005), spChan(ch));
      spFade *= an.w < 0.0 ? f : 1.0 - f;
    } else {
      float fb = floor(an.z / 64.0);
      int ia = clamp(int(an.z - fb * 64.0 + 0.5), 0, 47);
      int ib = clamp(int(fb + 0.5), 0, 47);
      vec4 ta = uSpTokens[ia * 2];
      vec4 tb = uSpTokens[ib * 2];
      p += mix(ta.xyz, tb.xyz, an.w);
      spKitScale *= mix(ta.w, tb.w, an.w);
    }
  }
  if (kind == 15) spScreenUV = vec3(an.z, an.w, 1.0);
  if (kind == 25) {
    float z4 = an.z;
    float d4 = floor(z4 / 262144.0);
    z4 -= d4 * 262144.0;
    float c4 = floor(z4 / 4096.0);
    z4 -= c4 * 4096.0;
    float b4 = floor(z4 / 64.0);
    float a4 = z4 - b4 * 64.0;
    float s4 = floor(an.w / 1024.0);
    float t4 = (an.w - s4 * 1024.0) / 1023.0;
    s4 /= 1023.0;
    vec4 k0 = uSpTokens[clamp(int(a4 + 0.5), 0, 47) * 2];
    vec4 k1 = uSpTokens[clamp(int(b4 + 0.5), 0, 47) * 2];
    vec4 k2 = uSpTokens[clamp(int(c4 + 0.5), 0, 47) * 2];
    vec4 k3 = uSpTokens[clamp(int(d4 + 0.5), 0, 47) * 2];
    vec4 m4 = mix(mix(k0, k1, s4), mix(k2, k3, s4), t4);
    p += m4.xyz;
    spKitScale *= m4.w;
  }
  if (kind == 24) {
    float rax = floor(an.z * 0.5);
    float rlq = floor(an.w * 0.5);
    vec2 ruv = vec2(an.z - 2.0 * rax, an.w - 2.0 * rlq);
    vec4 rt = textureLod(uSpScreen, vec2(0.5 + 0.5 * ruv.x, ruv.y), 0.0);
    if (rax > 2.5) {
      // 3D: red, green and blue are a signed offset along x, y and z, and
      // alpha under a half hides the splat.
      p += (rt.rgb - 0.5) * 2.0 * rlq * 0.001;
      if (rt.a < 0.5) spKitScale = 0.0;
    } else {
      vec3 rdir = rax < 0.5 ? vec3(1.0, 0.0, 0.0) : rax < 1.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
      p += rdir * rt.r * rlq * 0.001;
    }
    spScreenUV = vec3(0.5 * ruv.x, ruv.y, 1.0);
  }
  if (kind == 16 && int(an.z + 0.5) == int(floor(uSpKitB.w + 0.001)) && uSpKitB.w >= 0.0) {
    p -= up * fract(uSpKitB.w) * 0.012 * R;
  }
  if (kind == 21) {
    // Pictures: a leaf turns about the spine by its angle and curls along a
    // circular arc (curl in radians per toy unit), each splat turning with
    // the page at its place: tangent angle psi = angle + curl * s.
    vec3 sp = uSpLeaf[0].xyz;
    vec3 ax = uSpLeaf[1].xyz;
    vec3 dr = uSpLeaf[2].xyz;
    vec3 nm = cross(ax, dr);
    int slot = clamp(int(an.w + 0.5), 0, 9);
    vec4 pk = uSpLeaf[3 + slot / 2];
    vec2 lf = (slot - (slot / 2) * 2) == 0 ? pk.xy : pk.zw;
    vec3 rel = p - sp;
    float s = an.z;
    float psi = lf.x + lf.y * s;
    float lx = abs(lf.y) < 1e-4 ? s * cos(lf.x) : (sin(psi) - sin(lf.x)) / lf.y;
    float ly = abs(lf.y) < 1e-4 ? s * sin(lf.x) : (cos(lf.x) - cos(psi)) / lf.y;
    p = sp + ax * dot(rel, ax) + dr * lx + nm * ly + (nm * cos(psi) - dr * sin(psi)) * dot(rel, nm);
    spPartQ = vec4(ax * sin(psi * 0.5), cos(psi * 0.5));
  }
  if (kind == 22) {
    // Levers (lane Pianos): a key tips about its pivot, a damper or a jack
    // lifts, a string quivers (most at its middle) and any of them can glow,
    // each by its own amount from one of three channels.
    int g = clamp(int(floor(an.z / 128.0)), 0, 5);
    int li = clamp(int(an.z - float(g) * 128.0 + 0.5), 0, 95);
    vec4 ga = uSpLever[g * 3];
    vec4 gb = uSpLever[g * 3 + 1];
    vec4 gc = uSpLever[g * 3 + 2];
    float packed = uSpLevers[li / 4][li - (li / 4) * 4];
    vec3 chans = vec3(mod(packed, 256.0), mod(floor(packed / 256.0), 256.0), floor(packed / 65536.0)) / 255.0;
    int mode = int(gb.w + 0.5);
    int mch = mode - (mode / 4) * 4;
    mode = mode / 4;
    float a = mch == 0 ? chans.x : mch == 1 ? chans.y : chans.z;
    if (a > 0.0) {
      if (mode == 0) {
        float ang = a * ga.w;
        p = ga.xyz + spRotate(p - ga.xyz, gb.xyz, ang);
        spPartQ = vec4(gb.xyz * sin(ang * 0.5), cos(ang * 0.5));
      } else if (mode == 1) {
        p += gb.xyz * (a * ga.w);
      } else if (mode == 2) {
        p += gb.xyz * (a * ga.w * sin(3.14159 * clamp(an.w, 0.0, 1.0)) * sin(uSpKit.x * 47.0 + float(li) * 1.7));
      }
    }
    if (gc.w > -0.5) {
      int gch = int(gc.w + 0.5);
      float gl = gch == 0 ? chans.x : gch == 1 ? chans.y : chans.z;
      spTint += gc.rgb * gl;
    }
  }
  if (kind == 14) {
    // Game pieces move by uSpTokens even when the toy's own motion is off.
    int ti = clamp(int(an.z + 0.5), 0, 47);
    vec4 to = uSpTokens[ti * 2];
    vec4 tq = uSpTokens[ti * 2 + 1];
    if (tq.w == 0.0 && dot(tq.xyz, tq.xyz) == 0.0) tq = vec4(0.0, 0.0, 0.0, 1.0);
    p = spQuatRotate(tq, p) + to.xyz;
    spPartQ = tq;
    spKitScale *= to.w;
  }
  if (part > 0) {
    vec4 q = uSpParts[part * 3];
    vec4 pv = uSpParts[part * 3 + 1];
    vec4 ofs = uSpParts[part * 3 + 2];
    if (q.w == 0.0 && dot(q.xyz, q.xyz) == 0.0) q = vec4(0.0, 0.0, 0.0, 1.0);
    p = pv.xyz + spQuatRotate(q, (p - pv.xyz) * (1.0 + pv.w)) + ofs.xyz;
    spPartQ = q;
    // w <= -1: a culled part (visibility -w - 1). Its splats on the far side
    // of the part's center are hidden, so a turning shell's back never draws
    // over its front (splats sort in their built pose).
    float vis = ofs.w;
    if (vis < -9.5) {
      // w <= -10 (lane Night sky): a part culled below the level plane
      // through its center (visibility -w - 10): a sky's stars set.
      vis = -vis - 10.0;
      vec3 fc = pv.xyz + ofs.xyz;
      vis *= smoothstep(-0.004, 0.004, normalize(p - fc + vec3(1e-6)).y);
    } else if (vis < -0.5) {
      vis = -vis - 1.0;
      vec3 fc = pv.xyz + ofs.xyz;
      float fd = dot(normalize(p - fc + vec3(1e-6)), normalize(uSpCam.xyz - p));
      vis *= smoothstep(-0.12, -0.02, fd);
    }
    spKitScale *= vis * (1.0 + pv.w);
  }
  if (kind == 23) {
    // Rim (lane Fix4): clear face on, solid at the edge.
    vec3 rc = part > 0 ? uSpParts[part * 3 + 1].xyz + uSpParts[part * 3 + 2].xyz : toy;
    float fr = abs(dot(normalize(p - rc + vec3(1e-6)), normalize(uSpCam.xyz - p)));
    spFade *= mix(clamp(an.z, 0.0, 1.0), 1.0, pow(clamp(1.0 - fr, 0.0, 1.0), max(an.w, 0.05)));
  }
  if (kind == 26) {
    // Volume (lane Imaging): hidden outside the density window and beyond
    // the cutting plane (measured at the splat's rest place, so the cut
    // stays with the specimen as its part turns); the cut face glows.
    if (an.z < uSpVolP.z || an.z > uSpVolP.w) spKitScale = 0.0;
    if (uSpVolP.x > 0.5) {
      float vd = dot(spRest - toy, uSpVol.xyz) - uSpVol.w;
      float vg = uSpVolP.y > 0.0 ? uSpVolP.y - abs(vd) : -vd;
      if (vg < 0.0) spKitScale = 0.0;
      else if (uSpVolC.a > 0.0) spTint += uSpVolC.rgb * (1.0 - smoothstep(0.0, uSpVolC.a, vg));
    }
  }
  return p;
}
`,xt=`
fn spBeat(x: f32) -> f32 {
  let f = fract(x);
  return exp(-pow((f - 0.12) * 18.0, 2.0)) + 0.6 * exp(-pow((f - 0.34) * 16.0, 2.0));
}

fn spChan(ch: f32) -> f32 {
  return dot(uniform.uSpMorph, step(abs(vec4f(0.0, 1.0, 2.0, 3.0) - ch), vec4f(0.5)));
}

fn spKitCenter(p0: vec3f) -> vec3f {
  var p = p0;
  let an = loadSplatAnim();
  let pk = i32(an.x + 0.5);
  let part = pk & 15;
  spNoPat = f32((pk >> 4u) & 1);
  spPhotoBit = f32((pk >> 5u) & 1);
  let kind = i32(an.y + 0.5);
  let toy = uniform.uSpToy.xyz;
  let R = uniform.uSpToy.w;
  let up = vec3f(0.0, 1.0, 0.0);
  // Lane Any pose: the world's real up, for what rises or falls.
  let gup = select(up, uniform.uSpPoseUp.xyz, uniform.uSpPoseT.w > 0.5);
  let t = uniform.uSpKit.x * uniform.uSpKit.z;
  let amt = uniform.uSpKitB.z;
  if (uniform.uSpKit.y > 0.5 && kind > 0) {
    let h = spHash(splat.index * 29u + 7u);
    let rel = p - toy;
    if (kind == 1) {
      let r = length(rel.xz);
      let w = an.z * pow(max(r, 0.04 * R) / R, -an.w);
      p = toy + spRotate(rel, up, t * w);
    } else if (kind == 2) {
      p = toy + rel * (1.0 + amt * an.z * spBeat(t * 1.1 + an.w));
    } else if (kind == 3) {
      p = toy + rel * (1.0 + amt * an.z * sin(t * 1.3 + an.w));
    } else if (kind == 4 || kind == 5) {
      let flame = kind == 4;
      let c = fract(t * (0.6 + 0.5 * h) * select(0.35, 1.4, flame) + an.w + h);
      let travel = amt * an.z * R;
      let side = vec3f(sin(t * 3.0 + h * 17.0), 0.0, cos(t * 2.3 + h * 11.0));
      p = p + gup * c * travel + (side - gup * dot(side, gup)) * select(0.22, 0.07, flame) * c * travel;
      spFade = smoothstep(0.0, 0.1, c) * (1.0 - smoothstep(0.55, 1.0, c));
      spKitScale = select(mix(0.7, 1.25, c), mix(1.0, 0.3, c), flame);
      if (flame) { spFlame = c; }
    } else if (kind == 6) {
      let c = fract(t * (0.72 + 0.25 * h) + an.w);
      p = p - gup * c * an.z * R;
      spFade = smoothstep(0.0, 0.08, c) * (1.0 - smoothstep(0.85, 1.0, c));
    } else if (kind == 7) {
      spBright = 1.0 + amt * an.z * sin(t * (2.0 + 3.0 * h) + 6.2832 * h + an.w);
    } else if (kind == 8) {
      let k = max(0.0, dot(rel, up) - an.w) / R;
      let d = vec3f(sin(t * 1.3 + rel.x * 1.7 / R + rel.z * 1.1 / R), 0.0, 0.6 * cos(t * 1.1 + rel.z * 1.9 / R));
      p = p + d * amt * an.z * k * k * R;
    } else if (kind == 9) {
      spKitScale = smoothstep(an.z, an.z + 0.08, uniform.uSpKitB.x);
    } else if (kind == 10) {
      let m = clamp(uniform.uSpKit.w * an.z, 0.0, 1.0);
      let f = uniform.uSpKitB.y;
      let hgt = max(0.0, rel.y + f);
      let nh = hgt * (1.0 - m * (0.82 + 0.15 * h));
      let spread = 1.0 + m * (0.4 + 1.1 * (1.0 - nh / max(2.0 * f, 1e-3)));
      p = toy + vec3f(rel.x * spread, nh - f, rel.z * spread);
    } else if (kind == 11) {
      let d = fract(t * 0.35);
      let g = exp(-pow((an.z - d) * 16.0, 2.0)) + exp(-pow((an.z - d + 1.0) * 16.0, 2.0));
      spTint = spTint + uniform.uSpGlowC.rgb * g * uniform.uSpGlowC.a;
    } else if (kind == 12) {
      p = p + up * sin(rel.x * 5.0 / R + rel.z * 3.0 / R - t * 2.0 + an.w) * amt * an.z * R;
    } else if (kind == 13) {
      let g = pow(max(0.0, sin(dot(uniform.uSpCam.xyz, vec3f(3.1, 2.7, 3.7) * (0.5 + h)) + h * 40.0 + t * 0.5)), 24.0);
      spBright = 1.0 + an.z * g * 3.0;
    }
  }
  if (kind >= 17 && kind <= 20) {
    if (kind == 17) {
      let qx = floor(an.z / 4096.0);
      let qy = an.z - qx * 4096.0;
      var ch = floor(an.w / 4096.0);
      let qz = an.w - ch * 4096.0;
      if (ch > 3.5) {
        ch = ch - 4.0;
        spKitScale = spKitScale * (1.0 - 0.6 * spChan(ch));
      }
      p = p + (vec3f(qx, qy, qz) - 2048.0) * (${2 .toFixed(1)} / 2048.0) * spChan(ch);
    } else if (kind == 18) {
      let ch = floor(an.w);
      let x = (spChan(ch) - an.z) / max(an.w - ch, 0.005);
      spTint = spTint + uniform.uSpGlowC.rgb * uniform.uSpGlowC.a * exp(-x * x);
    } else if (kind == 19) {
      let aw = abs(an.w);
      let ch = floor(aw);
      let f = smoothstep(an.z, an.z + max(aw - ch, 0.005), spChan(ch));
      spFade = spFade * select(1.0 - f, f, an.w < 0.0);
    } else {
      let fb = floor(an.z / 64.0);
      let ia = clamp(i32(an.z - fb * 64.0 + 0.5), 0, 47);
      let ib = clamp(i32(fb + 0.5), 0, 47);
      let ta = uniform.uSpTokens[ia * 2];
      let tb = uniform.uSpTokens[ib * 2];
      p = p + mix(ta.xyz, tb.xyz, vec3f(an.w));
      spKitScale = spKitScale * mix(ta.w, tb.w, an.w);
    }
  }
  if (kind == 15) { spScreenUV = vec3f(an.z, an.w, 1.0); }
  if (kind == 25) {
    var z4 = an.z;
    let d4 = floor(z4 / 262144.0);
    z4 = z4 - d4 * 262144.0;
    let c4 = floor(z4 / 4096.0);
    z4 = z4 - c4 * 4096.0;
    let b4 = floor(z4 / 64.0);
    let a4 = z4 - b4 * 64.0;
    let s4w = floor(an.w / 1024.0);
    let t4 = (an.w - s4w * 1024.0) / 1023.0;
    let s4 = s4w / 1023.0;
    let k0 = uniform.uSpTokens[clamp(i32(a4 + 0.5), 0, 47) * 2];
    let k1 = uniform.uSpTokens[clamp(i32(b4 + 0.5), 0, 47) * 2];
    let k2 = uniform.uSpTokens[clamp(i32(c4 + 0.5), 0, 47) * 2];
    let k3 = uniform.uSpTokens[clamp(i32(d4 + 0.5), 0, 47) * 2];
    let m4 = mix(mix(k0, k1, vec4f(s4)), mix(k2, k3, vec4f(s4)), vec4f(t4));
    p = p + m4.xyz;
    spKitScale = spKitScale * m4.w;
  }
  if (kind == 24) {
    let rax = floor(an.z * 0.5);
    let rlq = floor(an.w * 0.5);
    let ruv = vec2f(an.z - 2.0 * rax, an.w - 2.0 * rlq);
    let rt = textureSampleLevel(uSpScreen, uSpScreenSampler, vec2f(0.5 + 0.5 * ruv.x, ruv.y), 0.0);
    if (rax > 2.5) {
      p = p + (rt.rgb - vec3f(0.5)) * 2.0 * rlq * 0.001;
      if (rt.a < 0.5) { spKitScale = 0.0; }
    } else {
      var rdir = vec3f(0.0, 0.0, 1.0);
      if (rax < 0.5) { rdir = vec3f(1.0, 0.0, 0.0); } else if (rax < 1.5) { rdir = vec3f(0.0, 1.0, 0.0); }
      p = p + rdir * rt.r * rlq * 0.001;
    }
    spScreenUV = vec3f(0.5 * ruv.x, ruv.y, 1.0);
  }
  if (kind == 16 && i32(an.z + 0.5) == i32(floor(uniform.uSpKitB.w + 0.001)) && uniform.uSpKitB.w >= 0.0) {
    p = p - up * fract(uniform.uSpKitB.w) * 0.012 * R;
  }
  if (kind == 21) {
    let sp = uniform.uSpLeaf[0].xyz;
    let ax = uniform.uSpLeaf[1].xyz;
    let dr = uniform.uSpLeaf[2].xyz;
    let nm = cross(ax, dr);
    let slot = clamp(i32(an.w + 0.5), 0, 9);
    let pk = uniform.uSpLeaf[3 + slot / 2];
    let lf = select(pk.zw, pk.xy, (slot - (slot / 2) * 2) == 0);
    let rel = p - sp;
    let s = an.z;
    let psi = lf.x + lf.y * s;
    let straight = abs(lf.y) < 1e-4;
    let lx = select((sin(psi) - sin(lf.x)) / lf.y, s * cos(lf.x), straight);
    let ly = select((cos(lf.x) - cos(psi)) / lf.y, s * sin(lf.x), straight);
    p = sp + ax * dot(rel, ax) + dr * lx + nm * ly + (nm * cos(psi) - dr * sin(psi)) * dot(rel, nm);
    spPartQ = vec4f(ax * sin(psi * 0.5), cos(psi * 0.5));
  }
  if (kind == 22) {
    let g = clamp(i32(floor(an.z / 128.0)), 0, 5);
    let li = clamp(i32(an.z - f32(g) * 128.0 + 0.5), 0, 95);
    let ga = uniform.uSpLever[g * 3];
    let gb = uniform.uSpLever[g * 3 + 1];
    let gc = uniform.uSpLever[g * 3 + 2];
    let packed = uniform.uSpLevers[li / 4][li - (li / 4) * 4];
    let chans = vec3f(packed - floor(packed / 256.0) * 256.0, floor(packed / 256.0) - floor(packed / 65536.0) * 256.0, floor(packed / 65536.0)) / 255.0;
    let m4 = i32(gb.w + 0.5);
    let mch = m4 - (m4 / 4) * 4;
    let mode = m4 / 4;
    let a = select(select(chans.z, chans.y, mch == 1), chans.x, mch == 0);
    if (a > 0.0) {
      if (mode == 0) {
        let ang = a * ga.w;
        p = ga.xyz + spRotate(p - ga.xyz, gb.xyz, ang);
        spPartQ = vec4f(gb.xyz * sin(ang * 0.5), cos(ang * 0.5));
      } else if (mode == 1) {
        p = p + gb.xyz * (a * ga.w);
      } else if (mode == 2) {
        p = p + gb.xyz * (a * ga.w * sin(3.14159 * clamp(an.w, 0.0, 1.0)) * sin(uniform.uSpKit.x * 47.0 + f32(li) * 1.7));
      }
    }
    if (gc.w > -0.5) {
      let gch = i32(gc.w + 0.5);
      let gl = select(select(chans.z, chans.y, gch == 1), chans.x, gch == 0);
      spTint = spTint + gc.rgb * gl;
    }
  }
  if (kind == 14) {
    let ti = clamp(i32(an.z + 0.5), 0, 47);
    let to = uniform.uSpTokens[ti * 2];
    var tq = uniform.uSpTokens[ti * 2 + 1];
    if (tq.w == 0.0 && dot(tq.xyz, tq.xyz) == 0.0) { tq = vec4f(0.0, 0.0, 0.0, 1.0); }
    p = spQuatRotate(tq, p) + to.xyz;
    spPartQ = tq;
    spKitScale = spKitScale * to.w;
  }
  if (part > 0) {
    var q = uniform.uSpParts[part * 3];
    let pv = uniform.uSpParts[part * 3 + 1];
    let ofs = uniform.uSpParts[part * 3 + 2];
    if (q.w == 0.0 && dot(q.xyz, q.xyz) == 0.0) { q = vec4f(0.0, 0.0, 0.0, 1.0); }
    p = pv.xyz + spQuatRotate(q, (p - pv.xyz) * (1.0 + pv.w)) + ofs.xyz;
    spPartQ = q;
    var vis = ofs.w;
    if (vis < -9.5) {
      // Lane Night sky: culled below the level plane through its center.
      vis = -vis - 10.0;
      let fc = pv.xyz + ofs.xyz;
      vis = vis * smoothstep(-0.004, 0.004, normalize(p - fc + vec3f(1e-6)).y);
    } else if (vis < -0.5) {
      vis = -vis - 1.0;
      let fc = pv.xyz + ofs.xyz;
      let fd = dot(normalize(p - fc + vec3f(1e-6)), normalize(uniform.uSpCam.xyz - p));
      vis = vis * smoothstep(-0.12, -0.02, fd);
    }
    spKitScale = spKitScale * vis * (1.0 + pv.w);
  }
  if (kind == 23) {
    // Rim (lane Fix4): clear face on, solid at the edge.
    var rc = toy;
    if (part > 0) { rc = uniform.uSpParts[part * 3 + 1].xyz + uniform.uSpParts[part * 3 + 2].xyz; }
    let fr = abs(dot(normalize(p - rc + vec3f(1e-6)), normalize(uniform.uSpCam.xyz - p)));
    spFade = spFade * mix(clamp(an.z, 0.0, 1.0), 1.0, pow(clamp(1.0 - fr, 0.0, 1.0), max(an.w, 0.05)));
  }
  if (kind == 26) {
    // Volume (lane Imaging): see the GLSL.
    if (an.z < uniform.uSpVolP.z || an.z > uniform.uSpVolP.w) { spKitScale = 0.0; }
    if (uniform.uSpVolP.x > 0.5) {
      let vd = dot(spRest - toy, uniform.uSpVol.xyz) - uniform.uSpVol.w;
      var vg = -vd;
      if (uniform.uSpVolP.y > 0.0) { vg = uniform.uSpVolP.y - abs(vd); }
      if (vg < 0.0) {
        spKitScale = 0.0;
      } else if (uniform.uSpVolC.a > 0.0) {
        spTint = spTint + uniform.uSpVolC.rgb * (1.0 - smoothstep(0.0, uniform.uSpVolC.a, vg));
      }
    }
  }
  return p;
}
`;function St(e,t,n){let r=n===`glsl`,i=t===`kitphoto`;i&&(t=`kit`);let a=(e,n)=>t===`kit`?e:t===`rig`?n:``;return e.replace(`__KIT_UNIFORMS__`,a(r?`uniform vec4 uSpKit;     // x time, y alive (0/1), z speed, w energy (melt 0..1)
uniform vec4 uSpKitB;    // x grow progress 0..1, y floor distance below the center, z amount
uniform vec4 uSpGlowC;   // rgb pulse glow color, a strength
uniform vec4 uSpCam;     // xyz camera position
uniform vec4 uSpParts[48];
uniform vec4 uSpTokens[96]; // per token: xyz offset + w visibility, then a rotation
uniform vec4 uSpMorph;   // the four channels of the morph, band and fade kinds
uniform sampler2D uSpScreen; // a live screen picture (the laptop's)
vec3 spScreenUV = vec3(0.0); // xy uv, z > 0 for a screen splat
uniform vec4 uSpLeaf[8]; // Pictures: spine point, spine axis, page direction, then (angle, curl) per leaf
uniform vec4 uSpLever[18]; // Pianos: per lever group, pivot + amount, direction + mode, glow color + channel
uniform vec4 uSpLevers[24]; // Pianos: 96 levers' amounts, three 8-bit channels packed in each float
uniform vec4 uSpVol;     // Imaging: cutting plane normal (xyz) and offset (w), toy coordinates
uniform vec4 uSpVolP;    // Imaging: x cut on, y slab half width (0: half space), z, w density window
uniform vec4 uSpVolC;    // Imaging: rgb cut-face glow, a glow width`:`uniform uSpKit: vec4f;
uniform uSpKitB: vec4f;
uniform uSpGlowC: vec4f;
uniform uSpCam: vec4f;
uniform uSpParts: array<vec4f, 48>;
uniform uSpTokens: array<vec4f, 96>;
uniform uSpMorph: vec4f;
var uSpScreen: texture_2d<f32>;
var uSpScreenSampler: sampler;
var<private> spScreenUV: vec3f = vec3f(0.0);
uniform uSpLeaf: array<vec4f, 8>;
uniform uSpLever: array<vec4f, 18>;
uniform uSpLevers: array<vec4f, 24>;
uniform uSpVol: vec4f;
uniform uSpVolP: vec4f;
uniform uSpVolC: vec4f;`,r?`uniform vec4 uSpParts[48];
uniform vec4 uSpRigTint[16]; // per part: rgb glow added, a brightness gain
uniform vec4 uSpFx[40];      // whole-body effects: 4 slots of 10 vec4 (see fxTable in src/rig-fx.js)
uniform vec4 uSpRigDbg;  // x > 0 tints each part (?rig=show), and the color keys`:`uniform uSpParts: array<vec4f, 48>;
uniform uSpRigTint: array<vec4f, 16>;
uniform uSpFx: array<vec4f, 40>;
uniform uSpRigDbg: vec4f;`)).replace(`__KIT_FUNCTIONS__`,a(r?bt:xt,r?`
float spCellHash(vec3 c) {
  return fract(sin(dot(c, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

vec3 spCellHash3(vec3 c) {
  return vec3(spCellHash(c), spCellHash(c + 17.31), spCellHash(c + 41.97)) * 2.0 - 1.0;
}

// One whole-body effect slot (fields in fxTable, src/rig-fx.js).
vec3 spRigFx(vec3 p, vec3 rest, vec4 pk, int part, int o) {
  vec4 f0 = uSpFx[o];
  vec4 f1 = uSpFx[o + 1];
  if (f0.x < 0.5 || (f1.x == 0.0 && f1.y == 0.0)) return p;
  vec4 f2 = uSpFx[o + 2];
  vec4 f3 = uSpFx[o + 3];
  vec4 f4 = uSpFx[o + 4];
  vec4 f5 = uSpFx[o + 5];
  vec4 f6 = uSpFx[o + 6];
  vec4 f7 = uSpFx[o + 7];
  int sm = int(f0.x + 0.5);
  float sel = sm == 2 ? pk.z : sm == 3 ? pk.w : sm == 4 ? 1.0 - pk.z : sm == 5 ? (part == int(f7.z + 0.5) ? pk.y : 0.0) : 1.0;
  vec3 org = f2.xyz;
  vec3 v = rest - org;
  int mk = int(f0.y + 0.5);
  if (mk == 1) {
    sel *= smoothstep(-0.015, 0.015, dot(v, f5.xyz) - f5.w);
  } else if (mk == 2) {
    vec3 ax = f5.xyz;
    vec3 b1 = normalize(cross(ax, abs(ax.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 b2 = cross(ax, b1);
    float a = atan(dot(v, b2), dot(v, b1)) / 6.2831853 + 0.5;
    float st = fract(a * f5.w);
    sel *= smoothstep(0.02, 0.08, st) * (1.0 - smoothstep(0.42, 0.48, st));
  } else if (mk == 3) {
    sel *= 1.0 - smoothstep(0.8, 1.0, distance(rest, f5.xyz) / max(f5.w, 1e-3));
  } else if (mk == 4) {
    vec4 f8 = uSpFx[o + 8];
    vec3 fl = v - f5.xyz * dot(v, f5.xyz);
    float ang = acos(clamp(dot(normalize(fl + vec3(1e-5)), f8.xyz), -1.0, 1.0));
    sel *= 1.0 - smoothstep(f8.w - 0.03, f8.w, ang);
  }
  if (sel <= 0.001) return p;
  float cell = f7.y;
  vec3 cid = cell > 0.0 ? floor(rest / cell) : vec3(0.0);
  vec3 pc = (cid + 0.5) * cell;
  if (cell < 0.0) {
    // Voronoi pieces: the nearest of the jittered points in the 27 cells round.
    float sz = -cell;
    vec3 g = floor(rest / sz);
    float bd = 1e9;
    for (int z = -1; z <= 1; z++)
      for (int y = -1; y <= 1; y++)
        for (int x = -1; x <= 1; x++) {
          vec3 c = g + vec3(float(x), float(y), float(z));
          vec3 q = (c + 0.5 + 0.38 * spCellHash3(c)) * sz;
          float d = dot(rest - q, rest - q);
          if (d < bd) {
            bd = d;
            cid = c;
            pc = q;
          }
        }
  }
  float hc = cell != 0.0 ? spCellHash(cid) : spHash(splat.index * 37u + 3u);
  int pt = int(f0.w + 0.5);
  float z = f1.z;
  float env = 1.0;
  if (pt == 1) {
    env = exp(-pow((length(v) - z) / max(f2.w, 1e-3), 2.0));
  } else if (pt == 2) {
    env = exp(-pow((dot(v, f4.xyz) - z) / max(f2.w, 1e-3), 2.0));
  } else if (pt == 3 || pt == 5) {
    float spread = f4.w;
    float local = clamp(z * (1.0 + spread) - spread * hc, 0.0, 1.0);
    env = pt == 3 ? sin(3.1415927 * local) : local * local * (3.0 - 2.0 * local);
  } else if (pt == 4) {
    vec3 ax = f4.xyz;
    vec3 b1 = normalize(cross(ax, abs(ax.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 b2 = cross(ax, b1);
    float a = atan(dot(v, b2), dot(v, b1)) / 6.2831853 + 0.5;
    float u = (a + f4.w * clamp(dot(v, ax) / uSpToy.w * 0.5 + 0.5, 0.0, 1.0)) / (1.0 + f4.w);
    env = 1.0 - smoothstep(z - f2.w, z, u);
  } else if (pt == 6) {
    env = sin(f4.w * dot(v, f4.xyz) - z);
  }
  float m = f1.x * env * sel;
  int mv = int(f0.z + 0.5);
  if (mv == 1) {
    p += normalize(v + vec3(1e-5)) * m;
  } else if (mv == 2) {
    p += f3.xyz * m;
  } else if (mv == 3) {
    vec3 cc = cell != 0.0 ? pc - org : v;
    vec3 dir = normalize(cc + vec3(1e-5)) * 0.9 + spCellHash3(cid) * 0.5 + vec3(0.0, f3.w, 0.0);
    p += dir * m * (0.7 + 0.6 * hc);
    if (spHash(splat.index * 41u + 9u) < 0.12) p += spHash3(splat.index * 43u + 1u) * m * 0.6;
  } else if (mv == 4) {
    p += f3.xyz * m * (0.75 + 0.5 * hc);
  } else if (mv == 5) {
    float h = spHash(splat.index * 47u + 5u);
    p += spHash3(splat.index * 53u + 7u) * sin(f7.x * f3.w + h * 6.2832) * m;
  } else if (mv == 6) {
    p = org + spRotate(p - org, f3.xyz, m);
    spPartQ = spQuatMul(vec4(f3.xyz * sin(m * 0.5), cos(m * 0.5)), spPartQ);
  } else if (mv == 7) {
    vec3 ax = f3.xyz;
    float along = dot(v, ax);
    float coord = f7.w > 0.5 ? along : length(v - ax * along);
    float band = floor(coord / max(f3.w, 1e-3));
    float sgn = mod(band, 2.0) < 0.5 ? 1.0 : -1.0;
    p = org + spRotate(p - org, ax, m * sgn);
  } else if (mv == 8) {
    float ang = m * dot(v, f4.xyz);
    p = org + spRotate(p - org, f3.xyz, ang);
  } else if (mv == 9) {
    vec3 ax = f3.xyz;
    float along = dot(v, ax);
    vec3 rad = v - ax * along;
    float rl = max(length(rad), 1e-4);
    vec3 rn = rad / rl;
    float lift = smoothstep(f3.w, f3.w + 0.25, along);
    vec3 piv = org + ax * f3.w + rn * rl;
    vec3 tg = normalize(cross(ax, rn));
    p = piv + spRotate(p - piv, tg, m * lift);
  } else if (mv == 10) {
    float n = max(f3.w, 1.0);
    float k = floor(spHash(splat.index * 61u + 7u) * n);
    vec3 ax = f3.xyz;
    vec3 b1 = normalize(cross(ax, abs(ax.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 dir = spRotate(b1, ax, (k + 0.25) * 6.2831853 / n);
    float s = 1.0 - (1.0 - pow(1.0 / n, 0.4)) * m;
    p = org + (p - org) * s + dir * f7.w * m;
    spKitScale *= mix(1.0, s, 0.7);
  } else if (mv == 11) {
    vec4 f9 = uSpFx[o + 9];
    if (hc <= f9.x) {
      float u = clamp(env, 0.0, 1.0);
      vec3 outd = normalize(pc - org + vec3(1e-4));
      vec3 g3 = f3.xyz;
      // Lane Any pose: pieces fall toward the world's real down in a toy turned over.
      if (uSpPoseT.w > 0.5) g3 = uSpPoseUp.xyz * f3.y + vec3(f3.x, 0.0, f3.z);
      vec3 disp = (outd * f3.w * u * (1.0 - 0.5 * u) + g3 * u * u) * f1.x * sel;
      // Pieces land on the floor instead of falling through it.
      if (uSpPoseT.w > 0.5) {
        float fl = 0.015 * uSpToy.w - uSpPoseUp.w;
        float hgt = dot(pc + disp - uSpToy.xyz, uSpPoseUp.xyz);
        if (hgt < fl) disp += uSpPoseUp.xyz * (fl - hgt);
      } else {
        float floorY = uSpToy.y - uSpBodyF.x + 0.015 * uSpToy.w;
        float yc = pc.y + disp.y;
        if (yc < floorY) disp.y += floorY - yc;
      }
      float ang = u * f9.y * (hc * 2.0 - 1.0) * 3.0;
      vec3 ax = normalize(spCellHash3(cid + 3.1) + vec3(1e-3));
      p = pc + disp + spRotate(p - pc, ax, ang);
      spPartQ = spQuatMul(vec4(ax * sin(ang * 0.5), cos(ang * 0.5)), spPartQ);
    }
  } else if (mv == 12) {
    vec4 f9 = uSpFx[o + 9];
    float sAlong = clamp(dot(v, f9.xyz) / max(f9.w, 1e-3), 0.0, 1.0);
    float h = spHash(splat.index * 67u + 1u);
    p += f3.xyz * m * sin(3.1415927 * sAlong) * sin(f7.x * f3.w + h * 6.2832);
  } else if (mv == 13) {
    vec4 f9 = uSpFx[o + 9];
    vec3 ax = f3.xyz;
    vec3 b1 = normalize(cross(ax, abs(ax.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 b2 = cross(ax, b1);
    float a = atan(dot(v, b2), dot(v, b1));
    vec3 rad = v - ax * dot(v, ax);
    float wv = f3.w * a - f1.z;
    p += normalize(rad + vec3(1e-5)) * m * sin(wv) + ax * m * f9.x * cos(wv);
  }
  float c = f1.y * abs(env) * sel;
  int cm = int(f1.w + 0.5);
  if (cm == 1) {
    spTint += f6.rgb * c;
  } else if (cm == 2) {
    if (c > spRecol.a) spRecol = vec4(f6.rgb, c);
    spRecolK = f6.w;
  } else if (cm == 3) {
    spBright *= 1.0 + c;
  } else if (cm == 4) {
    float h = spHash(splat.index * 59u + 3u);
    float on = step(1.0 - f6.w, h);
    spBright *= 1.0 + c * on * (0.6 + 0.4 * sin(f7.x * 23.0 + h * 60.0));
  } else if (cm == 5) {
    spFade *= 1.0 - clamp(c, 0.0, 1.0);
  } else if (cm == 6) {
    spBright *= 1.0 - clamp(c, 0.0, 0.9);
  }
  return p;
}

vec3 spRigCenter(vec3 p) {
  vec4 pk = loadSplatPart();
  int part = int(pk.x * 255.0 + 0.5);
  float w = pk.y;
  vec3 rest = p;
  if (part > 0 && part < 16 && w > 0.0) {
    vec4 q = uSpParts[part * 3];
    vec4 pv = uSpParts[part * 3 + 1];
    vec4 ofs = uSpParts[part * 3 + 2];
    if (q.w == 0.0 && dot(q.xyz, q.xyz) == 0.0) q = vec4(0.0, 0.0, 0.0, 1.0);
    vec3 moved = pv.xyz + spQuatRotate(q, (p - pv.xyz) * (1.0 + pv.w)) + ofs.xyz;
    p = mix(p, moved, w);
    spPartQ = normalize(mix(vec4(0.0, 0.0, 0.0, 1.0), q, w));
    spKitScale *= mix(1.0, ofs.w, w) * (1.0 + pv.w * w);
    vec4 tn = uSpRigTint[part];
    spTint += tn.rgb * w;
    spBright *= 1.0 + tn.a * w;
    if (uSpRigDbg.x > 0.0) {
      float h = float(part) * 2.39996;
      spTint += w * 0.6 * vec3(0.5 + 0.5 * cos(h), 0.5 + 0.5 * cos(h + 2.1), 0.5 + 0.5 * cos(h + 4.2));
    }
  }
  if (uSpRigDbg.x > 0.0) spTint += vec3(0.8, 0.0, 0.6) * pk.z + vec3(0.0, 0.7, 0.8) * pk.w;
  for (int i = 0; i < 4; i++) p = spRigFx(p, rest, pk, part, i * 10);
  return p;
}
`:`
fn spCellHash(c: vec3f) -> f32 {
  return fract(sin(dot(c, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}

fn spCellHash3(c: vec3f) -> vec3f {
  return vec3f(spCellHash(c), spCellHash(c + vec3f(17.31)), spCellHash(c + vec3f(41.97))) * 2.0 - vec3f(1.0);
}

fn spRigFx(p0: vec3f, rest: vec3f, pk: vec4f, part: i32, o: i32) -> vec3f {
  var p = p0;
  let f0 = uniform.uSpFx[o];
  let f1 = uniform.uSpFx[o + 1];
  if (f0.x < 0.5 || (f1.x == 0.0 && f1.y == 0.0)) { return p; }
  let f2 = uniform.uSpFx[o + 2];
  let f3 = uniform.uSpFx[o + 3];
  let f4 = uniform.uSpFx[o + 4];
  let f5 = uniform.uSpFx[o + 5];
  let f6 = uniform.uSpFx[o + 6];
  let f7 = uniform.uSpFx[o + 7];
  let sm = i32(f0.x + 0.5);
  var sel = 1.0;
  if (sm == 2) { sel = pk.z; }
  else if (sm == 3) { sel = pk.w; }
  else if (sm == 4) { sel = 1.0 - pk.z; }
  else if (sm == 5) { sel = select(0.0, pk.y, part == i32(f7.z + 0.5)); }
  let org = f2.xyz;
  let v = rest - org;
  let mk = i32(f0.y + 0.5);
  if (mk == 1) {
    sel = sel * smoothstep(-0.015, 0.015, dot(v, f5.xyz) - f5.w);
  } else if (mk == 2) {
    let ax = f5.xyz;
    let b1 = normalize(cross(ax, select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(ax.y) < 0.9)));
    let b2 = cross(ax, b1);
    let a = atan2(dot(v, b2), dot(v, b1)) / 6.2831853 + 0.5;
    let st = fract(a * f5.w);
    sel = sel * smoothstep(0.02, 0.08, st) * (1.0 - smoothstep(0.42, 0.48, st));
  } else if (mk == 3) {
    sel = sel * (1.0 - smoothstep(0.8, 1.0, distance(rest, f5.xyz) / max(f5.w, 1e-3)));
  } else if (mk == 4) {
    let f8 = uniform.uSpFx[o + 8];
    let fl = v - f5.xyz * dot(v, f5.xyz);
    let ang = acos(clamp(dot(normalize(fl + vec3f(1e-5)), f8.xyz), -1.0, 1.0));
    sel = sel * (1.0 - smoothstep(f8.w - 0.03, f8.w, ang));
  }
  if (sel <= 0.001) { return p; }
  let cell = f7.y;
  var cid = vec3f(0.0);
  if (cell > 0.0) { cid = floor(rest / cell); }
  var pc = (cid + vec3f(0.5)) * cell;
  if (cell < 0.0) {
    let sz = -cell;
    let g = floor(rest / sz);
    var bd = 1e9;
    for (var z = -1; z <= 1; z++) {
      for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
          let c = g + vec3f(f32(x), f32(y), f32(z));
          let q = (c + vec3f(0.5) + 0.38 * spCellHash3(c)) * sz;
          let d = dot(rest - q, rest - q);
          if (d < bd) {
            bd = d;
            cid = c;
            pc = q;
          }
        }
      }
    }
  }
  var hc = spHash(splat.index * 37u + 3u);
  if (cell != 0.0) { hc = spCellHash(cid); }
  let pt = i32(f0.w + 0.5);
  let z = f1.z;
  var env = 1.0;
  if (pt == 1) {
    env = exp(-pow((length(v) - z) / max(f2.w, 1e-3), 2.0));
  } else if (pt == 2) {
    env = exp(-pow((dot(v, f4.xyz) - z) / max(f2.w, 1e-3), 2.0));
  } else if (pt == 3 || pt == 5) {
    let spread = f4.w;
    let local = clamp(z * (1.0 + spread) - spread * hc, 0.0, 1.0);
    env = select(local * local * (3.0 - 2.0 * local), sin(3.1415927 * local), pt == 3);
  } else if (pt == 4) {
    let ax = f4.xyz;
    let b1 = normalize(cross(ax, select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(ax.y) < 0.9)));
    let b2 = cross(ax, b1);
    let a = atan2(dot(v, b2), dot(v, b1)) / 6.2831853 + 0.5;
    let u = (a + f4.w * clamp(dot(v, ax) / uniform.uSpToy.w * 0.5 + 0.5, 0.0, 1.0)) / (1.0 + f4.w);
    env = 1.0 - smoothstep(z - f2.w, z, u);
  } else if (pt == 6) {
    env = sin(f4.w * dot(v, f4.xyz) - z);
  }
  let m = f1.x * env * sel;
  let mv = i32(f0.z + 0.5);
  if (mv == 1) {
    p = p + normalize(v + vec3f(1e-5)) * m;
  } else if (mv == 2) {
    p = p + f3.xyz * m;
  } else if (mv == 3) {
    var cc = v;
    if (cell != 0.0) { cc = pc - org; }
    let dir = normalize(cc + vec3f(1e-5)) * 0.9 + spCellHash3(cid) * 0.5 + vec3f(0.0, f3.w, 0.0);
    p = p + dir * m * (0.7 + 0.6 * hc);
    if (spHash(splat.index * 41u + 9u) < 0.12) { p = p + spHash3(splat.index * 43u + 1u) * m * 0.6; }
  } else if (mv == 4) {
    p = p + f3.xyz * m * (0.75 + 0.5 * hc);
  } else if (mv == 5) {
    let h = spHash(splat.index * 47u + 5u);
    p = p + spHash3(splat.index * 53u + 7u) * sin(f7.x * f3.w + h * 6.2832) * m;
  } else if (mv == 6) {
    p = org + spRotate(p - org, f3.xyz, m);
    spPartQ = spQuatMul(vec4f(f3.xyz * sin(m * 0.5), cos(m * 0.5)), spPartQ);
  } else if (mv == 7) {
    let ax = f3.xyz;
    let along = dot(v, ax);
    let coord = select(length(v - ax * along), along, f7.w > 0.5);
    let band = floor(coord / max(f3.w, 1e-3));
    let sgn = select(-1.0, 1.0, band - 2.0 * floor(band / 2.0) < 0.5);
    p = org + spRotate(p - org, ax, m * sgn);
  } else if (mv == 8) {
    let ang = m * dot(v, f4.xyz);
    p = org + spRotate(p - org, f3.xyz, ang);
  } else if (mv == 9) {
    let ax = f3.xyz;
    let along = dot(v, ax);
    let rad = v - ax * along;
    let rl = max(length(rad), 1e-4);
    let rn = rad / rl;
    let lift = smoothstep(f3.w, f3.w + 0.25, along);
    let piv = org + ax * f3.w + rn * rl;
    let tg = normalize(cross(ax, rn));
    p = piv + spRotate(p - piv, tg, m * lift);
  } else if (mv == 10) {
    let n = max(f3.w, 1.0);
    let k = floor(spHash(splat.index * 61u + 7u) * n);
    let ax = f3.xyz;
    let b1 = normalize(cross(ax, select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(ax.y) < 0.9)));
    let dir = spRotate(b1, ax, (k + 0.25) * 6.2831853 / n);
    let s = 1.0 - (1.0 - pow(1.0 / n, 0.4)) * m;
    p = org + (p - org) * s + dir * f7.w * m;
    spKitScale = spKitScale * mix(1.0, s, 0.7);
  } else if (mv == 11) {
    let f9 = uniform.uSpFx[o + 9];
    if (hc <= f9.x) {
      let u = clamp(env, 0.0, 1.0);
      let outd = normalize(pc - org + vec3f(1e-4));
      var g3 = f3.xyz;
      // Lane Any pose: pieces fall toward the world's real down in a toy turned over.
      if (uniform.uSpPoseT.w > 0.5) { g3 = uniform.uSpPoseUp.xyz * f3.y + vec3f(f3.x, 0.0, f3.z); }
      var disp = (outd * f3.w * u * (1.0 - 0.5 * u) + g3 * u * u) * f1.x * sel;
      if (uniform.uSpPoseT.w > 0.5) {
        let fl = 0.015 * uniform.uSpToy.w - uniform.uSpPoseUp.w;
        let hgt = dot(pc + disp - uniform.uSpToy.xyz, uniform.uSpPoseUp.xyz);
        if (hgt < fl) { disp = disp + uniform.uSpPoseUp.xyz * (fl - hgt); }
      } else {
        let floorY = uniform.uSpToy.y - uniform.uSpBodyF.x + 0.015 * uniform.uSpToy.w;
        let yc = pc.y + disp.y;
        if (yc < floorY) { disp.y = disp.y + floorY - yc; }
      }
      let ang = u * f9.y * (hc * 2.0 - 1.0) * 3.0;
      let ax = normalize(spCellHash3(cid + vec3f(3.1)) + vec3f(1e-3));
      p = pc + disp + spRotate(p - pc, ax, ang);
      spPartQ = spQuatMul(vec4f(ax * sin(ang * 0.5), cos(ang * 0.5)), spPartQ);
    }
  } else if (mv == 12) {
    let f9 = uniform.uSpFx[o + 9];
    let sAlong = clamp(dot(v, f9.xyz) / max(f9.w, 1e-3), 0.0, 1.0);
    let h = spHash(splat.index * 67u + 1u);
    p = p + f3.xyz * m * sin(3.1415927 * sAlong) * sin(f7.x * f3.w + h * 6.2832);
  } else if (mv == 13) {
    let f9 = uniform.uSpFx[o + 9];
    let ax = f3.xyz;
    let b1 = normalize(cross(ax, select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(ax.y) < 0.9)));
    let b2 = cross(ax, b1);
    let a = atan2(dot(v, b2), dot(v, b1));
    let rad = v - ax * dot(v, ax);
    let wv = f3.w * a - f1.z;
    p = p + normalize(rad + vec3f(1e-5)) * m * sin(wv) + ax * m * f9.x * cos(wv);
  }
  let c = f1.y * abs(env) * sel;
  let cm = i32(f1.w + 0.5);
  if (cm == 1) {
    spTint = spTint + f6.rgb * c;
  } else if (cm == 2) {
    if (c > spRecol.a) { spRecol = vec4f(f6.rgb, c); }
    spRecolK = f6.w;
  } else if (cm == 3) {
    spBright = spBright * (1.0 + c);
  } else if (cm == 4) {
    let h = spHash(splat.index * 59u + 3u);
    let on = step(1.0 - f6.w, h);
    spBright = spBright * (1.0 + c * on * (0.6 + 0.4 * sin(f7.x * 23.0 + h * 60.0)));
  } else if (cm == 5) {
    spFade = spFade * (1.0 - clamp(c, 0.0, 1.0));
  } else if (cm == 6) {
    spBright = spBright * (1.0 - clamp(c, 0.0, 0.9));
  }
  return p;
}

fn spRigCenter(p0: vec3f) -> vec3f {
  var p = p0;
  let pk = loadSplatPart();
  let part = i32(pk.x * 255.0 + 0.5);
  let w = pk.y;
  let rest = p0;
  if (part > 0 && part < 16 && w > 0.0) {
    var q = uniform.uSpParts[part * 3];
    let pv = uniform.uSpParts[part * 3 + 1];
    let ofs = uniform.uSpParts[part * 3 + 2];
    if (q.w == 0.0 && dot(q.xyz, q.xyz) == 0.0) { q = vec4f(0.0, 0.0, 0.0, 1.0); }
    let moved = pv.xyz + spQuatRotate(q, (p - pv.xyz) * (1.0 + pv.w)) + ofs.xyz;
    p = mix(p, moved, w);
    spPartQ = normalize(mix(vec4f(0.0, 0.0, 0.0, 1.0), q, w));
    spKitScale = spKitScale * mix(1.0, ofs.w, w) * (1.0 + pv.w * w);
    let tn = uniform.uSpRigTint[part];
    spTint = spTint + tn.rgb * w;
    spBright = spBright * (1.0 + tn.a * w);
    if (uniform.uSpRigDbg.x > 0.0) {
      let h = f32(part) * 2.39996;
      spTint = spTint + w * 0.6 * vec3f(0.5 + 0.5 * cos(h), 0.5 + 0.5 * cos(h + 2.1), 0.5 + 0.5 * cos(h + 4.2));
    }
  }
  if (uniform.uSpRigDbg.x > 0.0) { spTint = spTint + vec3f(0.8, 0.0, 0.6) * pk.z + vec3f(0.0, 0.7, 0.8) * pk.w; }
  for (var i = 0; i < 4; i++) { p = spRigFx(p, rest, pk, part, i * 10); }
  return p;
}
`)).replace(`__KIT_COLOR__`,t===`kit`?r?`if (spScreenUV.z > 0.5) color.rgb = textureLod(uSpScreen, spScreenUV.xy, 0.0).rgb;`:`if (spScreenUV.z > 0.5) { base = textureSampleLevel(uSpScreen, uSpScreenSampler, spScreenUV.xy, 0.0).rgb; }`:``).replace(`__KIT_PHOTO_UNIFORMS__`,i?r?_t.glslUniforms:_t.wgslUniforms:``).replace(`__KIT_PHOTO__`,i?r?_t.glsl:_t.wgsl:``).replace(`__KIT_CENTER__`,a(r?`center = spKitCenter(center);`:`*center = spKitCenter(*center);`,r?`center = spRigCenter(center);`:`*center = spRigCenter(*center);`))}St(vt,`plain`,`glsl`),St(yt,`plain`,`wgsl`),St(vt,`kit`,`glsl`),St(yt,`kit`,`wgsl`),St(vt,`kitphoto`,`glsl`),St(yt,`kitphoto`,`wgsl`);const Ct={glslUniforms:`uniform vec4 uSpGloss; // lane Kit lab: x strength, y sharpness
vec3 spGlossN = vec3(0.0);
float spGlossK = 0.0;
`,wgslUniforms:`uniform uSpGloss: vec4f;
var<private> spGlossN: vec3f = vec3f(0.0);
var<private> spGlossK: f32 = 0.0;
`,glslRS:`  vec3 gs = abs(scale);
  vec3 gax = gs.x <= gs.y && gs.x <= gs.z ? vec3(1.0, 0.0, 0.0) : (gs.y <= gs.z ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
  spGlossN = spQuatRotate(normalize(rotation), gax);
  float gmid = max(min(gs.x, gs.y), min(max(gs.x, gs.y), gs.z));
  spGlossK = 1.0 - smoothstep(0.25, 0.6, min(gs.x, min(gs.y, gs.z)) / max(gmid, 1e-6));
`,wgslRS:`  let gs = abs(*scale);
  var gax = vec3f(0.0, 0.0, 1.0);
  if (gs.x <= gs.y && gs.x <= gs.z) { gax = vec3f(1.0, 0.0, 0.0); } else if (gs.y <= gs.z) { gax = vec3f(0.0, 1.0, 0.0); }
  spGlossN = spQuatRotate(normalize(*rotation), gax);
  let gmid = max(min(gs.x, gs.y), min(max(gs.x, gs.y), gs.z));
  spGlossK = 1.0 - smoothstep(0.25, 0.6, min(gs.x, min(gs.y, gs.z)) / max(gmid, 1e-6));
`,glslColor:`  if (spGlossK > 0.0 && uSpGloss.x > 0.0) {
    vec3 gv = normalize(uSpCam.xyz - center);
    vec3 gn = dot(spGlossN, gv) < 0.0 ? -spGlossN : spGlossN;
    vec3 gh = normalize(normalize(vec3(0.42, 0.8, 0.43)) + gv);
    float gs = pow(max(dot(gn, gh), 0.0), uSpGloss.y) * uSpGloss.x * spGlossK;
    // A reflection shows on clear glass too: it adds light and cover.
    float ga = color.a + min(gs, 1.0) * (1.0 - color.a);
    color.rgb = (color.rgb * color.a + vec3(gs)) / max(ga, 1e-4);
    color.a = ga;
  }
`,wgslColor:`  if (spGlossK > 0.0 && uniform.uSpGloss.x > 0.0) {
    let gv = normalize(uniform.uSpCam.xyz - center);
    let gn = select(spGlossN, -spGlossN, dot(spGlossN, gv) < 0.0);
    let gh = normalize(normalize(vec3f(0.42, 0.8, 0.43)) + gv);
    let gs = pow(max(dot(gn, gh), 0.0), uniform.uSpGloss.y) * uniform.uSpGloss.x * spGlossK;
    // A reflection shows on clear glass too: it adds light and cover.
    let ga = a + min(gs, 1.0) * (1.0 - a);
    rgb = (rgb * a + vec3f(gs)) / max(ga, 1e-4);
    a = ga;
  }
`};function wt(e,t){let n=(e,t,n,r=!0)=>{if(!e.includes(t))throw Error(`gloss: missing ${t}`);return e.replace(t,r?n+t:t+n)};return t?(e=n(e,`uniform vec4 uSpCam;`,Ct.glslUniforms),e=n(e,`  if (spCut > 0.5) scale = vec3(0.0);
}`,Ct.glslRS),n(e,`  color.rgb *= uSpClock.z * (1.0 + clamp(spShade, -0.6, 0.6));
}`,Ct.glslColor)):(e=n(e,`uniform uSpCam: vec4f;`,Ct.wgslUniforms),e=n(e,`  if (spCut > 0.5) { *scale = vec3f(0.0); }
}`,Ct.wgslRS),n(e,`  *color = vec4f(rgb * uniform.uSpClock.z`,Ct.wgslColor))}wt(St(vt,`kit`,`glsl`),!0),wt(St(yt,`kit`,`wgsl`),!1),St(vt,`rig`,`glsl`),St(yt,`rig`,`wgsl`);const I=Math.PI*2,Tt=Math.PI/180,Et=(e,t)=>[e[0]+t[0],e[1]+t[1],e[2]+t[2]],L=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],R=(e,t)=>[e[0]*t,e[1]*t,e[2]*t],Dt=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],Ot=e=>Math.hypot(e[0],e[1],e[2]),z=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],B=e=>{let t=Ot(e)||1;return[e[0]/t,e[1]/t,e[2]/t]};function kt(e,t){return[e[3]*t[0]+t[3]*e[0]+e[1]*t[2]-e[2]*t[1],e[3]*t[1]+t[3]*e[1]+e[2]*t[0]-e[0]*t[2],e[3]*t[2]+t[3]*e[2]+e[0]*t[1]-e[1]*t[0],e[3]*t[3]-e[0]*t[0]-e[1]*t[1]-e[2]*t[2]]}function At(e,t){let n=B(e),r=Math.sin(t/2);return[n[0]*r,n[1]*r,n[2]*r,Math.cos(t/2)]}function jt(e=0,t=0,n=0){let r=At([1,0,0],e*Tt),i=At([0,1,0],t*Tt);return kt(At([0,0,1],n*Tt),kt(i,r))}function Mt(e,t){let n=[e[0],e[1],e[2]],r=R(z(n,t),2);return Et(Et(t,R(r,e[3])),z(n,r))}function Nt(e,t){let n=B(e),r=B(t),i=Dt(n,r);if(i<-.999999)return At(Math.abs(n[0])<.9?z(n,[1,0,0]):z(n,[0,1,0]),Math.PI);let a=z(n,r),o=[a[0],a[1],a[2],1+i],s=Math.hypot(o[0],o[1],o[2],o[3]);return[o[0]/s,o[1]/s,o[2]/s,o[3]/s]}function Pt(e,t,n){let r=e[0],i=t[1],a=n[2],o=r+i+a,s;if(o>0){let r=Math.sqrt(o+1)*2;s=[(t[2]-n[1])/r,(n[0]-e[2])/r,(e[1]-t[0])/r,r/4]}else if(r>i&&r>a){let o=Math.sqrt(1+r-i-a)*2;s=[o/4,(t[0]+e[1])/o,(n[0]+e[2])/o,(t[2]-n[1])/o]}else if(i>a){let o=Math.sqrt(1+i-r-a)*2;s=[(t[0]+e[1])/o,o/4,(n[1]+t[2])/o,(n[0]-e[2])/o]}else{let o=Math.sqrt(1+a-r-i)*2;s=[(n[0]+e[2])/o,(n[1]+t[2])/o,o/4,(e[1]-t[0])/o]}let c=Math.hypot(s[0],s[1],s[2],s[3])||1;return[s[0]/c,s[1]/c,s[2]/c,s[3]/c]}function Ft(e){return Array.isArray(e)?e:typeof e==`string`?dt(e.length===4?It(e):e):[1,0,1]}function It(e){return`#`+e[1]+e[1]+e[2]+e[2]+e[3]+e[3]}function V(e,t,n){let r=Ft(e),i=Ft(t);return[r[0]+(i[0]-r[0])*n,r[1]+(i[1]-r[1])*n,r[2]+(i[2]-r[2])*n]}function H(e,t){let n=Ft(e);return[Lt(n[0]*t),Lt(n[1]*t),Lt(n[2]*t)]}const Lt=e=>e<0?0:e>1?1:e,U=(e,t,n)=>e<t?t:e>n?n:e,W=(e,t,n)=>{let r=Lt((n-e)/(t-e));return r*r*(3-2*r)};function Rt(e){return{area:4*Math.PI*e*e,thick:e,dims:2,sample(t){let n=ht(t);return{p:R(n,e),n,u:Math.atan2(n[0],n[2])/I+.5,v:Math.acos(U(n[1],-1,1))/Math.PI}}}}function zt(e,t,n){let r=1.6075,i=4*Math.PI*(((e*t)**r+(e*n)**r+(t*n)**r)/3)**(1/r),a=1/Math.min(e,t,n);return{area:i,thick:Math.min(e,t,n),sample(r){for(;;){let i=ht(r),o=Math.hypot(i[0]/e,i[1]/t,i[2]/n);if(!(r()*a>o))return{p:[i[0]*e,i[1]*t,i[2]*n],n:B([i[0]/e,i[1]/t,i[2]/n]),u:Math.atan2(i[0],i[2])/I+.5,v:Math.acos(U(i[1],-1,1))/Math.PI}}}}}function Bt(e,t,n){let r=e/2,i=t/2,a=n/2,o=[{a:t*n,n:[1,0,0]},{a:t*n,n:[-1,0,0]},{a:e*n,n:[0,1,0]},{a:e*n,n:[0,-1,0]},{a:e*t,n:[0,0,1]},{a:e*t,n:[0,0,-1]}],s=o.reduce((e,t)=>e+t.a,0);return{area:s,thick:Math.min(r,i,a),sample(c){let l=c()*s,u=o[5];for(let e of o){if(l<e.a){u=e;break}l-=e.a}let d=c(),f=c(),p=u.n,m;return m=p[0]?[r*p[0],(d-.5)*t,(f-.5)*n]:p[1]?[(d-.5)*e,i*p[1],(f-.5)*n]:[(d-.5)*e,(f-.5)*t,a*p[2]],{p:m,n:p,u:d,v:f,face:o.indexOf(u)}}}}function Vt(e,t,n,r){let i=Math.hypot(n,e-t),a=Math.PI*(e+t)*i,o=r===!0||r===`bottom`?Math.PI*e*e:0,s=r===!0||r===`top`?Math.PI*t*t:0,c=a+o+s,l=(e-t)/i,u=n/i;return{area:c,thick:Math.min(Math.max(e,t),n/2),sample(r){let i=r()*c,s=r()*I,d=Math.cos(s),f=Math.sin(s);if(i<a){let i;if(Math.abs(t-e)<1e-6)i=r();else{let n=r();i=(Math.sqrt(e*e+n*(t*t-e*e))-e)/(t-e)}let a=e+(t-e)*i;return{p:[a*f,-n/2+n*i,a*d],n:B([f*u,l,d*u]),u:s/I,v:1-i,side:!0,thick:a}}let p=i>=a+o,m=p?t:e,h=m*Math.sqrt(r());return{p:[h*f,p?n/2:-n/2,h*d],n:[0,p?1:-1,0],u:s/I,v:+!p,cap:p?`top`:`bottom`,radial:m>0?h/m:0}}}}function Ht(e,t){return{area:4*Math.PI*Math.PI*e*t,thick:t,sample(n){let r,i;do r=n()*I,i=n()*I;while(n()>(e+t*Math.cos(i))/(e+t));let a=Math.cos(r),o=Math.sin(r),s=Math.cos(i),c=Math.sin(i);return{p:[(e+t*s)*a,t*c,(e+t*s)*o],n:[s*a,c,s*o],u:r/I,v:i/I}}}}function Ut(e,t){return{area:Math.PI*(t*t-e*e)*2,thick:.01,sample(n){let r=n()*I,i=Math.sqrt(e*e+n()*(t*t-e*e)),a=n()<.5;return{p:[i*Math.sin(r),0,i*Math.cos(r)],n:[0,a?1:-1,0],u:r/I,v:(i-e)/Math.max(1e-6,t-e)}}}}function Wt(e,{grid:t=64,normal:n=null,flip:r=!1,thick:i=.1}={}){let a=t,o=new Float64Array(a*a),s=0;for(let t=0;t<a;t++)for(let n=0;n<a;n++){let r=n/a,i=t/a,c=(n+1)/a,l=(t+1)/a,u=e(r,i),d=e(c,i),f=e(c,l),p=e(r,l),m=.5*Ot(z(L(d,u),L(p,u)))+.5*Ot(z(L(d,f),L(p,f)));s+=m,o[t*a+n]=s}let c=1e-4,l=(e,t,n)=>{for(;t<n;){let r=t+n>>1;o[r]<e?t=r+1:n=r}return t},u=e=>e>0?o[e-1]:0,d=(t,i)=>{let a=e(t,i),o;if(n)o=B(n(t,i,a));else{let n=t+c<=1?L(e(t+c,i),a):L(a,e(t-c,i)),s=i+c<=1?L(e(t,i+c),a):L(a,e(t,i-c));o=B(r?z(s,n):z(n,s))}return{p:a,n:o,u:t,v:i}};return{area:s,thick:i,sample(e){let t=l(e()*s,0,a*a-1);return d((t%a+e())/a,(Math.floor(t/a)+e())/a)},sampleEven(e,t){let n=Math.floor(l(e*s,0,a*a-1)/a),r=u(n*a),i=o[n*a+a-1],c=i>r?(e*s-r)/(i-r):.5,f=r+t*(i-r),p=l(f,n*a,n*a+a-1),m=u(p),h=o[p]>m?(f-m)/(o[p]-m):.5;return d((p%a+U(h,0,1))/a,(n+U(c,0,1))/a)}}}function Gt(e,{grid:t=64,thick:n}={}){let r=e.map(([e,t])=>[Math.max(0,e),t]),i=r.length-1,a=e=>{let t=U(e,0,1)*i,n=Math.min(i-1,Math.floor(t)),a=t-n,o=r[Math.max(0,n-1)],s=r[n],c=r[n+1],l=r[Math.min(i,n+2)],u=(e,t,n,r)=>.5*(2*t+(-e+n)*a+(2*e-5*t+4*n-r)*a*a+(-e+3*t-3*n+r)*a*a*a);return[Math.max(0,u(o[0],s[0],c[0],l[0])),u(o[1],s[1],c[1],l[1])]},o=Math.max(...r.map(e=>e[0])),s=Wt((e,t)=>{let[n,r]=a(t),i=e*I;return[n*Math.sin(i),r,n*Math.cos(i)]},{grid:t,thick:n??o,normal:(e,t)=>{let n=.001,r=a(Math.max(0,t-n)),i=a(Math.min(1,t+n)),o=i[0]-r[0],s=i[1]-r[1],c=e*I,l=s,u=-o;return Math.abs(l)<1e-9&&Math.abs(u)<1e-9&&(u=t>.5?1:-1),[l*Math.sin(c),u,l*Math.cos(c)]}});return s.profileAt=a,s}function Kt(e,t,{closed:n=!1,samples:r=256,grid:i=64,caps:a=!1}={}){let o=r,s=[],c=[];for(let t=0;t<=o;t++)s.push(e(t/o));for(let e=0;e<=o;e++){let t=s[Math.max(0,e-1)],n=s[Math.min(o,e+1)];c.push(B(L(n,t)))}n&&(c[0]=c[o]=B(L(s[1],s[o-1])));let l=[],u=[],d=Math.abs(c[0][1])<.9?[0,1,0]:[1,0,0],f=B(z(z(c[0],d),c[0]));for(let e=0;e<=o;e++){if(e>0){let t=z(c[e-1],c[e]),n=Ot(t);n>1e-8&&(f=Mt(At(R(t,1/n),Math.acos(U(Dt(c[e-1],c[e]),-1,1))),f)),f=B(L(f,R(c[e],Dt(f,c[e]))))}l.push(f),u.push(z(c[e],f))}let p=typeof t==`function`?t:()=>t,m=e=>{let t=U(e,0,1)*o,n=Math.min(o-1,Math.floor(t)),r=t-n,i=Et(R(s[n],1-r),R(s[n+1],r)),a=B(Et(R(l[n],1-r),R(l[n+1],r))),u=B(Et(R(c[n],1-r),R(c[n+1],r)));return{p:i,n:a,b:z(u,a),t:u}},h=0;for(let e=0;e<=16;e++)h=Math.max(h,p(e/16));let g=Wt((e,t)=>{let n=m(t),r=e*I,i=p(t);return Et(n.p,Et(R(n.n,i*Math.cos(r)),R(n.b,i*Math.sin(r))))},{grid:i,thick:h,normal:(e,t)=>{let n=m(t),r=e*I;return Et(R(n.n,Math.cos(r)),R(n.b,Math.sin(r)))}}),_=e=>(e.t=e.v,e.tangent=m(e.v).t,e),v=g.sample,y=g.sampleEven;if(g.sample=e=>_(v(e)),g.sampleEven=(e,t)=>_(y(e,t)),g.frame=m,a&&!n){let e=p(0),t=p(1),n=Math.PI*(e*e+t*t),r=g.area,i=g.sample;g.sampleEven=null,g.area=r+n,g.sample=t=>{if(t()*g.area<r)return i(t);let a=t()*n<Math.PI*e*e?0:1,o=m(a),s=p(a)*Math.sqrt(t()),c=t()*I;return{p:Et(o.p,Et(R(o.n,s*Math.cos(c)),R(o.b,s*Math.sin(c)))),n:a?o.t:R(o.t,-1),u:c/I,v:a,t:a,tangent:o.t}}}return g}function qt(e,t,n,r=8){let i=2/r,a=(e,t)=>Math.sign(e)*Math.abs(e)**+t;return Wt((r,o)=>{let s=(o-.5)*Math.PI,c=r*I-Math.PI,l=a(Math.cos(s),i),u=a(Math.sin(s),i);return[e/2*l*a(Math.sin(c),i),t/2*u,n/2*l*a(Math.cos(c),i)]},{grid:72,thick:Math.min(e,t,n)/2,normal:(i,a,o)=>{let s=r-1;return[Math.sign(o[0])*Math.abs(2*o[0]/e)**+s/e,Math.sign(o[1])*Math.abs(2*o[1]/t)**+s/t,Math.sign(o[2])*Math.abs(2*o[2]/n)**+s/n]}})}function Jt(e,{grid:t=72,thick:n}={}){let r=0,i=Wt((t,n)=>{let i=n*Math.PI,a=t*I,o=[Math.sin(i)*Math.sin(a),Math.cos(i),Math.sin(i)*Math.cos(a)],s=e(o);return s>r&&(r=s),R(o,s)},{grid:t,thick:.5,flip:!0});return i.thick=n??r*.9,i}function Yt(e){if(typeof e==`number`)return e;if(!e)return 0;let t=F[e];if(t===void 0)throw Error(`Unknown behavior "${e}"`);return t}var Xt=class{constructor(e,{count:t=12e4,options:n={},fit:r=!0,media:i=null}={}){this.seed=e>>>0,this.count=t,this.media=i,this.fitOn=r,this.options=n,this.rand=it(ot(e,`kit-recipe`)),this.noise=st(ot(e,`kit-noise`)),this.items=[],this.parts=[{name:`body`,pivot:[0,0,0],axis:[0,1,0]}],this.partIndex=/* @__PURE__ */ new Map,this.reaches=[]}reach(e){this.reaches.push(e.slice())}sheet(e){let t={id:e.id||`sheet${(this.sheets||[]).length}`,center:(e.center||[0,0,0]).slice(),width:e.width??1,height:e.height??1,normal:B(e.normal||[0,0,1]),up:B(e.up||[0,1,0]),part:e.part??0,method:e.method||`auto`,fit:e.fit||`contain`,align:e.align||[0,0],leaf:e.leaf??null,lift:e.lift??0,opacity:e.opacity??.99};(this.sheets||=[]).push(t);let n=B(z(t.up,t.normal));for(let e of[-1,1])for(let r of[-1,1])this.reach([0,1,2].map(i=>t.center[i]+n[i]*e*t.width/2+t.up[i]*r*t.height/2));return this.sheets.length-1}spine({at:e=[0,0,0],axis:t=[0,1,0],dir:n=[1,0,0]}={}){this.spineDef={at:e.slice(),axis:B(t),dir:B(n)}}fluid(e){let t=JSON.parse(JSON.stringify({kind:`liquid`,...e}));t.name||=`${t.kind}${(this.fluids||[]).length}`,(this.fluids||=[]).push(t);for(let t of e.reach||[])this.reach(t);return this.fluids.length-1}sphere(e=.8){return Rt(e)}ellipsoid(e,t,n){return zt(e,t,n)}box(e,t,n){return Bt(e,t,n)}roundedBox(e,t,n,r=8){return qt(e,t,n,r)}cylinder(e,t,{caps:n=!0}={}){return Vt(e,e,t,n)}cone(e,t,n,{caps:r=!0}={}){return Vt(e,t,n,r)}torus(e,t){return Ht(e,t)}disc(e,t=0){return Ut(t,e)}lathe(e,t){return Gt(e,t)}tube(e,t,n){return Kt(e,t,n)}param(e,t){return Wt(e,t)}radial(e,t){return Jt(e,t)}lever({pivot:e=[0,0,0],axis:t,angle:n,dir:r,move:i,vibrate:a,channel:o=0,glow:s=null,glowChannel:c=1}={}){if(this.levers||=[],this.levers.length>=6)throw Error(`A toy can have at most 6 lever groups.`);let l=n===void 0?i===void 0?a===void 0?3:2:1:0,u=l===0?n:l===1?i:l===2?a:0,d=l===0?t||[1,0,0]:r||[0,1,0],f=s?Ft(s):null;return this.levers.push({mode:l,channel:o,pivot:e.slice(),dir:B(d),amount:u,glow:f,glowChannel:c}),this.levers.length-1}leverParam(e,t){if(t<0||t>=96)throw Error(`A lever index is 0 to 95.`);return t+128*e}part(e,{pivot:t=[0,0,0],axis:n=[0,1,0]}={}){if(this.partIndex.has(e))return this.partIndex.get(e);if(this.parts.length>=16)throw Error(`A toy can have at most 15 parts.`);this.parts.push({name:e,pivot:t.slice(),axis:B(n)});let r=this.parts.length-1;return this.partIndex.set(e,r),r}add(e,t={}){let n=t.quat||(t.rot?jt(...t.rot):[0,0,0,1]),r=t.scale===void 0?[1,1,1]:Array.isArray(t.scale)?t.scale:[t.scale,t.scale,t.scale],i=Math.abs(r[0]*r[1]*r[2])**(2/3),a={kind:`surface`,shape:e,opts:t,q:n,sc:r,pos:t.pos||[0,0,0],area:e.area*i};return this.items.push(a),a}cloud(e,t){let n={kind:`cloud`,opts:e,sample:t,area:0};return this.items.push(n),n}*emit(){let e=this.count,t=e/16e4,n=0,r=0;for(let i of this.items){let a=i.opts;i.n=a.count===void 0?a.share===void 0?-1:Math.max(1,Math.round(a.share*e)):Math.max(1,Math.round(a.count*t)),i.n>=0?n+=i.n:r+=i.area*(a.weight??1)}let i=Math.max(0,e-n);for(let e of this.items)e.n<0&&(e.n=Math.max(8,Math.round(i*e.area*(e.opts.weight??1)/(r||1))));let a=this.items.filter(e=>e.opts.count===void 0&&e.opts.share===void 0).reduce((e,t)=>e+t.n,0);this.baseSize=r>0?Math.sqrt(r/(Math.max(1,a)*Math.PI))*1.2:.01;let o=this.items.reduce((e,t)=>e+t.n,0),s=new ut(o+gt(o),{anim:!0});this.buf=s;let c=it(ot(this.seed,`kit-splats`)),l=(e,t,n,r=3)=>this.noise.fbm(e,t,n,r),u=0,d=6e3;for(let e of this.items)e.start=s.count,e.kind===`cloud`?this.emitCloud(e,c):this.emitSurface(e,c,l),e.end=s.count,u+=e.n,u>=d&&(d=u+6e3,yield u/o*.9);this.fitOn?this.fit():this.transform={center:[0,0,0],scale:1},this.encodeMorphs(),this.encodeReliefs(),yield 1}animParams(e,t,n,r,i,a){let o=Math.max(0,Math.min(e===F.morph?7:3,Math.round(i||0))),s=e=>Math.max(.005,Math.min(.99,e));if(e===F.morph){this.morph||=new Float32Array(this.buf.capacity*3);let e=this.buf.count;if(r&&e<this.buf.capacity){if(!Number.isFinite(r[0]+r[1]+r[2]))throw Error(`A morph target is not finite.`);this.morph[e*3]=r[0]-t[0],this.morph[e*3+1]=r[1]-t[1],this.morph[e*3+2]=r[2]-t[2]}return[0,o]}if(e===F.band)return[n[0]??0,o+s(n[1]??.08)];if(e===F.fade){let e=n[1]??.1;return[n[0]??0,(e<0?-1:1)*(o+s(Math.abs(e)))]}if(e===F.skin)return[(a[0]|0)+64*(a[1]|0),a[2]??0];if(e===F.skin4){let e=e=>Math.round(Math.max(0,Math.min(1,e??0))*1023);return[(a[0]|0)+64*(a[1]|0)+4096*(a[2]|0)+262144*(a[3]|0),1024*e(a[4])+e(a[5])]}if(e===F.relief){this.relief||=new Float32Array(this.buf.capacity);let e=this.buf.count;e<this.buf.capacity&&(this.relief[e]=Math.max(0,n[3]??0));let t=Math.max(0,Math.min(3,Math.round(n[2]??1)));return[Math.max(0,Math.min(1,n[0]??0))+2*t,Math.max(0,Math.min(1,n[1]??0))]}return[n[0]??0,n[1]??0]}encodeMorphs(){if(!this.morph)return;let e=this.buf,t=this.transform.scale,n=e=>Math.max(0,Math.min(4095,Math.round(e*t*2048/2)+2048));for(let t=0;t<e.count;t++){if(e.anim[t*4+1]!==F.morph)continue;let r=this.morph,i=e.anim[t*4+3];e.anim[t*4+2]=n(r[t*3])*4096+n(r[t*3+1]),e.anim[t*4+3]=n(r[t*3+2])+4096*i}}encodeReliefs(){if(!this.relief)return;let e=this.buf,t=this.transform.scale;for(let n=0;n<e.count;n++)e.anim[n*4+1]===F.relief&&(e.anim[n*4+3]+=2*Math.min(4e3,Math.round(this.relief[n]*t*1e3)))}emitSurface(e,t,n){let r=e.opts,i=this.buf,a=r.weight??1,o=this.baseSize/Math.sqrt(a)*(r.size??1),s=r.flat??.2,c=Math.round(e.n*(r.interior??0)),l=e.n-c,u=typeof r.to==`function`?r.to:null,d=typeof r.skin==`function`?r.skin:null,f=u?F.morph:d?F.skin:Yt(r.kind),p=typeof r.channel==`function`?r.channel:null,m=typeof r.part==`function`?r.part:null,h=m?0:r.part??0,g=r.pattern===!1?16:0,_=r.jitter??.04,v=r.opacity??.95,y=typeof r.color==`function`?r.color:null,b=y?null:Ft(r.color??`#cccccc`),x=typeof r.core==`function`?r.core:null,S=r.core&&!x?Ft(r.core):null,C=typeof r.params==`function`?r.params:null,w=C?null:r.params||[0,0],T={rand:t,noise:this.noise,fbm:n,toy:this},E=e.sc,D=[1/(E[0]||1),1/(E[1]||1),1/(E[2]||1)],O=e.shape,ee=r.even?Zt(t,O.sampleEven?2:O.dims??3):null,k=e=>{if(!ee)return O.sample(t);let n=ee(e);return O.sampleEven?O.sampleEven(n(),n()):O.sample(n)};for(let n=0;n<e.n;n++){let a=n>=l,c=a?e.shape.sample(t):k(n),O=c.p;if(a){let n=.08+.88*t()**.7;O=L(O,R(c.n,n*(c.thick??e.shape.thick)))}let ee=Et(Mt(e.q,[O[0]*E[0],O[1]*E[1],O[2]*E[2]]),e.pos),te=B(Mt(e.q,[c.n[0]*D[0],c.n[1]*D[1],c.n[2]*D[2]]));T.p=ee,T.n=te,T.lp=c.p,T.ln=c.n,T.u=c.u,T.v=c.v,T.t=c.t,T.s=c,T.inside=a;let A;if(A=a?x?x(T):S||H(y?y(T):b,.8):y?y(T):b,A===null)continue;let ne=g,re=1;A&&!Array.isArray(A)&&typeof A==`object`&&(A.keep&&(ne=16),A.size&&(re=A.size),A=A.c),A=Ft(A);let j=o*re*Math.exp((t()-.5)*.5),ie,ae;if(a){let e=j*1.5;ie=[e,e,e],ae=[0,0,0,1]}else if(r.stretch&&c.tangent){let t=B(Mt(e.q,[c.tangent[0]*E[0],c.tangent[1]*E[1],c.tangent[2]*E[2]])),n=B(L(t,R(te,Dt(t,te))));ie=[j*r.stretch,j*.8,j*s],ae=Pt(n,z(te,n),te)}else ie=[j,j*(.85+t()*.3),j*s],ae=ft(te,t()*I);let M=_,N=[Lt(A[0]+(t()-.5)*M),Lt(A[1]+(t()-.5)*M),Lt(A[2]+(t()-.5)*M),a?.9:v],oe=C?C(T):w,se=p?p(T):r.channel??0,P=d?.(T),ce=P?.length>=6?F.skin4:f,[le,ue]=this.animParams(ce,ee,oe,u?.(T),se,P),de=m?m(T):h;i.push(ee,ie,ae,N,[de+ne,ce,le,ue])}}emitCloud(e,t){let n=e.opts,r=this.buf,i=(this.baseSize||.01)*(n.size??1);for(let a=0;a<e.n;a++){let o=e.sample(t,a,e.n);if(!o)continue;let s=Ft(o.color??n.color??`#ffffff`),c=o.jitter??n.jitter??.5,l=i*(o.size??1)*Math.exp((t()-.5)*c),u,d;if(o.scales)u=o.scales,d=o.quat??[0,0,0,1];else if(o.n)u=[l,l,l*(o.flat??n.flat??.3)],d=ft(B(o.n),t()*I);else if(o.dir){let e=B(o.dir),t=Math.abs(e[1])<.9?[0,1,0]:[1,0,0],n=B(z(t,e));u=[l*(o.stretch??3),l*.7,l*.7],d=Pt(e,n,z(e,n))}else u=[l,l,l],d=[0,0,0,1];let f=o.to?F.morph:o.skin?o.skin.length>=6?F.skin4:F.skin:Yt(o.kind??n.kind),p=o.params??n.params??[0,0],m=o.part??n.part??0,h=((o.pattern??n.pattern)===!1?16:0)+(o.photo??n.photo?32:0),[g,_]=this.animParams(f,o.p,p,o.to,o.channel??n.channel,o.skin);r.push(o.p,u,d,[s[0],s[1],s[2],o.opacity??n.opacity??.9],[m+h,f,g,_])}}fit(){let e=this.buf,t=[1/0,1/0,1/0],n=[-1/0,-1/0,-1/0],r=(e,r,i)=>{let a=[e,r,i];for(let e=0;e<3;e++)a[e]<t[e]&&(t[e]=a[e]),a[e]>n[e]&&(n[e]=a[e])},i=new Uint8Array(e.count);for(let e of this.items)e.opts.fit===!1&&i.fill(1,e.start,e.end);for(let t=0;t<e.count;t++)i[t]||r(e.pos[t*3],e.pos[t*3+1],e.pos[t*3+2]);for(let e of this.reaches)r(e[0],e[1],e[2]);let a=[];if(this.morph&&this.fitMorphs!==!1)for(let t=0;t<e.count;t++){if(e.anim[t*4+1]!==F.morph)continue;let n=this.morph,r=[0,1,2].map(r=>e.pos[t*3+r]+n[t*3+r]);(n[t*3]||n[t*3+1]||n[t*3+2])&&a.push(r)}for(let e of a)r(e[0],e[1],e[2]);if(t[0]===1/0){this.transform={center:[0,0,0],scale:1};return}let o=[(t[0]+n[0])/2,(t[1]+n[1])/2,(t[2]+n[2])/2],s=0;for(let t=0;t<e.count;t++){if(i[t])continue;let n=e.pos[t*3]-o[0],r=e.pos[t*3+1]-o[1],a=e.pos[t*3+2]-o[2];s=Math.max(s,n*n+r*r+a*a)}for(let e of[...this.reaches,...a])s=Math.max(s,(e[0]-o[0])**2+(e[1]-o[1])**2+(e[2]-o[2])**2);let c=.95/(Math.sqrt(s)||1),l=F.sway;for(let t=0;t<e.count;t++){for(let n=0;n<3;n++)e.pos[t*3+n]=(e.pos[t*3+n]-o[n])*c,e.scale[t*3+n]*=c;e.anim[t*4+1]===l&&(e.anim[t*4+3]=(e.anim[t*4+3]-o[1])*c)}this.baseSize*=c;for(let e of this.parts)e.pivot=R(L(e.pivot,o),c);for(let e of this.levers||[])e.pivot=R(L(e.pivot,o),c),(e.mode===1||e.mode===2)&&(e.amount*=c);this.reaches=this.reaches.map(e=>R(L(e,o),c)),this.transform={center:o,scale:c}}toToy(e){let t=this.transform;return R(L(e,t.center),t.scale)}};function Zt(e,t){let n=2;for(let e=0;e<30;e++)n=(1+n)**(1/(t+1));let r=[],i=[];for(let a=0;a<t;a++)r.push(1/n**+(a+1)),i.push(e());return n=>{let a=0;return()=>{if(a>=t)return e();let o=i[a]+r[a]*n;return a++,o-Math.floor(o)}}}function Qt(e){let t=0,n=0,r=Math.max(1,Math.floor(e.count/2e4));for(let i=0;i<e.count;i+=r)e.color[i*4+3]<=0||(t+=.299*e.color[i*4]+.587*e.color[i*4+1]+.114*e.color[i*4+2],n++);return n?t/n:.5}function $t(e){let t=null,n=e=>Math.min(23,Math.max(0,Math.floor((e+1)/2*24))),r=()=>{t=/* @__PURE__ */ new Map;for(let r=0;r<e.count;r++){if(e.color[r*4+3]<=0)continue;let i=n(e.pos[r*3])+24*(n(e.pos[r*3+1])+24*n(e.pos[r*3+2])),a=t.get(i);a||t.set(i,a=[]),a.length<64&&a.push(r)}};return{surface(i){t||r();let a=n(i[0]),o=n(i[1]),s=n(i[2]),c=-1,l=1/0;for(let n=0;n<=3&&c<0;n++)for(let r=s-n;r<=s+n;r++)for(let s=o-n;s<=o+n;s++)for(let o=a-n;o<=a+n;o++){if(o<0||s<0||r<0||o>=24||s>=24||r>=24)continue;let n=t.get(o+24*(s+24*r));if(n)for(let t of n){let n=(e.pos[t*3]-i[0])**2+(e.pos[t*3+1]-i[1])**2+(e.pos[t*3+2]-i[2])**2;n<l&&(l=n,c=t)}}return c<0?[.8,.8,.8]:[e.color[c*4],e.color[c*4+1],e.color[c*4+2]]},core(e){return this.surface(e)},displace(){return 0}}}function*en(e,{seed:t,count:n,options:r={},clay:i=[],media:a=null},o){let s=new Xt(t,{count:n,options:r,media:a});e.build(s,r);let c=s.emit(),l=c.next();for(;!l.done;)yield l.value*.95,l=c.next();let u={g:{seed:t,count:n,sizeJitter:.3},buf:s.buf,base:s.baseSize,coloring:$t(s.buf),parts:s.parts,reaches:s.reaches,transform:s.transform,recipe:e,kit:s};for(let e=0;e<i.length;e++)o(u,i[e],e);return u.lum=Qt(s.buf),yield 1,u}const tn=Math.PI*2,nn=e=>Math.min(1,Math.max(0,e));function rn(e,t,n){let r=e/2,i=t/2,a=n/2,o=[{a:t*n,n:[1,0,0]},{a:t*n,n:[-1,0,0]},{a:e*n,n:[0,1,0]},{a:e*n,n:[0,-1,0]},{a:e*t,n:[0,0,1]},{a:e*t,n:[0,0,-1]}],s=o.reduce((e,t)=>e+t.a,0),c=(s,c,l)=>{let u=o[s].n,d;return d=u[0]?[r*u[0],(c-.5)*t,(l-.5)*n]:u[1]?[(c-.5)*e,i*u[1],(l-.5)*n]:[(c-.5)*e,(l-.5)*t,a*u[2]],{p:d,n:u,u:c,v:l,face:s}},l=e=>{let t=e*s;for(let e=0;e<6;e++){if(t<o[e].a||e===5)return[e,nn(t/o[e].a)];t-=o[e].a}return[5,.5]};return{area:s,thick:Math.min(r,i,a),sample(e){let[t]=l(e());return c(t,e(),e())},sampleEven(e,t){let[n,r]=l(e);return c(n,r,t)}}}function an(e,t,n,r=!0){let i=Math.hypot(n,e-t),a=Math.PI*(e+t)*i,o=r===!0||r===`bottom`?Math.PI*e*e:0,s=r===!0||r===`top`?Math.PI*t*t:0,c=a+o+s,l=(e-t)/i,u=n/i,d=(r,i,s)=>{let c=Math.cos(s),d=Math.sin(s);if(r<a){let r;r=Math.abs(t-e)<1e-6?i:(Math.sqrt(e*e+i*(t*t-e*e))-e)/(t-e);let a=e+(t-e)*r;return{p:[a*d,-n/2+n*r,a*c],n:[d*u,l,c*u],u:s/tn,v:1-r,side:!0,thick:a}}let f=r>=a+o,p=f?t:e,m=p*Math.sqrt(i);return{p:[m*d,f?n/2:-n/2,m*c],n:[0,f?1:-1,0],u:s/tn,v:+!f,cap:f?`top`:`bottom`,radial:p>0?m/p:0}},f=e=>e<a?e/a:e<a+o?(e-a)/o:(e-a-o)/s;return{area:c,thick:Math.min(Math.max(e,t),n/2),sample(e){let t=e()*c,n=e()*tn;return d(t,e(),n)},sampleEven(e,t){let n=Math.min(e,1-1e-9)*c;return d(n,nn(f(n)),t*tn)}}}function on(e,t,n,r=96){return e.param((e,r)=>{let i=tn*e,a=tn*r,o=t+n*Math.cos(a);return[o*Math.cos(i),n*Math.sin(a),o*Math.sin(i)]},{grid:r,thick:n,flip:!0})}function sn(e,t,n,r,i=64){return e.param((e,i)=>{let a=i*Math.PI,o=e*tn;return[t*Math.sin(a)*Math.sin(o),n*Math.cos(a),r*Math.sin(a)*Math.cos(o)]},{grid:i,flip:!0,thick:Math.min(t,n,r)})}function cn(e,t,n,r={}){let i=e.tube(t,n,{...r,caps:!1});if(!r.caps||r.closed)return i;let a=typeof n==`function`?n:()=>n,o=a(0),s=a(1),c=Math.PI*o*o,l=c+Math.PI*s*s,u=i.area,d=u+l,f=(e,t,n)=>{let r=i.frame(e),o=a(e)*Math.sqrt(t);return{p:[0,1,2].map(e=>r.p[e]+r.n[e]*o*Math.cos(n)+r.b[e]*o*Math.sin(n)),n:e?r.t:r.t.map(e=>-e),u:n/tn,v:e,t:e,tangent:r.t}};return{...i,area:d,sample(e){if(e()*d<u)return i.sample(e);let t=e()*l<c?0:1;return f(t,e(),e()*tn)},sampleEven(e,t){let n=Math.min(e,1-1e-9)*d;if(n<u)return i.sampleEven(n/u,t);let r=n-u;return r<c?f(0,r/c,t*tn):f(1,(r-c)/(l-c),t*tn)}}}const ln=Object.fromEntries(Object.entries({A:`01110 10001 10001 11111 10001 10001 10001`,B:`11110 10001 10001 11110 10001 10001 11110`,C:`01110 10001 10000 10000 10000 10001 01110`,D:`11110 10001 10001 10001 10001 10001 11110`,E:`11111 10000 10000 11110 10000 10000 11111`,F:`11111 10000 10000 11110 10000 10000 10000`,G:`01110 10001 10000 10111 10001 10001 01111`,H:`10001 10001 10001 11111 10001 10001 10001`,I:`01110 00100 00100 00100 00100 00100 01110`,J:`00111 00010 00010 00010 00010 10010 01100`,K:`10001 10010 10100 11000 10100 10010 10001`,L:`10000 10000 10000 10000 10000 10000 11111`,M:`10001 11011 10101 10101 10001 10001 10001`,N:`10001 10001 11001 10101 10011 10001 10001`,O:`01110 10001 10001 10001 10001 10001 01110`,P:`11110 10001 10001 11110 10000 10000 10000`,Q:`01110 10001 10001 10001 10101 10010 01101`,R:`11110 10001 10001 11110 10100 10010 10001`,S:`01111 10000 10000 01110 00001 00001 11110`,T:`11111 00100 00100 00100 00100 00100 00100`,U:`10001 10001 10001 10001 10001 10001 01110`,V:`10001 10001 10001 10001 10001 01010 00100`,W:`10001 10001 10001 10101 10101 10101 01010`,X:`10001 10001 01010 00100 01010 10001 10001`,Y:`10001 10001 10001 01010 00100 00100 00100`,Z:`11111 00001 00010 00100 01000 10000 11111`,".":`00000 00000 00000 00000 00000 01100 01100`,",":`00000 00000 00000 00000 01100 00100 01000`,"'":`00100 00100 01000 00000 00000 00000 00000`,"!":`00100 00100 00100 00100 00100 00000 00100`,"?":`01110 10001 00001 00010 00100 00000 00100`,"-":`00000 00000 00000 11111 00000 00000 00000`,0:`01110 10001 10011 10101 11001 10001 01110`,1:`00100 01100 00100 00100 00100 00100 01110`,2:`01110 10001 00001 00010 00100 01000 11111`,3:`11111 00010 00100 00010 00001 10001 01110`,4:`00010 00110 01010 10010 11111 00010 00010`,5:`11111 10000 11110 00001 00001 10001 01110`,6:`00110 01000 10000 11110 10001 10001 01110`,7:`11111 00001 00010 00100 01000 01000 01000`,8:`01110 10001 10001 01110 10001 10001 01110`,9:`01110 10001 10001 01111 00001 00010 01100`}).map(([e,t])=>[e,t.split(` `).map(e=>parseInt(e,2))]));function un(e,t,n,r=10){let i=Math.floor(n/r),a=Math.floor(n-i*r);if(i<0||i>=e.length||a>6||t<0)return!1;let o=Math.floor(t/6),s=Math.floor(t-o*6),c=e[i][o];if(!c||s>4)return!1;let l=ln[c];return!!l&&(l[a]>>4-s&1)==1}function dn(e,t=2){let n=[];if(e.type===`box`){let r=[];for(let e=0;e<=t;e++)r.push((-1+2*e/t)*.9);for(let t=0;t<3;t++)for(let i of[-1,1])for(let a of r)for(let o of r){let r=[0,0,0];r[t]=i*e.half[t],r[(t+1)%3]=a*e.half[(t+1)%3],r[(t+2)%3]=o*e.half[(t+2)%3],n.push(r)}}else if(e.type===`ellipsoid`||e.type===`sphere`){let r=e.type===`sphere`?[e.r,e.r,e.r]:e.r,i=6+2*t,a=[8,16,25,36,50,66].map(e=>e*Math.PI/180);n.push([0,r[1],0],[0,-r[1],0]);for(let e of[1,-1])a.forEach((t,a)=>{for(let o=0;o<i;o++){let s=(o+a%2*.5)*Math.PI*2/i,c=Math.sin(t);n.push([r[0]*c*Math.cos(s),e*r[1]*Math.cos(t),r[2]*c*Math.sin(s)])}});for(let e=0;e<i;e++){let t=e*Math.PI*2/i;n.push([r[0]*Math.cos(t),0,r[2]*Math.sin(t)])}}else if(e.type===`cylinder`){let r=6+4*t;for(let t of[-e.h,e.h]){n.push([0,t,0]);for(let i=0;i<r;i++){let a=i*Math.PI*2/r;n.push([e.r*.9*Math.cos(a),t,e.r*.9*Math.sin(a)]),n.push([e.r*.5*Math.cos(a+.3),t,e.r*.5*Math.sin(a+.3)])}}for(let t=0;t<r;t++){let i=t*Math.PI*2/r;n.push([e.r*Math.cos(i),0,e.r*Math.sin(i)])}}return n}const fn=e=>e<.5?2*e*e:1-(-2*e+2)**2/2,G=Math.PI*2,K=(e,t)=>[e[0]+t[0],e[1]+t[1],e[2]+t[2]],q=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],J=(e,t)=>[e[0]*t,e[1]*t,e[2]*t],pn=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],mn=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],hn=e=>Math.hypot(e[0],e[1],e[2]),gn=e=>J(e,1/(hn(e)||1)),Y=(e,t)=>({c:e,keep:!0,size:t}),X=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2,_n=`E6 D6 C6 D6 E6 E6 E6 - D6 D6 D6 - E6 G6 G6 -`.split(` `),vn={a:null,lid:0,slot:null,again:!1},yn={a0:0,h0:0},bn={off:0,pop:0,v:0,t:null},xn={type:`box`,half:[.535,.08,.535]},Sn={type:`box`,half:[.5,.39,.5]},Cn=(()=>{let e=1.05,t=.72,n=.45,r=n*e*.93,i=-.42*n**1.7+.06*n*.55-.012,a=-.05;return{R:e,top:t,droop:.42,r0:r,dy0:i,ry:a,L:Math.hypot(r,t+i-a),shut:1.18}})();function wn(e){let{r0:t,dy0:n,top:r,L:i,ry:a}=Cn,o=t*Math.cos(e)+n*Math.sin(e);return r-t*Math.sin(e)+n*Math.cos(e)-Math.sqrt(Math.max(0,i*i-o*o))-a}function Tn(e){let t=0,n=Cn.shut;for(let r=0;r<24;r++){let r=(t+n)/2;wn(r)>e?t=r:n=r}return(t+n)/2}const En={yaw:0,spin:0},Z=(()=>{let e=[0,.06,-.1],t=[-.05,.9,-.35],n=[.42,1.22,-.05],r=gn([.35,-1,.35]),i=K(n,J(r,.14)),a=K(i,J(r,.07));return{base:e,elbow:t,joint:n,dir:r,head:i,bulbAt:a,pool:K(a,J(r,(0-a[1])/r[1]))}})(),Dn={light:1},On={off:0,out:!1,t0:-1e9},kn={type:`ellipsoid`,r:[.12,.1,.12]},An={type:`sphere`,r:.5},jn=e=>1+2.70158*(e-1)**3+1.70158*(e-1)**2,Mn=e=>e<=0||e>=1?0:Math.sin(Math.PI*e),Nn=(e,t,n)=>U((e-t)/(n-t),0,1);function Pn(e,t,n,r=96){return e.param((e,r)=>{let i=G*e,a=G*r,o=t+n*Math.cos(a);return[o*Math.cos(i),n*Math.sin(a),o*Math.sin(i)]},{grid:r,thick:n})}function Fn(e,t){let n=2;for(let e=0;e<20;e++)n=(1+n)**(1/(t+1));let r=[];for(let i=0;i<t;i++){let t=.5+e/n**+(i+1);r.push(t-Math.floor(t))}return r}const In=gn([.4,.85,.55]),Ln=gn([.5,.35,.8]),Rn=gn(K(In,Ln));function Q(e,t,{amb:n=.62,dif:r=.45,spec:i=.25,pow:a=28}={}){let o=H(e,n+r*Math.max(0,pn(t,In)));return i>0&&(o=V(o,[1,1,1],i*Math.max(0,pn(t,Rn))**+a)),o}function $(e,t=null){let n=q(J(e,2*pn(e,Ln)),Ln)[1],r=n>0?V(`#9aa3ad`,`#f7f9fc`,n**.5):V(`#6d5a48`,`#2e2723`,(-n)**.6);return r=V(r,`#262a31`,.7*W(.22,0,Math.abs(n+.04))),t&&(r=V(r,H(t,.6+.6*r[1]),.65)),V(r,[1,1,1],Math.max(0,pn(e,Rn))**60)}function zn(e,t,n){let r=r=>{let i=(r+e*6)%6;return n-n*t*Math.max(0,Math.min(i,4-i,1))};return[r(5),r(3),r(1)]}const Bn=/* @__PURE__ */ new WeakMap;function Vn(e){let t=Bn.get(e);return t||Bn.set(e,t={}),t}function Hn(e,t,n,r){let i=e[`t_`+t];e[`t_`+t]=n;let a=i===void 0?0:U(n-i,0,.25);return e[t]=(e[t]??0)+a*r,e[t]}function Un(e,t,n,r,{top:i=!0,bottom:a=!0,even2d:o=!1}={}){let s=[e/2-r,t/2-r,n/2-r],c=[s[0]*2,s[1]*2,s[2]*2],l=[];[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach((e,t)=>{if(!a&&t===3||!i&&t===2)return;let n=t>>1;l.push({area:c[(n+1)%3]*c[(n+2)%3],kind:0,f:t,n:e,ax:n})});for(let e=0;e<3;e++)for(let t of[-1,1])for(let n of[-1,1])l.push({area:Math.PI/2*r*c[e],kind:1,ax:e,s1:t,s2:n});for(let e of[-1,1])for(let t of[-1,1])for(let n of[-1,1])l.push({area:Math.PI/2*r*r,kind:2,sg:[e,t,n]});let u=0;for(let e of l)e.cum=u+=e.area;return{area:u,thick:Math.min(e,t,n)/2,sampleEven:o?(e,t)=>{let n=Math.min(e,1-1e-9)*u,i=l[l.length-1];for(let e of l)if(n<e.cum){i=e;break}let a=Math.min(1,Math.max(0,(n-(i.cum-i.area))/i.area)),o=[0,0,0];if(i.kind===0){let e=(i.ax+1)%3,n=(i.ax+2)%3;return o[i.ax]=i.n[i.ax]*(s[i.ax]+r),o[e]=(a-.5)*c[e],o[n]=(t-.5)*c[n],{p:o,n:i.n,u:a,v:t,face:i.f}}if(i.kind===1){let e=(i.ax+1)%3,n=(i.ax+2)%3,l=Math.PI/2*t,u=[0,0,0];return u[e]=i.s1*Math.cos(l),u[n]=i.s2*Math.sin(l),o[i.ax]=(a-.5)*c[i.ax],o[e]=i.s1*s[e]+u[e]*r,o[n]=i.s2*s[n]+u[n]*r,{p:o,n:u,u:0,v:0,face:-1}}let d=a,f=Math.PI/2*t,p=Math.sqrt(Math.max(0,1-d*d)),m=[p*Math.cos(f),p*Math.sin(f),d],h=[0,1,2].map(e=>m[e]*i.sg[e]);for(let e=0;e<3;e++)o[e]=i.sg[e]*s[e]+h[e]*r;return{p:o,n:h,u:0,v:0,face:-1}}:void 0,sample(e){let t=e()*u,n=l[l.length-1];for(let e of l)if(t<e.cum){n=e;break}let i=[0,0,0];if(n.kind===0){let t=(n.ax+1)%3,a=(n.ax+2)%3,o=e(),l=e();return i[n.ax]=n.n[n.ax]*(s[n.ax]+r),i[t]=(o-.5)*c[t],i[a]=(l-.5)*c[a],{p:i,n:n.n,u:o,v:l,face:n.f}}if(n.kind===1){let t=(n.ax+1)%3,a=(n.ax+2)%3,o=e()*(Math.PI/2),l=[0,0,0];return l[t]=n.s1*Math.cos(o),l[a]=n.s2*Math.sin(o),i[n.ax]=(e()-.5)*c[n.ax],i[t]=n.s1*s[t]+l[t]*r,i[a]=n.s2*s[a]+l[a]*r,{p:i,n:l,u:0,v:0,face:-1}}let a,o;do a=[e()*2-1,e()*2-1,e()*2-1],o=Math.hypot(a[0],a[1],a[2]);while(o<.001||o>1);let d=[0,1,2].map(e=>Math.abs(a[e])/o*n.sg[e]);for(let e=0;e<3;e++)i[e]=n.sg[e]*s[e]+d[e]*r;return{p:i,n:d,u:0,v:0,face:-1}}}}function Wn(e,t,n=1){let r=[0,n,0];return{area:e*t,thick:.01,dims:2,sample(i){let a=i(),o=i();return{p:[(a-.5)*e,0,(o-.5)*t],n:r,u:a,v:o,face:n>0?2:3}}}}function Gn(e,t,n){let r=mn(q(t,e),q(n,e)),i=gn(r);return{area:.5*hn(r),thick:.02,sample(r){let a=Math.sqrt(r()),o=r(),s=1-a,c=a*(1-o),l=a*o;return{p:[e[0]*s+t[0]*c+n[0]*l,e[1]*s+t[1]*c+n[1]*l,e[2]*s+t[2]*c+n[2]*l],n:i,u:c,v:l}}}}const Kn={0:[[0,0,1,0],[1,0,1,2],[1,2,0,2],[0,2,0,0]],1:[[.5,0,.5,2]],2:[[0,2,1,2],[1,2,1,1],[1,1,0,1],[0,1,0,0],[0,0,1,0]],3:[[0,2,1,2],[1,2,1,0],[1,0,0,0],[.25,1,1,1]],4:[[0,2,0,1],[0,1,1,1],[1,2,1,0]],5:[[1,2,0,2],[0,2,0,1],[0,1,1,1],[1,1,1,0],[1,0,0,0]],6:[[1,2,0,2],[0,2,0,0],[0,0,1,0],[1,0,1,1],[1,1,0,1]],7:[[0,2,1,2],[1,2,.4,0]],8:[[0,0,1,0],[1,0,1,2],[1,2,0,2],[0,2,0,0],[0,1,1,1]],9:[[1,1,0,1],[0,1,0,2],[0,2,1,2],[1,2,1,0],[1,0,0,0]]};function qn(e,t,n){let r=n[2]-n[0],i=n[3]-n[1],a=U(((e-n[0])*r+(t-n[1])*i)/(r*r+i*i||1),0,1);return Math.hypot(e-n[0]-r*a,t-n[1]-i*a)}function Jn(e,t,n){let r=1.5,i=(e.length-1)*r+1,a=1/0;for(let o=0;o<e.length;o++){let s=t+i/2-o*r,c=n+1;if(!(s<-.6||s>1.6))for(let t of Kn[e[o]]||[])a=Math.min(a,qn(s,c,t))}return a}function Yn(e,t,n=5){let r=[];for(let i=0;i<n*2;i++){let a=i/(n*2)*G,o=i%2?t:e;r.push([Math.sin(a)*o,Math.cos(a)*o])}return r}const Xn={W:1,H:1.36,ct:.045,leaves:10,lt:.013};function Zn(e,t,n){let r=`ONCE UPON A TIME, IN A TOY BOX AT THE END OF A LONG HALL, THERE LIVED A SMALL SPLAT CALLED PIP. PIP WAS NOT A BALL AND NOT A BLOCK. PIP WAS A SOFT LITTLE CLOUD OF COLOR THAT COULD BE ANYTHING AT ALL. ON MONDAY PIP WAS A RED APPLE. ON TUESDAY PIP WAS A BLUE WHALE. ON WEDNESDAY PIP TRIED TO BE THE MOON, AND EVERY TOY IN THE BOX CAME TO LOOK. WHAT WILL YOU BE TOMORROW? ASKED THE OLD TEDDY BEAR. PIP THOUGHT FOR A WHILE. I THINK, SAID PIP, I WILL BE A STORY. AND SO PIP BECAME THIS BOOK, AND NOW YOU ARE READING IT. THE END.`.split(/\s+/),i=[],a=``;for(let o=0;i.length<n;o++){let n=r[(t+o)%r.length];a&&a.length+1+n.length>e?(i.push(a),a=n):a=a?`${a} ${n}`:n}return i}Xn.pb=.27,Xn.T=Xn.pb+2*Xn.ct;const Qn={W:1.5,D:1,hb:.06,hl:.035,open:1.85},$n=(()=>{let e=[[`1234567890`,[[`DEL`,.16]]],[`QWERTYUIOP`,[]],[`ASDFGHJKL`,[[`ENTER`,.16]]],[`ZXCVBNM,.`,[]]],t=[],n=.088;return e.forEach(([e,r],i)=>{let a=-.35+i*.095,o=[...e].map(e=>[e,n]).concat(r),s=-(o.reduce((e,[,t])=>e+t,0)+(o.length-1)*.017)/2;for(let[e,r]of o)t.push({id:e,label:e,x:s+r/2,z:a,w:r,d:n}),s+=r+.017}),t.push({id:`SPACE`,label:``,x:0,z:.03,w:.52,d:n}),t})(),er={x:0,z:.3,w:.44,d:.26},tr=e=>Math.abs(e[0]-er.x)<er.w/2&&Math.abs(e[2]-er.z)<er.d/2,nr=e=>[U((e[0]-er.x)/er.w+.5,.02,.94),U((e[2]-er.z)/er.d+.5,.02,.9)];function rr(e){let t=e===` `?`SPACE`:e===`Backspace`?`DEL`:e===`Enter`?`ENTER`:e.length===1?e.toUpperCase():``;return $n.findIndex(e=>e.id===t)}const ir=()=>({text:`Hello! Tap the keys,
or type on your own
keyboard.
`,pointer:[.78,.7],target:[.78,.7],clickAt:-99,pressKey:-1,pressAt:-99,queue:[],dragFrom:null,lastTime:null,open:!0}),ar=ir();function or(e,t,n){t.id===`DEL`?e.text=e.text.slice(0,-1):t.id===`ENTER`?e.text+=`
`:t.id===`SPACE`?e.text+=` `:e.text+=n??t.id.toLowerCase();let r=e.text.split(`
`);r.length>6&&(e.text=r.slice(-6).join(`
`)),e.text.length>240&&(e.text=e.text.slice(-240))}function sr(e,t){let n=ar,r=e.canvas.width,i=e.canvas.height,a=e.createLinearGradient(0,0,0,i);a.addColorStop(0,`#2b1b6b`),a.addColorStop(.55,`#ff5e98`),a.addColorStop(1,`#ff9a62`),e.fillStyle=a,e.fillRect(0,0,r,i),e.fillStyle=`rgba(18, 194, 181, 0.55)`,e.beginPath(),e.moveTo(0,i);for(let t=0;t<=r;t+=16)e.lineTo(t,i*.8+18*Math.sin(t/70));e.lineTo(r,i),e.fill();let o=r*.06,s=i*.08,c=r*.88,l=i*.8;e.fillStyle=`rgba(0,0,0,0.35)`,e.fillRect(o+6,s+8,c,l),e.fillStyle=`#fbfaf6`,e.fillRect(o,s,c,l),e.fillStyle=`#d9dde4`,e.fillRect(o,s,c,40);for(let[t,n]of[`#ff5f57`,`#febc2e`,`#28c840`].entries())e.fillStyle=n,e.beginPath(),e.arc(o+22+t*24,s+20,8,0,Math.PI*2),e.fill();e.fillStyle=`#3a3f47`,e.font=`bold 22px sans-serif`,e.textAlign=`center`,e.fillText(`Notes`,o+c/2,s+28),e.textAlign=`left`,e.fillStyle=`#1f2329`,e.font=`bold 36px sans-serif`;let u=n.text.split(`
`);if(u.forEach((t,n)=>e.fillText(t,o+20,s+84+n*44)),Math.floor(t*2)%2==0){let t=u[u.length-1],n=o+22+e.measureText(t).width,r=s+84+(u.length-1)*44;e.fillStyle=`#2f6bff`,e.fillRect(n,r-32,4,40)}let d=t-n.clickAt,f=n.pointer[0]*r,p=n.pointer[1]*i;d>=0&&d<.5&&(e.strokeStyle=`rgba(47,107,255,${1-d/.5})`,e.lineWidth=5,e.beginPath(),e.arc(f,p,10+50*d,0,Math.PI*2),e.stroke()),e.fillStyle=`#ffffff`,e.strokeStyle=`#111111`,e.lineWidth=3,e.beginPath(),e.moveTo(f,p),e.lineTo(f,p+34),e.lineTo(f+9,p+26),e.lineTo(f+16,p+40),e.lineTo(f+22,p+37),e.lineTo(f+15,p+23),e.lineTo(f+26,p+23),e.closePath(),e.fill(),e.stroke()}const cr={yawAt:[0,.62,-.12],hub:[0,.62,.2]},lr={dir:gn([.72,.5,-.3]),mount:[0,.2,0]},ur=[0,1,2].map(e=>({x:-.25+e*.25,z:.1-e*.08,phase:e/3})),dr=[[`local`,`This device`],[`UTC`,`UTC`],[`America/Los_Angeles`,`Los Angeles`],[`America/Denver`,`Denver`],[`America/Chicago`,`Chicago`],[`America/New_York`,`New York`],[`America/Sao_Paulo`,`São Paulo`],[`Europe/London`,`London`],[`Europe/Paris`,`Paris`],[`Africa/Cairo`,`Cairo`],[`Asia/Dubai`,`Dubai`],[`Asia/Kolkata`,`Mumbai`],[`Asia/Shanghai`,`Beijing`],[`Asia/Tokyo`,`Tokyo`],[`Australia/Sydney`,`Sydney`],[`Pacific/Auckland`,`Auckland`]],fr=/* @__PURE__ */ new Map;function pr(e,t){if(!t)return[e.getHours(),e.getMinutes(),e.getSeconds()];let n=fr.get(t);if(n===void 0){try{n=new Intl.DateTimeFormat(`en-US`,{timeZone:t,hour:`numeric`,minute:`numeric`,second:`numeric`,hourCycle:`h23`})}catch{n=null}fr.set(t,n)}if(!n)return[e.getHours(),e.getMinutes(),e.getSeconds()];let r=n.formatToParts(e),i=e=>Number(r.find(t=>t.type===e)?.value??0);return[i(`hour`)%24,i(`minute`),i(`second`)]}const mr={chest:{alive:!0,options:[{key:`wood`,label:`Wood`,type:`color`,default:`#8a5a2b`}],controls:[{key:`open`,label:`Open`,type:`toggle`,default:0,ease:1.1}],action:{key:`open`,label:`Open or close`},hands:{joints:[{type:`hinge`,part:`lid`,pivot:[0,.1,-.37],axis:[-1,0,0],min:0,max:1.95,bounce:.15,start:e=>1.95*fn(e.open),pos:[0,.24,0],pick:[.66,.24,.44],sound:(e,t)=>e.v<1?[{voice:`thud`,f:90,vol:t},{voice:`wood`,f:220,decay:.5,vol:t*.6}]:{voice:`wood`,f:300,decay:.4,vol:t*.5}}]},drive(e,t,n){let r=fn(t.open);n.parts.lid={angle:-1.95*r},n.amount=r},build(e,t){let n=1.2,r=.6,i=.74,a=r/2-.2,o=t.wood,s=`#d4a63c`,c=e=>{let t=Math.abs((e.p[1]+1)*7.5%1-.5)>.46,n=e.fbm(e.p[0]*2,e.p[1]*12,e.p[2]*2);return H(V(o,H(o,.72),.5+.35*n),t?.55:1)};e.add(rn(n,r,i),{even:!0,opacity:1,jitter:.012,pos:[0,-.2,0],flat:.2,color:e=>e.s.face===2?null:c(e)});for(let t of[-.36,.36])e.add(rn(.08,.62,.76),{even:!0,opacity:1,jitter:.012,pos:[t,-.2,0],flat:.2,weight:1.5,color:e=>e.s.face===2?null:Q(V(s,`#8a6a1f`,.25+.12*e.fbm(e.p[0]*6,e.p[1]*6,0)),e.n)});let l=e.part(`lid`,{pivot:[0,a,-.74/2],axis:[1,0,0]}),u=i/2,d=e.param((e,t)=>{let r=t*Math.PI;return[(e-.5)*n,a+Math.sin(r)*u*.75,Math.cos(r)*u]},{grid:48,flip:!0});e.add(d,{even:!0,opacity:1,jitter:.012,part:l,flat:.2,color:c});for(let t of[-.36,.36]){let n=e.param((e,n)=>{let r=n*Math.PI,i=.382;return[t+(e-.5)*.08,a+Math.sin(r)*i*.75,Math.cos(r)*i]},{grid:24,flip:!0});e.add(n,{even:!0,opacity:1,jitter:.012,part:l,flat:.2,weight:1.5,color:s})}for(let t of[-1,1]){let r=e.param((e,r)=>{let i=e*Math.PI;return[t*n/2,a+Math.sin(i)*u*.75*r,Math.cos(i)*u*r]},{grid:24});e.add(r,{even:!0,opacity:1,jitter:.012,part:l,flat:.2,color:c})}e.add(rn(n,.01,i),{even:!0,opacity:1,jitter:.012,pos:[0,.10499999999999998,0],part:l,flat:.2,color:H(o,.7)}),e.add(rn(.16,.2,.03),{even:!0,opacity:1,jitter:.012,pos:[0,.07999999999999997,.38],part:l,flat:.2,weight:2,color:s}),e.add(rn(.12,.08,.03),{even:!0,opacity:1,jitter:.012,pos:[0,-.060000000000000026,.38],flat:.2,weight:2,color:H(s,.85)}),e.cloud({share:.1,size:.9,flat:.15},e=>{let t=(e()-.5)*1.08,r=(e()-.5)*.64,a=.08*(1-(t/(n/2))**2)*(1-(r/(i/2))**2),o=[(e()-.5)*.8,1,(e()-.5)*.8];return{p:[t,.049999999999999975+a*(.3+.7*e()),r],n:o,color:V(`#f2c94c`,`#b8860b`,e()*.5),pattern:!1,kind:`glint`,params:[.7,0]}});let f=[`#e0115f`,`#2ecc71`,`#3a7bd5`,`#9b59b6`,`#f1c40f`];for(let t=0;t<9;t++){let n=(e.rand()-.5)*.8999999999999999,r=(e.rand()-.5)*.49,i=.035+e.rand()*.03;e.add(e.ellipsoid(i,i*.8,i),{pos:[n,.12999999999999998,r],weight:3,flat:.3,pattern:!1,kind:`twinkle`,params:[.9,e.rand()*6],color:e=>V(f[t%f.length],`#ffffff`,.35*W(.3,1,e.n[1]))})}e.reach([0,.8029999999999999,-.74/2-.1])}},book:{alive:!0,options:[{key:`color`,label:`Cover`,type:`color`,default:`#7a2432`}],controls:[{key:`open`,label:`Open`,type:`toggle`,default:1,ease:2}],action:{key:`open`,label:`Open or close`},drive(e,t,n,r){let i=t.open,a=r?.data,o=Math.round(i*100);a&&(o!==a.sortSlot||a.sortAgain)&&(a.sortAgain=o!==a.sortSlot,a.sortSlot=o,n.resortPose=!0);let s=[0,0,0,0,0,0,0,.012,.03,.06],c=Math.PI*X(Nn(i,0,.42));n.parts.cover={angle:c},n.parts.coverTop={angle:c,visible:1-W(.3,.4,i)},n.parts.spine={angle:Math.PI/2*X(Nn(i,0,.42)),visible:1-W(.3,.4,i)};let l=e=>X(Nn(i,.1+e*.05,.5+e*.05)),u=e=>e<Xn.leaves?W(.9,1,l(e)):0;n.parts.coverIn={angle:c,visible:1-u(0)},n.parts.pile={visible:u(1)};for(let e=0;e<Xn.leaves;e++)n.parts[`leaf`+e]={angle:(Math.PI-s[e])*l(e),visible:1-u(e+1)}},build(e,t){let{W:n,H:r,ct:i,leaves:a,lt:o,T:s}=Xn;e.data={};let c=t.color,l=`#d9b45a`,u=`#f6efdf`,d=V(c,`#f3e6cf`,.72),f=[0,s/2,0],p=e.part(`cover`,{pivot:f,axis:[0,0,1]}),m=e.part(`spine`,{pivot:f,axis:[0,0,1]}),h=e=>{let t=.985+.02*Math.sin(e.p[0]*260)*Math.sin(e.p[2]*260);return Q(H(c,t),e.n,{amb:.66,dif:.42,spec:.12})},g=e=>H(u,.86+.05*Math.sin(e*260)),_=.0082,v=.1,y=Math.floor((n-2*v)/(6*_)),b=/* @__PURE__ */ new Map,x=(e,t)=>{let n=`${e}${t}`;if(!b.has(n)){let i=Math.floor((r-.24)/(10*_)),a=t?Math.ceil((r/2-.12+.03)/(10*_)):0;b.set(n,{lines:Zn(y,e*23,i-a),skip:a})}return b.get(n)},S=(e,t,i,a,o)=>{let s=Math.abs(e),c=(a?n-v-s:s-v)/_,l=x(i,o),u=(t+r/2-.12)/_-l.skip*10;return un(l.lines,c,u)},C=`#2f2a26`,w=(e,t,i,a,o=!1,s=!1,c=!1)=>{if(o&&Math.abs(t)>.18&&Math.abs(t)<n-.14&&i>-r/2+.16&&i<-.02){let e=(Math.abs(t)-.18)/(n-.32),a=(i+r/2-.16)/(r/2-.18),o=.62+.12*Math.sin(e*7)+.06*Math.sin(e*15+1),s=V(`#7fc8f8`,`#fef3c7`,a);Math.hypot(e-.72,a-.3)<.12&&(s=`#ffb627`),a>o&&(s=V(`#5aa469`,`#2f7a4a`,(a-o)*3));let c=Math.min(e,1-e,a,1-a);return Y(c<.02?`#5b4a3a`:s)}if(!c&&S(t,i,a,s,o))return Y(V(C,u,.45),.8);let l=s?[-e.n[0],-e.n[1],e.n[2]]:e.n;return Q(H(u,.985+.015*e.noise(t*12,i*12,a)),l,{amb:.8,dif:.25,spec:0})};e.add(Un(n,i,r,.012),{pos:[n/2,i/2,0],flat:.15,weight:2.4,even:!0,jitter:.01,size:.8,color:e=>e.s.face===2?Q(d,e.n,{spec:0}):h(e)}),e.add(e.param((e,t)=>{let n=Math.PI/2+e*Math.PI;return[Math.cos(n)*.07,s/2+s/2*Math.sin(n),(t-.5)*r]},{grid:32}),{part:m,flat:.15,weight:2,even:!0,jitter:.01,size:.8,color:e=>{let t=Math.abs(e.p[2]);return Math.abs(t-r*.38)<.015||Math.abs(t-r*.3)<.01?Y(l):h(e)}}),e.add(Un(n,i,r,.012,{top:!1,bottom:!1}),{pos:[n/2,s-i/2,0],part:p,flat:.15,weight:4,even:!0,jitter:.01,size:.8,color:h});let T=e.part(`coverIn`,{pivot:f,axis:[0,0,1]});e.add(Wn(n-.024,r-.024,-1),{pos:[n/2,s-i,0],part:T,flat:.15,color:e=>Q(d,e.n,{spec:0})});let E=e.part(`coverTop`,{pivot:f,axis:[0,0,1]});e.add(Wn(n-.024,r-.024),{pos:[n/2,s,0],part:E,flat:.15,weight:5,even:!0,jitter:.01,size:.8,color:e=>{let t=e.p[0]-n/2,i=e.p[2],a=n/2-.07-Math.abs(t),o=r/2-.07-Math.abs(i);if(Math.abs(Math.min(a,o))<.008)return Y(Q(l,e.n,{spec:.5}));let s=Math.hypot(t,i-.12);return Math.abs(s-.16)<.012||s<.05||Math.abs(t)<.26&&(Math.abs(i+.25)<.02||Math.abs(i+.33)<.012&&Math.abs(t)<.17)?Y(Q(l,e.n,{spec:.5})):h(e)}});let D=n-.035,O=r-.05,ee=Xn.pb-a*o,k=e=>e===2||e===3?null:Y(H(u,.84));e.add(rn(D,ee,O),{pos:[D/2+.005,i+ee/2,0],flat:.15,weight:2.4,even:!0,jitter:0,size:1,color:e=>e.s.face===2||e.s.face===3?null:e.s.face===1?H(u,.8):Y(g(e.p[1]))}),e.add(Wn(D,O),{pos:[D/2+.005,i+ee,0],flat:.15,weight:6,even:!0,jitter:.01,size:1.25,color:e=>w(e,e.p[0],e.p[2],3,!0,!1,!0)});let te=(t,i,a,o,s)=>{let c=x(t,i),l=[];c.lines.forEach((e,t)=>{for(let i=0;i<6*e.length;i++)for(let e=0;e<7;e++){let s=t*10+e;if(un(c.lines,i+.5,s+.5))for(let e=0;e<2;e++)for(let t=0;t<2;t++){let u=(i+(e+.5)/2)*_,d=a?n-v-u:v+u,f=(s+c.skip*10+(t+.5)/2)*_-r/2+.12;l.push([d,o,f])}}});let u=_*.6;e.cloud({count:l.length,pattern:!1,part:s},(e,t,n)=>{let r=l[Math.floor(t*l.length/n)],i=Math.sqrt(Math.max(1,l.length/n));return{p:r,scales:[u*i,u*.15,u*i],quat:[0,0,0,1],color:C,opacity:1}})};te(3,!0,!1,i+ee+.0012,void 0);for(let t=0;t<a;t++){let n=e.part(`leaf`+t,{pivot:f,axis:[0,0,1]}),r=s-i-(t+.5)*o,c=[D/2+.005,r,0];e.add(rn(D,o*.8,O),{pos:c,part:n,flat:.15,weight:.25,even:!0,jitter:0,size:.6,color:e=>k(e.s.face)});for(let i of[1,-1]){let s=t===a-1;if(s&&i>0)continue;let l=i<0&&s;e.add(Wn(D,O,i),{pos:[c[0],r+i*o*.4,0],part:n,flat:.15,weight:l?6:.35,even:!0,jitter:.01,size:1.25,color:e=>w(e,e.p[0],e.p[2],t*2+ +(i<0),!1,i<0,l)}),l&&te(t*2+1,!1,!0,r+i*o*.4-.0012,n)}}let A=(a-1)*o;e.add(rn(D,A,O),{pos:[-D/2-.005,i+A/2,0],part:e.part(`pile`),flat:.15,weight:1,even:!0,jitter:0,size:1.1,color:e=>e.s.face===2||e.s.face===3?null:Y(g(e.p[1]))}),e.reach([-n,0,r/2]),e.reach([-n,0,-r/2])}},laptop:{alive:!0,options:[{key:`color`,label:`Case`,type:`color`,default:`#b9bec6`}],controls:[{key:`open`,label:`Open`,type:`toggle`,default:1,ease:1.3},{key:`type`,label:`Type`,type:`pulse`,ease:.2},{key:`pad`,label:`Trackpad`,type:`pulse`,ease:.3}],action:{key:`open`,label:`Open or close`,quiet:[`type`,`pad`],at(e,t){if(t.open<.9||Math.abs(e[1]-Qn.hb)>.05)return null;let n=$n.findIndex(t=>Math.abs(e[0]-t.x)<t.w/2+.008&&Math.abs(e[2]-t.z)<t.d/2+.008);return n>=0?(ar.queue.push({pick:n}),{key:`type`,pick:n}):tr(e)?(ar.queue.push({pad:e.slice()}),{key:`pad`}):null}},typeKey(e){if(!ar.open)return null;let t=rr(e);return t<0?null:(ar.queue.push({pick:t,typed:e.length===1?e:null}),{key:`type`,pick:t})},drag:{at:e=>ar.open&&tr(e),start(e){ar.dragFrom=e},move(e){let t=ar;t.dragFrom&&=(t.target=[U(t.target[0]+(e[0]-t.dragFrom[0])/er.w*1.2,.02,.94),U(t.target[1]+(e[2]-t.dragFrom[2])/er.d*1.2,.02,.9)],e)},end(){ar.dragFrom=null}},screen:{width:640,height:396,reset(){Object.assign(ar,ir())},version(e){let t=ar,n=Math.floor(e*2)%2,r=e-t.clickAt<.5?Math.floor(e*30):-1;return`${t.text}|${t.pointer[0].toFixed(3)},${t.pointer[1].toFixed(3)}|${n}|${r}`},draw(e,t){sr(e,t)}},drive(e,t,n,r){let i=ar;i.open=t.open>.9;let a=Qn.open*(1-X(t.open));n.parts.lid={angle:a},n.parts.bezel={angle:a,visible:W(.02,.3,t.open)},n.parts.screen={angle:a,visible:W(.72,1,t.open)},n.parts.deck={visible:W(.02,.2,t.open)};for(let e of i.queue.splice(0))if(e.pick!==void 0){let t=$n[e.pick];or(i,t,e.typed),i.pressKey=e.pick,i.pressAt=r.time,n.cues.push(t.id===`SPACE`?{voice:`keytap`,f:1500,vol:.9}:{voice:`keytap`,f:2200+60*(e.pick%7)})}else e.pad&&(i.target=nr(e.pad),i.clickAt=r.time+.2,n.cues.push({voice:`click`,f:900,decay:1.5,vol:.8}));let o=1-Math.exp(-(r.time-(i.lastTime??r.time))*14);i.lastTime=r.time,i.pointer=[i.pointer[0]+(i.target[0]-i.pointer[0])*o,i.pointer[1]+(i.target[1]-i.pointer[1])*o];let s=r.time-i.pressAt;s>=0&&s<.2&&(n.press=i.pressKey+.999*Math.sin(Math.PI*s/.2))},build(e,t){let n=t.color,{W:r,D:i,hb:a,hl:o}=Qn,s=e=>{let t=.985+.02*e.noise(e.p[0]*20,e.p[1]*20,e.p[2]*20);return Q(H(n,t),e.n,{amb:.66,dif:.4,spec:.35,pow:20})},c={flat:.15,even:!0,size:1.1,jitter:.006};e.add(Un(r,a,i,.02,{bottom:!1,top:!1}),{...c,even:!1,size:1.4,weight:3,opacity:1,pos:[0,a/2,0],color:s});let l=e.part(`deck`,{pivot:[0,a,0]});e.add(Wn(r-.04,i-.04),{...c,pos:[0,a,0],part:l,weight:1.3,color:e=>{let[t,,r]=e.p;for(let e of $n)if(Math.abs(t-e.x)<e.w/2-.004&&Math.abs(r-e.z)<e.d/2-.004)return null;if(Math.abs(t)<.66&&r>-.41&&r<.08)return Y(Q(`#50555d`,e.n,{spec:.05}),.8);if(tr(e.p)){let i=Math.min(er.w/2-Math.abs(t-er.x),er.d/2-Math.abs(r-er.z));return Y(i<.006?H(s(e),.8):Q(H(n,1.03),e.n,{amb:.7,spec:.15}),1.1)}return s(e)}});let u=[];$n.forEach((t,n)=>{let r=t.label;if(e.add(e.box(t.w,.012,t.d),{pos:[t.x,a+.006,t.z],part:l,kind:`key`,params:[n,0],flat:.15,even:!0,weight:3.2,size:.8,jitter:0,pattern:!1,color:e=>{if(e.n[1]<-.5)return null;let t=`#2a2d33`;return e.n[1]>.5?Y(Q(t,e.n,{amb:.9,dif:.25,spec:.12}),.9):Y(Q(H(t,.8),e.n,{amb:.9,dif:.25,spec:0}))}}),!r)return;let i=Math.min(.006,.78*t.w/(6*r.length-1)),o=(6*r.length-1)*i;for(let e=0;e<7;e++)for(let a=0;a<6*r.length;a++)if(un([r],a+.5,e+.5))for(let r=0;r<3;r++)for(let s=0;s<3;s++)u.push({key:n,x:t.x-o/2+(a+(r+.5)/3)*i,z:t.z-3.5*i+(e+(s+.5)/3)*i})});let d=.0022/(.0056*Math.sqrt(2e5/e.count));e.cloud({count:u.length,pattern:!1,part:l},(e,t,n)=>{let r=u[Math.floor(t*u.length/n)];return{p:[r.x,a+.0126,r.z],n:[0,1,0],flat:.2,color:`#eef1f5`,opacity:1,size:d*Math.sqrt(Math.max(1,u.length/n)),kind:`key`,params:[r.key,0]}});let f=[0,a+o/2,-i/2+.01],p=At([1,0,0],-Qn.open),m=e=>K(f,Mt(p,q(e,f))),h=e.part(`lid`,{pivot:f,axis:[1,0,0]}),g=e.part(`bezel`,{pivot:f,axis:[1,0,0]}),_=e.part(`screen`,{pivot:f,axis:[1,0,0]}),v=a+o/2+.002;e.add(Un(r,o,i,.012,{bottom:!1}),{...c,even:!1,size:1.3,weight:1.6,opacity:1,pos:m([0,v,0]),quat:p,part:h,color:s});let y=r-.14,b=i-.16;e.add(Wn(r-.03,i-.03,-1),{pos:m([0,v-o/2-.001,0]),quat:p,part:g,flat:.12,even:!0,size:1.1,jitter:0,pattern:!1,color:e=>{let[t,,n]=e.lp;if(Math.abs(t)<y/2-.004&&Math.abs(n-.005)<b/2-.004)return null;if(Math.hypot(t,n-(i-.03)/2+.035)<.01)return Y(`#3a4250`);let a=Math.max(Math.abs(t)-y/2,Math.abs(n-.005)-b/2),o=Math.min((r-.03)/2-Math.abs(t),(i-.03)/2-Math.abs(n),a+.004),s=V(`#0b0e13`,`#1a1f27`,.5+n/i*.4);return Y(s,.35+.65*U(o/.03,0,1))}}),e.add(Wn(y,b,-1),{pos:m([0,v-o/2-.002,.005]),quat:p,part:_,kind:`screen`,params:e=>[e.u,1-e.v],flat:.08,even:!0,weight:7,size:1.05,jitter:0,pattern:!1,color:()=>Y(`#202838`)})}},"music-box":{alive:!0,options:[{key:`wood`,label:`Wood`,type:`color`,default:`#8a4526`}],controls:[{key:`open`,label:`Open`,type:`toggle`,default:1,ease:1.4}],action:{key:`open`,label:`Open or close`},hands:{joints:[{type:`hinge`,part:`lid`,pivot:[0,.5,-.38],axis:[-1,0,0],min:0,max:1.95,bounce:.15,start:e=>1.95*X(e.open),pos:[0,.55,0],pick:[.6,.12,.42],sound:(e,t)=>e.v<1?{voice:`wood`,f:450,decay:1.1,vol:t*.9}:{voice:`wood`,f:600,decay:.4,vol:t*.4},also:(e,t)=>{t.lid&&(t.lidTop={...t.lid,visible:1-W(1.15,1.6,e)}),t.dancer={...t.dancer,offset:[0,-.34*(1-W(.7,1.95,e)),0]},e<1.3&&ur.forEach((e,n)=>t[`note`+n]={visible:0}),vn.lid=e}},{type:`dial`,part:`crank`,pivot:[.58,.25,0],axis:[1,0,0],detents:12,drag:2.5,pos:[.6,.3,0],pick:[.12,.22,.24],sound:e=>{if(e.kind!==`detent`)return null;let t=_n[(e.n%_n.length+_n.length)%_n.length];return t===`-`?null:{voice:`tine`,f:t,vol:.7}},also:(e,t)=>{t.dancer={...t.dancer,angle:.5*e},vn.a=.5*e}}]},drive(e,t,n){let r=Vn(t);if(vn.a!==null){let e=Math.round(vn.a/.25)*64+Math.round(vn.lid/.25);(e!==vn.slot||vn.again)&&(vn.again=e!==vn.slot,vn.slot=e,n.resortPose=!0)}let i=X(t.open);n.parts.lid={angle:-1.95*i},n.parts.lidTop={angle:-1.95*i,visible:1-W(.55,.8,t.open)},n.parts.dancer={angle:Hn(r,`spin`,e,2.4*t.open),offset:[0,-.34*(1-W(.35,1,t.open)),0]},n.parts.crank={angle:Hn(r,`crank`,e,3*t.open)},ur.forEach((r,i)=>{let a=(e*.28+r.phase)%1;n.parts[`note`+i]={offset:[.12*Math.sin(a*5+i),a*.75,0],visible:W(.6,1,t.open)*W(0,.12,a)*(1-W(.75,1,a))}})},build(e,t){let n=t.wood,r=`#d8b25a`,i=`#9e1b32`,a=1.1,o=.5,s=.76,c=o,l=e=>{let t=.5+.5*Math.sin(e.p[1]*22+e.p[2]*9+e.p[0]*4+Math.sin(e.p[0]*3.1)*1.4);return Y(Q(V(n,H(n,.84),t),e.n,{amb:.66,dif:.42,spec:.3}))};e.add(Un(a,o,s,.03,{top:!1,bottom:!1,even2d:!0}),{even:!0,opacity:1,jitter:.008,weight:1.8,pos:[0,o/2,0],flat:.15,color:e=>Math.abs(e.p[1]-.12)<.012||Math.abs(e.p[1]-.45)<.01?Y(Q(r,e.n,{spec:.5})):l(e)}),e.add(rn(1.03,.44,.69),{even:!0,opacity:1,jitter:.015,pos:[0,.28,0],flat:.3,color:e=>e.s.face===2?null:H(i,.78+.08*e.rand())});let u=e.part(`lid`,{pivot:[0,c,-.76/2],axis:[1,0,0]}),d=e.part(`lidTop`,{pivot:[0,c,-.76/2],axis:[1,0,0]});e.add(Un(a,.1,s,.03,{top:!1,even2d:!0}),{even:!0,opacity:1,jitter:.008,weight:1.8,pos:[0,.55,0],part:u,flat:.15,color:e=>{let[t,,n]=e.p;return e.s.face===3?Math.abs(t)<a/2-.1&&Math.abs(n)<s/2-.1?Y(V(`#c9d3de`,`#f4f7fb`,.5+.5*Math.sin((t-n)*5))):H(i,.8):l(e)}}),e.add(Wn(1.04,.7),{even:!0,opacity:1,jitter:.008,weight:1.8,pos:[0,.6,0],part:d,flat:.15,color:e=>{let[t,,n]=e.p;return Math.abs(Math.hypot(t,n)-.2)<.012||Math.abs(Math.max(Math.abs(t)/(a/2-.08),Math.abs(n)/(s/2-.08))-1)<.02?Y(Q(r,e.n,{spec:.5})):l(e)}});let f=e.part(`dancer`,{pivot:[0,.06,.02]}),p=`#f3cfb3`,m=`#ff8fb8`,h=(t,n)=>e.add(t,{opacity:1,jitter:.015,part:f,flat:.25,weight:2.2,pattern:!1,...n});h(e.cylinder(.12,.02),{pos:[0,.45,.02],color:e=>Q(r,e.n,{spec:.5})});for(let t of[-1,1])h(e.cylinder(.011,.2,{caps:!1}),{pos:[t*.015,.56,.02],rot:[0,0,t*4],color:e=>Q(p,e.n)});h(e.cone(.13,.02,.06),{pos:[0,.67,.02],color:e=>Q(V(m,`#ffffff`,.3*(e.u*18%1<.5)),e.n,{amb:.75,dif:.35})}),h(e.ellipsoid(.035,.06,.03),{pos:[0,.73,.02],color:e=>Q(m,e.n)}),h(e.sphere(.033),{pos:[0,.815,.02],color:e=>Q(p,e.n)}),h(e.sphere(.018),{pos:[0,.85,.005],color:e=>Q(`#4a2c1d`,e.n)}),h(e.tube(e=>{let t=Math.PI*(.1+.8*e);return[Math.cos(t)*.07,.76+Math.sin(t)*.13,.02]},.008,{samples:48,grid:24}),{color:e=>Q(p,e.n)});let g=e.part(`crank`,{pivot:[.5800000000000001,o/2,0],axis:[1,0,0]});e.add(an(.02,.02,.06),{even:!0,opacity:1,jitter:.015,pos:[.5800000000000001,o/2,0],rot:[0,0,90],part:g,weight:2,color:e=>Q(r,e.n,{spec:.5})}),e.add(an(.015,.015,.14),{even:!0,opacity:1,jitter:.015,pos:[.6100000000000001,.31,0],part:g,weight:2,color:e=>Q(r,e.n,{spec:.5})}),e.add(e.sphere(.03),{even:!0,opacity:1,jitter:.015,pos:[.6100000000000001,.38,0],part:g,weight:2,color:e=>Q(`#f4efe6`,e.n)}),ur.forEach((t,n)=>{let r=e.part(`note`+n,{pivot:[t.x,.7,t.z]}),i=[`#f2c14e`,`#ff8fb8`,`#8ecae6`][n],a=[t.x,.75,t.z];e.add(sn(e,.04,.03,.02),{even:!0,opacity:1,jitter:.015,pos:a,rot:[0,0,25],part:r,weight:3,pattern:!1,color:e=>Y(Q(i,e.n,{spec:.5}))}),e.add(an(.008,.008,.14,!1),{even:!0,opacity:1,jitter:.015,pos:[a[0]+.035,a[1]+.07,a[2]],part:r,weight:3,pattern:!1,color:i}),e.add(sn(e,.035,.012,.01),{even:!0,opacity:1,jitter:.015,pos:[a[0]+.06,a[1]+.125,a[2]],rot:[0,0,-30],part:r,weight:3,pattern:!1,color:i})}),e.reach([0,1.5,0])}},clock:{alive:!0,options:[{key:`color`,label:`Color`,type:`color`,default:`#d6453d`},{key:`zone`,label:`Time zone`,type:`select`,default:`local`,choices:dr.map(([e,t])=>({id:e,label:t}))}],controls:[{key:`ring`,label:`Ring`,type:`pulse`,ease:2.2}],action:{key:`ring`,label:`Ring the bell`},hands:{joints:e=>[{type:`dial`,part:`minute`,pivot:[0,0,0],axis:[0,0,1],min:-13*G,max:13*G,detents:60,drag:9,start:()=>{let[t,n,r]=pr(/* @__PURE__ */ new Date,e?.zone),i=n+r/60;return yn.a0=-i/60*G,yn.h0=-(t%12+i/60)/12*G,yn.a0},pos:[0,0,.2],pick:[.74,.74,.3],sound:(e,t)=>e.kind===`detent`?{voice:`click`,f:2400,decay:.03,vol:.12+.2*Math.min(1,t)}:null,also:(e,t)=>{t.hour={angle:yn.h0+(e-yn.a0)/12}}}]},drive(e,t,n,r){let i=/* @__PURE__ */ new Date,[a,o,s]=pr(i,r?.data?.zone),c=s+i.getMilliseconds()/1e3,l=o+c/60,u=a%12+l/60,d=Math.floor(c)+X(U(c%1/.18,0,1));n.parts.hour={angle:-u/12*G},n.parts.minute={angle:-l/60*G},n.parts.second={angle:-d/60*G};let f=r?.data,p=Math.floor(u*3600-.2);f&&p!==f.handsSorted&&(f.handsSorted=p,n.resortPose=!0);let m=t.ring,h=r?.time??e;n.parts.hammer={angle:m>0?.5*Math.sin(h*70)*Math.min(1,m*2):0},n.body={quat:[0,0,Math.sin(.025*Math.sin(h*55)*m),Math.cos(.025*Math.sin(h*55)*m)],offset:[0,.015*Math.abs(Math.sin(h*40))*m,0]}},build(e,t){e.data={zone:t.zone&&t.zone!==`local`?t.zone:null};let n=t.color,r=.8,i=.34,a=i/2;e.add(e.cylinder(r,i,{caps:`bottom`}),{even:!0,opacity:1,jitter:.015,rot:[90,0,0],flat:.15,interior:.06,core:`#6a6f78`,color:e=>Q(n,e.n,{amb:.64,dif:.45,spec:.45,pow:26})}),e.add(Pn(e,r,.055),{opacity:1,jitter:.015,even:!0,pos:[0,0,a],rot:[90,0,0],flat:.2,weight:1.3,color:e=>$(e.n)});let o=.77,s=e.param((e,t)=>[o*t*Math.sin(G*e),o*t*Math.cos(G*e),0],{grid:96});e.add(s,{opacity:1,jitter:.01,even:!0,pos:[0,0,.17200000000000001],flat:.12,pattern:!1,color:e=>{let t=e.p[0],n=e.p[1],r=Math.hypot(t,n),i=(Math.atan2(t,n)/G+1)%1,a=i*60,o=Math.abs(a-Math.round(a)),s=Math.round(a)%5==0;if(r>.6&&r<.72&&o*(r*G/60)<(s?.018:.006)&&(s||r>.66))return Y(`#1d1d22`);let c=Math.round(i*12)||12,l=c/12*G,u=Math.sin(l)*.49,d=Math.cos(l)*.49,f=.05;return Math.hypot(t-u,n-d)<.12&&Jn(String(c),(t-u)/f,(n-d)/f)<.24?Y(`#1d1d22`):Y(H(`#fbf8f0`,.97+.03*(1-r)))}});let c={hour:.04,minute:.055,second:.07},l=(t,n,r,i,o=0,s=.5)=>{let l=e.part(t,{pivot:[0,0,0],axis:[0,0,1]}),u=a+c[t],d={even:!0,opacity:1,jitter:.015,part:l,flat:.15,weight:3,pattern:!1,color:e=>Y(Q(i,[0,0,1],{spec:.4}))},f=e.param((e,t)=>{let i=-o+t*(n+o),a=i<0?1:1-(1-s)*(i/n),c=i>n-r?(n-i)/r:1;return[(e-.5)*r*a*Math.max(0,c),i,0]},{grid:48});return e.add(f,{...d,pos:[0,0,u]}),e.add(e.disc(r*.85+.012),{...d,pos:[0,0,u+.001],rot:[90,0,0]}),l};l(`hour`,.36,.055,`#1d1d22`,.05,.55),l(`minute`,.55,.04,`#1d1d22`,.06,.45);let u=l(`second`,.6,.012,`#d62828`,.16,.8);e.add(e.disc(.035),{even:!0,opacity:1,jitter:.015,pos:[0,-.11,a+c.second+.001],rot:[90,0,0],part:u,weight:3,pattern:!1,color:e=>Y(Q(`#d62828`,[0,0,1],{spec:.4}))}),e.add(e.cylinder(.014,c.second+.01,{caps:!1}),{even:!0,opacity:1,jitter:.015,pos:[0,0,a+(c.second+.01)/2],rot:[90,0,0],weight:3,pattern:!1,color:e=>$(e.n,`#c9a45c`)}),e.add(e.sphere(.022),{even:!0,opacity:1,jitter:.015,pos:[0,0,a+c.second+.008],scale:[1,1,.55],weight:3,pattern:!1,color:e=>$(e.n,`#c9a45c`)});for(let t of[-1,1])e.add(e.lathe([[.3,0],[.29,.06],[.24,.16],[.14,.23],[0,.25]],{grid:64}),{even:!0,opacity:1,jitter:.015,pos:[t*.46,.66,0],rot:[0,0,t*-32],flat:.15,color:e=>$(e.n,`#e8c06a`)}),e.add(e.cylinder(.035,.18),{even:!0,opacity:1,jitter:.015,pos:[t*.42,-.83,0],rot:[0,0,t*22],weight:2,color:e=>$(e.n)});e.add(e.tube(e=>{let t=Math.PI*(.12+.76*e);return[Math.cos(t)*.55,.66+Math.sin(t)*.42,-.02]},.028,{samples:64,grid:32}),{opacity:1,jitter:.015,flat:.2,weight:1.5,color:e=>$(e.n)});let d=e.part(`hammer`,{pivot:[0,.8,0],axis:[0,0,1]});e.add(e.cylinder(.012,.22),{even:!0,opacity:1,jitter:.015,pos:[0,.9,.02],part:d,weight:2,color:e=>$(e.n)}),e.add(e.sphere(.04),{even:!0,opacity:1,jitter:.015,pos:[0,1.01,.02],part:d,weight:2,color:e=>$(e.n)})}},"gift-box":{gravity:!1,alive:!0,options:[{key:`paper`,label:`Paper`,type:`color`,default:`#e8435a`},{key:`ribbon`,label:`Ribbon`,type:`color`,default:`#f6c343`}],controls:[{key:`open`,label:`Open`,type:`toggle`,default:0,ease:1}],action:{key:`open`,label:`Open the present`},hands:{floor:0,pieces:()=>[{part:`lid`,pos:[0,.81,0],pivot:[0,.81,-.5],solid:xn,points:dn(xn,1),pick:[.6,.24,.6],mass:.3,friction:.7,restitution:.2},{pos:[0,.39,0],solid:Sn,pick:[.001,.001,.001]}],joints:[{type:`socket`,part:`lid`,snap:.3,sound:()=>({voice:`hollow`,f:180,decay:.2,vol:.5}),also:(e,t)=>{let n=t.lid?.offset;bn.off=n?hn(n):0}}],sound:(e,t)=>({voice:`hollow`,f:140,decay:.15,vol:t*.7})},drive(e,t,n){let r=t.open,i=bn,a=i.t===null?0:U(e-i.t,0,.05);i.t=e;let o=W(.35,.6,i.off);i.v+=(90*(o-i.pop)-9*i.v)*a,i.pop+=i.v*a,o===0&&i.pop<.002&&Math.abs(i.v)<.01&&(i.pop=i.v=0);let s=jn(U(r/.7,0,1));n.parts.lid={offset:[0,.55*s,-.45*X(r)],angle:-.9*X(r)};let c=Math.max(jn(Nn(r,.25,1)),i.pop);n.parts.star={offset:[0,.82*c,0],angle:.5*Math.sin(e*1.2)*Math.max(r,U(i.pop,0,1))},n.parts.confetti={visible:Math.max(W(.25,.6,r),W(.3,.8,i.pop))},n.amount=.6+.6*r},build(e,t){let n=t.paper,r=t.ribbon,i=.78,a=.085,o=(e,t)=>{let[i,o,s]=e.p,c=e.s.face;if(Math.abs(i)<a&&c!==0&&c!==1||Math.abs(s)<a&&c!==4&&c!==5||t&&(Math.abs(i)<a||Math.abs(s)<a))return Q(r,e.n,{amb:.7,dif:.35,spec:.5,pow:20});let l=.16,u=c<2?s:i,d=c===2||c===3?s:o,f=(u/l%1+1)%1-.5,p=((d/l+.5*(Math.floor(u/l)%2))%1+1)%1-.5;return Q(Math.hypot(f,p)<.2?V(n,`#ffffff`,.75):n,e.n,{amb:.66,dif:.42,spec:.18})};e.add(Un(1,i,1,.025,{top:!1,bottom:!1,even2d:!0}),{even:!0,opacity:1,jitter:.01,pos:[0,i/2,0],flat:.15,color:e=>o(e,!1)}),e.add(rn(.97,.76,.97),{even:!0,opacity:1,jitter:.01,pos:[0,.4,0],flat:.2,color:e=>e.s.face===2?null:H(n,.45)});let s=.81,c=e.part(`lid`,{pivot:[0,s,-1/2],axis:[1,0,0]});e.add(Un(1.07,.16,1.07,.03,{even2d:!0}),{even:!0,opacity:1,jitter:.01,pos:[0,s,0],part:c,flat:.15,color:e=>e.s.face===3?H(n,.55):o(e,e.s.face===2)});for(let t of[-1,1])e.add(on(e,.13,.04),{even:!0,opacity:1,jitter:.01,pos:[t*.13,.99,0],rot:[90,0,t*-30],scale:[1.15,1,.7],part:c,flat:.2,weight:1.4,color:e=>Q(r,e.n,{amb:.66,dif:.42,spec:.5,pow:20})}),e.add(rn(.09,.012,.3),{even:!0,opacity:1,jitter:.01,pos:[t*.06,.895,.2],rot:[0,t*25,0],part:c,flat:.15,weight:1.4,color:e=>Q(r,e.n,{spec:.4})});e.add(e.sphere(.06),{even:!0,opacity:1,jitter:.01,pos:[0,.93,0],part:c,weight:2,flat:.2,color:e=>Q(r,e.n,{spec:.5})});let l=e.part(`star`,{pivot:[0,i*.55,0]}),u=Yn(.3,.13);for(let t=0;t<u.length;t++){let n=u[t],r=u[(t+1)%u.length];for(let t of[-.04,.04])e.add(Gn([0,i*.55,t*1.6],[n[0],i*.55+n[1],t],[r[0],i*.55+r[1],t]),{part:l,weight:2,flat:.2,pattern:!1,color:e=>Y(Q(`#ffd23f`,e.n[2]*t>0?e.n:J(e.n,-1),{amb:.75,dif:.4,spec:.6}))})}e.add(e.tube(e=>[.06*Math.cos(e*30),.05+e*(i*.55-.3),.06*Math.sin(e*30)],.01,{samples:200,grid:32}),{part:l,weight:2,flat:.3,color:e=>$(e.n)});let d=e.part(`confetti`,{pivot:[0,i,0]}),f=[`#ff595e`,`#ffca3a`,`#8ac926`,`#1982c4`,`#6a4c93`,`#ff8fab`];e.cloud({share:.025,size:1.8,part:d,pattern:!1},e=>({p:[(e()-.5)*.7,.68+e()*.2,(e()-.5)*.7],n:[e()-.5,e()-.5,e()-.5],flat:.1,color:f[Math.floor(e()*f.length)],opacity:1,kind:`rise`,params:[.9+.8*e(),e()]})),e.reach([0,1.83,0])}},umbrella:{alive:!0,options:[{key:`style`,label:`Canopy`,type:`select`,default:`rainbow`,choices:[{id:`rainbow`,label:`Rainbow`},{id:`stripes`,label:`Stripes`},{id:`plain`,label:`Plain`}]},{key:`color`,label:`Color`,type:`color`,default:`#d7263d`}],controls:[{key:`open`,label:`Open`,type:`toggle`,default:1,ease:1.1}],action:{key:`open`,label:`Open or close`},hands:{joints:[{type:`slider`,part:`runner`,pivot:[0,Cn.ry,0],axis:[0,1,0],min:wn(Cn.shut),max:0,stick:.05,gravity:!1,friction:3,damping:8,bounce:.05,start:e=>wn(Cn.shut*(1-X(e.open))),pos:[0,Cn.ry,0],pick:[.2,.3,.2],sound:(e,t)=>e.kind===`free`||e.v>-.01?{voice:`click`,f:1800,decay:.05,vol:.5}:{voice:`rustle`,vol:t*.6},also:(e,t)=>{let n=Tn(e);for(let e=0;e<8;e++)t[`panel`+e]={angle:n}}}]},drive(e,t,n){let r=1-X(t.open);for(let e=0;e<8;e++)n.parts[`panel`+e]={angle:Cn.shut*r};n.parts.runner={offset:[0,wn(Cn.shut*r),0]},n.body={quat:At([0,1,0],.15*Math.sin(e*.5))}},build(e,t){let n=1.05,r=.72,i=.42;for(let a=0;a<8;a++){let o=a/8*G,s=[Math.cos(o),0,-Math.sin(o)],c=e.part(`panel`+a,{pivot:[0,r,0],axis:s}),l=t.style===`rainbow`?zn(a/8,.7,.95):t.style===`stripes`&&a%2?`#f7f4ee`:t.color,u=Math.PI/8,d=e.param((e,t)=>{let a=o+(e-.5)*2*u,s=t,c=1-.07*Math.sin((e-.5)*Math.PI+Math.PI/2)**2*s,l=s*n*(.97+.03*Math.cos((e-.5)*2*u*8))*(2-c)*.5*2;return[Math.sin(a)*l*c,r-i*s**1.7+.06*s*(1-s),Math.cos(a)*l*c]},{grid:40});e.add(d,{even:!0,opacity:1,jitter:.015,part:c,flat:.12,color:e=>{let t=Math.abs(e.u-.5)*2,n=e.n[1]<0?J(e.n,-1):e.n,r=Q(l,n,{amb:.66,dif:.42,spec:.25});return t>.965?H(r,.6):e.v>.965?H(r,.8):r}}),e.add(e.tube(e=>{let t=e*n*.99,a=o+u;return[Math.sin(a)*t*.93,r-i*e**1.7+.06*e*(1-e)-.012,Math.cos(a)*t*.93]},.009,{samples:32,grid:16}),{even:!0,opacity:1,jitter:.015,part:c,weight:1.5,flat:.3,color:`#3b3b40`})}let a=e.part(`runner`,{pivot:[0,Cn.ry,0]});e.add(an(.04,.04,.1),{even:!0,opacity:1,jitter:.015,pos:[0,Cn.ry,0],part:a,flat:.2,weight:1.5,color:e=>Q(`#2e2e33`,e.n,{spec:.35})}),e.add(an(.05,.05,.018),{even:!0,opacity:1,jitter:.015,pos:[0,Cn.ry+.05,0],part:a,weight:1.5,color:e=>$(e.n)}),e.add(an(.022,.022,1.67),{even:!0,opacity:1,jitter:.015,pos:[0,-.22999999999999998/2,0],weight:1.5,color:e=>$(e.n)}),e.add(an(.03,.005,.12),{even:!0,opacity:1,jitter:.015,pos:[0,.78,0],weight:2,color:e=>$(e.n)}),e.add(cn(e,e=>{if(e<.45)return[0,-.95-e*.5,0];let t=(e-.45)/.55*Math.PI;return[.14-Math.cos(t)*.14,-1.175-Math.sin(t)*.14,0]},.04,{samples:96,grid:32,caps:!0}),{even:!0,opacity:1,jitter:.015,flat:.2,weight:1.3,color:e=>Q(`#6b3f22`,e.n,{spec:.45})})}},"desk-fan":{alive:!0,options:[{key:`color`,label:`Color`,type:`color`,default:`#6cc2b3`}],controls:[{key:`power`,label:`On`,type:`toggle`,default:1,ease:1.8},{key:`swing`,label:`Swing`,type:`toggle`,default:1,ease:1}],action:{key:`power`,label:`Switch on or off`},hands:{joints:[{type:`hinge`,part:`head`,pivot:cr.yawAt,axis:[1,0,0],min:-.5,max:.32,gravity:!1,damping:14,bounce:.05,pos:[0,cr.hub[1],.04],pick:[.42,.42,.34],sound:(e,t)=>({voice:`clack`,f:420,decay:.08,vol:t*.6}),also:(e,t)=>{let n=cr.yawAt,r=cr.hub,i=kt(At([0,1,0],En.yaw),At([1,0,0],e));t.head={quat:i,offset:[0,0,0]};let a=K(n,Mt(i,q(r,n)));t.blades={quat:kt(i,At([0,0,1],-En.spin)),offset:q(a,r)}}}]},drive(e,t,n){let r=Vn(t),i=Hn(r,`spin`,e,24*t.power*t.power),a=.55*Math.sin(Hn(r,`osc`,e,.55*t.swing*t.power));En.yaw=a,En.spin=i;let o=At([0,1,0],a),s=At([0,0,1],-i);n.parts.head={quat:o};let c=cr.yawAt,l=cr.hub,u=K(c,Mt(o,q(l,c)));n.parts.blades={quat:kt(o,s),offset:q(u,l)}},build(e,t){let n=t.color,r=e=>Q(n,e.n,{amb:.66,dif:.42,spec:.45,pow:26}),i=cr.yawAt,a=cr.hub;e.add(e.lathe([[.4,0],[.4,.05],[.36,.09],[.12,.11],[.06,.13],[0,.13]],{grid:64}),{even:!0,opacity:1,jitter:.015,flat:.15,color:r});for(let[t,n]of[[-.12,`#f4f1ea`],[0,`#f4f1ea`],[.12,`#e05a47`]])e.add(e.cylinder(.03,.03),{even:!0,opacity:1,jitter:.015,pos:[t,.09,.3],rot:[-15,0,0],weight:2,color:e=>Q(n,e.n)});e.add(e.cylinder(.035,i[1]-.1),{even:!0,opacity:1,jitter:.015,pos:[0,(i[1]+.1)/2,i[2]],color:e=>$(e.n)});let o=e.part(`head`,{pivot:i,axis:[0,1,0]});e.add(e.ellipsoid(.16,.16,.2),{even:!0,opacity:1,jitter:.015,pos:[0,a[1],a[2]-.22],part:o,flat:.15,color:r}),e.add(e.sphere(.06),{even:!0,opacity:1,jitter:.015,pos:[0,i[1],i[2]],part:o,color:r});let s=a[2],c=.5,l={part:o,flat:.35,weight:1.2,jitter:.01,color:e=>Q(`#8a8f97`,e.n,{amb:.72,dif:.35,spec:.3,pow:10})};e.add(Pn(e,c,.016),{even:!0,opacity:1,jitter:.015,pos:[0,a[1],s+.02],rot:[90,0,0],...l,weight:2});for(let t of[.14,.26,.38])e.add(Pn(e,t,.006),{even:!0,opacity:1,jitter:.015,pos:[0,a[1],s+.09],rot:[90,0,0],...l});e.add(Pn(e,c*.9,.008),{even:!0,opacity:1,jitter:.015,pos:[0,a[1],s-.1],rot:[90,0,0],...l});for(let t=0;t<16;t++){let n=t/16*G,r=Math.sin(n),i=Math.cos(n);e.add(e.tube(e=>{let t=.06+e*.44;return[r*t,a[1]+i*t,s+.1-.08*e*e]},.005,{samples:16,grid:12}),l),e.add(e.tube(e=>{let t=c*(1-.1*e);return[r*t,a[1]+i*t,s+.02-.12*e]},.005,{samples:8,grid:8}),l)}e.add(e.cylinder(.06,.02),{even:!0,opacity:1,jitter:.015,pos:[0,a[1],s+.1],rot:[90,0,0],part:o,weight:2,color:e=>$(e.n)});let u=e.part(`blades`,{pivot:a,axis:[0,0,1]});for(let t=0;t<4;t++){let r=t/4*G+.3;e.add(e.param((e,t)=>{let n=.07+t*.36,i=.55*Math.sin(Math.PI*Math.min(1,t*1.15+.1))+.12,o=r+(e-.5)*i;return[Math.sin(o)*n,a[1]+Math.cos(o)*n,s+(e-.5)*.09]},{grid:24}),{even:!0,jitter:.015,part:u,flat:.12,opacity:.9,color:e=>{let t=e.n[2]<0?J(e.n,-1):e.n;return Q(V(n,`#ffffff`,.45),t,{amb:.7,dif:.35,spec:.4})}})}e.add(e.cylinder(.07,.07),{even:!0,opacity:1,jitter:.015,pos:[0,a[1],s-.02],rot:[90,0,0],part:u,weight:2,color:r})}},lamp:{alive:!0,density:1,options:[{key:`color`,label:`Color`,type:`color`,default:`#3c7fc4`}],controls:[{key:`light`,label:`Light`,type:`toggle`,default:1,ease:.35}],action:{key:`light`,label:`Switch the light`},hands:{joints:[{type:`hinge`,part:`lower`,name:`lower`,pivot:Z.base,axis:[0,0,1],min:-.45,max:.4,gravity:!1,damping:12,bounce:.05,pos:J(K(Z.base,Z.elbow),.5),pick:[.16,.42,.16]},{type:`hinge`,part:`upper`,name:`upper`,parent:`lower`,pivot:Z.elbow,axis:[0,0,1],min:-.7,max:.6,gravity:!1,damping:12,bounce:.05,pos:J(K(Z.elbow,Z.joint),.5),pick:[.3,.2,.2]},{type:`hinge`,part:`head`,name:`head`,parent:`upper`,pivot:Z.joint,axis:[0,0,1],min:-.8,max:.9,gravity:!1,damping:12,bounce:.05,pos:K(Z.head,J(Z.dir,.08)),pick:[.3,.26,.3],also:(e,t)=>{let n=t.head;if(!n)return;let r=Dn.light;t.glow={...n,visible:r},t.beam={...n,visible:r};let i=(e=>K(K(Z.joint,Mt(n.quat,q(e,Z.joint))),n.offset))(Z.bulbAt),a=Mt(n.quat,Z.dir),o=W(.3,.6,-a[1]),s=o>0?K(i,J(a,-i[1]/a[1])):Z.pool;t.pool={offset:q(s,Z.pool),visible:r*o}}}]},drive(e,t,n){Dn.light=t.light,n.parts.glow={visible:t.light},n.parts.beam={visible:t.light},n.parts.pool={visible:t.light}},build(e,t){let n=e=>Q(t.color,e.n,{amb:.64,dif:.45,spec:.5,pow:26}),{base:r,elbow:i,joint:a}=Z,o=e.part(`lower`,{pivot:r,axis:[0,0,1]}),s=e.part(`upper`,{pivot:i,axis:[0,0,1]}),c=e.part(`head`,{pivot:a,axis:[0,0,1]});e.add(e.lathe([[.36,0],[.36,.05],[.32,.09],[.08,.11],[0,.11]],{grid:64}),{pos:[0,0,-.1],flat:.15,even:!0,opacity:1,jitter:.012,color:n}),e.add(e.cylinder(.03,.03),{pos:[.22,.1,.1],weight:2,color:e=>$(e.n)});let l=(t,r,i,a)=>e.add(e.tube(e=>K(t,J(q(r,t),e)),i,{samples:16,grid:24}),{flat:.2,weight:1.3,opacity:1,jitter:.012,part:a,color:n});for(let e of[-.035,.035])l(K(r,[0,0,e]),K(i,[0,0,e]),.018,o),l(K(i,[0,0,e]),K(a,[0,0,e]),.018,s);for(let[t,n]of[[r,void 0],[i,s],[a,c]])e.add(e.cylinder(.045,.11),{pos:t,rot:[90,0,0],weight:2,part:n,color:e=>$(e.n)});let u=(t,n,r)=>e.add(e.tube(e=>{let r=gn(q(n,t)),i=gn(mn(r,[0,0,1])),a=K(K(t,J(q(n,t),.2+.5*e)),J(i,.06));return K(a,K(J(i,.015*Math.cos(e*70)),[0,0,.015*Math.sin(e*70)]))},.004,{samples:400,grid:16}),{weight:1.5,flat:.4,part:r,color:e=>$(e.n)});u(r,i,o),u(i,a,s);let{dir:d,head:f}=Z,p=Nt([0,-1,0],d);e.add(e.lathe([[.05,.16],[.08,.1],[.16,0],[.26,-.12],[.3,-.2]],{grid:64}),{pos:f,quat:p,flat:.15,even:!0,opacity:1,jitter:.012,part:c,color:e=>pn(e.n,d)>.2?Q(`#f4efe2`,J(e.n,-1),{amb:.9,dif:.2}):n(e)});let m=K(f,J(d,.07));e.add(e.sphere(.085),{pos:m,weight:2,even:!0,part:c,color:`#e9e4d8`});let h=e.part(`glow`,{pivot:a});e.add(e.sphere(.095),{pos:m,part:h,weight:2,pattern:!1,even:!0,jitter:.01,color:e=>Y(V(`#fff7d6`,`#ffffff`,.6))});let g=e.part(`beam`,{pivot:a}),_=e.part(`pool`,{pivot:Z.pool}),v=(0-m[1])/d[1],y=K(m,J(d,v)),b=gn(mn(d,[0,0,1])),x=mn(d,b);e.cloud({share:.08,size:2,part:g,pattern:!1},(e,t,n)=>{let r=1/Math.cbrt(n),[i,a,o]=Fn(t,3).map(t=>{let n=t+(e()-.5)*r*.4;return n-Math.floor(n)}),s=Math.sqrt(i),c=(.08+s*.5)*Math.sqrt(a),l=o*G;return{p:K(K(m,J(d,s*v*.9)),K(J(b,Math.cos(l)*c),J(x,Math.sin(l)*c))),dir:d,stretch:6,color:`#ffe9a8`,opacity:.025+.035*(1-s)}}),e.cloud({share:.06,size:3,part:_,pattern:!1},(e,t,n)=>{let r=t*2.39996323,i=Math.sqrt((t+.5)/n)*.62;return{p:[y[0]+Math.sin(r)*i,.003,y[2]+Math.cos(r)*i],n:[0,1,0],color:`#ffe39a`,opacity:.4*(1-(i/.62)**2)}})}},"potion-bottle":{gravity:!1,alive:!0,options:[{key:`color`,label:`Potion`,type:`color`,default:`#b44cff`}],controls:[{key:`pop`,label:`Pop the cork`,type:`pulse`,ease:1.8}],action:{key:`pop`,label:`Pop the cork`},hands:{floor:-.5,pieces:()=>[{part:`cork`,pos:[0,.88,0],pivot:[0,.86,0],solid:kn,points:dn(kn,1),pick:[.16,.16,.16],mass:.1,friction:.8,restitution:.35},{pos:[0,0,0],solid:An,pick:[.001,.001,.001]}],joints:[{type:`break`,part:`cork`,at:[0,.8,0],pull:.16,give:.04,reseat:{snap:.25},sound:e=>e.kind===`snap`?{voice:`pop`,f:520,vol:.8}:e.kind===`socket`?{voice:`twist`,f:300,decay:.15,vol:.5}:void 0,also:(e,t)=>{let n=t.cork?.offset;On.off=n?hn(n):0}}],sound:(e,t)=>({voice:`wood`,f:700,decay:.08,vol:t*.5})},drive(e,t,n){let r=On,i=r.off>.06;i&&!r.out&&(r.t0=e),r.out=i;let a=U((e-r.t0)/1.2,0,1),o=1-t.pop,s=t.pop>0,c=s?Mn(U(o/.75,0,1)):0;n.parts.cork={offset:[.12*c,.55*c,0],angle:s?2.4*c:0};let l=Math.max(s?1-W(.3,.8,o):0,a<1?1-W(.25,.7,a):0);n.parts.puff={visible:l},n.amount=1+1.5*Math.max(t.pop,a<1?1-a:0)},build(e,t){let n=t.color,r=.08,i=e=>{let t=1-Math.abs(pn(e.n,Ln)),n=V(`#a9cbd6`,`#ffffff`,.6*t*t);return n=V(n,[1,1,1],.9*Math.max(0,pn(e.n,Rn))**40),n};e.add(e.lathe([[0,-.5],[.28,-.44],[.46,-.2],[.5,.02],[.42,.28],[.2,.44],[.13,.52],[.12,.8],[.15,.84]],{grid:96}),{flat:.15,opacity:.1,weight:.6,pattern:!1,color:i}),e.add(e.torus(.14,.025),{pos:[0,.84,0],flat:.2,weight:1.5,opacity:.6,pattern:!1,color:i});let a=[];for(let e=0;e<=12;e++){let t=-.47+e/12*.5499999999999999,n=t<.02?Math.sqrt(Math.max(0,.47**2-(t+0)**2))*(t<-.2?.98:1):.47;a.push([Math.min(n,.46),t])}a.push([0,r]),e.add(e.lathe(a,{grid:80}),{flat:.25,kind:`twinkle`,params:[.05,0],pattern:!1,color:e=>{let t=e.p[1]>.06,i=Math.max(0,pn(e.n,Ln))**1.5,a=U((r-e.p[1])/.55,0,1),o=V(H(n,.72+.2*(1-a)),V(n,`#ffffff`,.3),i);return Y(t?V(n,`#ffffff`,.4):o)}}),e.cloud({share:.006,size:1.3,pattern:!1},e=>{let t=e()*G,r=.28*Math.sqrt(e());return{p:[Math.sin(t)*r,-.42+e()*.2,Math.cos(t)*r],color:V(n,`#ffffff`,.75),opacity:.9,kind:`rise`,params:[.16,e()]}});let o=e.part(`cork`,{pivot:[0,.86,0],axis:[0,0,1]});e.add(e.cone(.105,.13,.2),{pos:[0,.88,0],part:o,flat:.2,weight:1.5,color:e=>Q(V(`#c49a6c`,`#8d6340`,.5+.4*e.noise(e.p[0]*40,e.p[1]*40,e.p[2]*40)),e.n)});let s=e.part(`puff`,{pivot:[0,.95,0]});e.cloud({share:.03,size:1.3,part:s,pattern:!1},e=>({p:[(e()-.5)*.2,.95+e()*.1,(e()-.5)*.2],color:V(n,`#ffffff`,.3+.7*e()),opacity:.9,kind:`rise`,params:[.6+.5*e(),e()]})),e.reach([0,1.45,0])}},telescope:{alive:!0,density:.6,controls:[{key:`open`,label:`Extend`,type:`toggle`,default:1,ease:1.2}],action:{key:`open`,label:`Extend or collapse`},hands:{joints:[{type:`slider`,part:`tube2`,pivot:lr.mount,axis:lr.dir,min:0,max:.3,gravity:!1,friction:2,damping:7,bounce:.1,start:e=>.3*(1-X(e.open)),pos:K(lr.mount,J(lr.dir,-.49)),pick:[.15,.15,.15],sound:(e,t)=>({voice:`metal`,f:e.v>.15?520:760,decay:.12,vol:t*.5})},{type:`slider`,part:`tube3`,parent:`tube2`,pivot:lr.mount,axis:lr.dir,min:0,max:.3,gravity:!1,friction:2,damping:7,bounce:.1,start:e=>.3*(1-X(e.open)),pos:K(lr.mount,J(lr.dir,-.82)),pick:[.14,.14,.14],sound:(e,t)=>({voice:`metal`,f:e.v>.15?640:900,decay:.1,vol:t*.45})}]},drive(e,t,n){let r=X(t.open),i=lr.dir;n.parts.tube2={offset:J(i,.3*(1-r))},n.parts.tube3={offset:J(i,.6*(1-r))},n.body={quat:At([0,1,0],.1*Math.sin(e*.4))}},build(e){let t=`#d4a64a`,{dir:n,mount:r}=lr,i=Nt([0,1,0],n),a=(a,o,s,c,l)=>e.add(e.cylinder(s,o-a,{caps:!0}),{pos:K(r,J(n,(a+o)/2)),quat:i,part:c,flat:.15,color:e=>l?Q(l,e.n,{amb:.6,dif:.5,spec:.4}):$(e.n,t)});a(-.36,.56,.12,0,`#2d3b55`),a(.5,.64,.14,0),a(-.4,-.33,.13,0),a(.02,.08,.125,0),e.add(e.disc(.12),{pos:K(r,J(n,.645)),quat:i,weight:2,pattern:!1,color:e=>Y(V(`#15305c`,`#9ad1ff`,.35+.5*Math.max(0,pn(e.n,Rn))))});let o=e.part(`tube2`,{pivot:r}),s=e.part(`tube3`,{pivot:r});a(-.68,-.3,.095,o),a(-.7,-.65,.103,o),a(-.98,-.6,.068,s),a(-1.02,-.95,.08,s,`#2a2a2e`);let c=K(r,[0,-.1,0]);for(let t=0;t<3;t++){let n=t/3*G+.6,r=[Math.sin(n)*.6,-1,Math.cos(n)*.6];e.add(e.tube(e=>K(c,J(q(r,c),e)),.026,{samples:8,grid:24}),{flat:.2,weight:1.3,color:e=>Q(`#6d4428`,e.n,{spec:.3})})}e.add(e.sphere(.075),{pos:c,weight:2,color:e=>$(e.n,t)}),e.add(e.cylinder(.03,.12),{pos:K(c,[0,.07,0]),weight:2,color:e=>$(e.n,t)})}}},hr=at(`chest`);function gr({count:e=14e4,seed:t=hr,wood:n}={}){let r=mr.chest,i={};for(let e of r.options||[])i[e.key]=e.default;n&&(i.wood=n);let a=en(r,{seed:t,count:e,options:i},()=>{}),o=a.next();for(;!o.done;)o=a.next();let s=o.value,c=s.buf,l=0;for(let e=0;e<c.count;e++)c.scale[e*3]+c.scale[e*3+1]+c.scale[e*3+2]>0&&l++;let u=Ie(l),d=e=>Math.max(0,Math.min(255,Math.round(e*255))),f=0;for(let e=0;e<c.count;e++)if(c.scale[e*3]+c.scale[e*3+1]+c.scale[e*3+2]>0){for(let t=0;t<3;t++)u.pos[f*3+t]=c.pos[e*3+t],u.scale[f*3+t]=c.scale[e*3+t];for(let t=0;t<4;t++)u.rot[f*4+t]=c.rot[e*4+t];for(let t=0;t<4;t++)u.color[f*4+t]=d(c.color[e*4+t]);u.part[f]=c.anim?Math.round(c.anim[e*4])%16:0,f++}return{set:u,parts:s.parts.map(e=>({name:e.name,pivot:e.pivot.slice(),axis:e.axis.slice()})),requested:e}}function _r(e,t=2e5){let n=e[0]===31&&e[1]===139?le(e):e;if(String.fromCharCode(n[0],n[1],n[2],n[3])!==`WCT1`)throw Error(`Not a WCT1 volume.`);let r=new DataView(n.buffer,n.byteOffset,n.byteLength),i=r.getUint16(4,!0),a=r.getUint16(6,!0),o=r.getUint16(8,!0),s=r.getFloat32(10,!0),c=n.subarray(14),l=0;for(let e=0;e<c.length;e++)c[e]>=40&&l++;let u=Math.min(1,t/l),d=Math.cbrt(1/u),f=Ie(Math.min(l,Math.ceil(t*1.02))),p=0,m=[i/2,a/2,o/2];for(let e=0;e<o;e++)for(let t=0;t<a;t++)for(let n=0;n<i;n++){let r=n+i*(t+a*e),o=c[r];if(o<40||u<1&&Fe(r)>=u||p>=f.count)continue;let l=p++,h=Fe(r*3+1)-.5,g=Fe(r*3+2)-.5,_=Fe(r*3+3)-.5;f.pos[l*3]=(n-m[0]+h*.6)*s,f.pos[l*3+1]=(e-m[2]+_*.6)*s,f.pos[l*3+2]=(t-m[1]+g*.6)*s;let v=s*.62*d;f.scale[l*3]=v,f.scale[l*3+1]=v,f.scale[l*3+2]=v,f.rot[l*4+3]=1;let y=(o-40)/215,b=vr(y);f.color[l*4]=b[0],f.color[l*4+1]=b[1],f.color[l*4+2]=b[2],f.color[l*4+3]=Math.round(255*Math.min(1,.32+.85*y)),f.part[l]=0}f.count=p;for(let e of[`pos`,`scale`])f[e]=f[e].subarray(0,p*3);for(let e of[`rot`,`color`])f[e]=f[e].subarray(0,p*4);return f.part=f.part.subarray(0,p),{set:f,info:{nx:i,ny:a,nz:o,voxel:s,kept:l,used:p}}}function vr(e){let t=[[0,[74,52,36]],[.3,[150,112,74]],[.6,[214,188,150]],[1,[248,240,226]]];for(let n=1;n<t.length;n++)if(e<=t[n][0]){let[r,i]=t[n-1],[a,o]=t[n],s=(e-r)/(a-r);return i.map((e,t)=>Math.round(e+(o[t]-e)*s))}return t[t.length-1][1]}function yr(e,t){let n=[0,0,0],r=[0,0,0,1];for(let i=0;i<e.count;i++){for(let t=0;t<3;t++)n[t]=e.pos[i*3+t];let a=Ee(t,n);for(let t=0;t<3;t++)e.pos[i*3+t]=a[t];for(let t=0;t<4;t++)r[t]=e.rot[i*4+t];let o=Te(t,r);for(let t=0;t<4;t++)e.rot[i*4+t]=o[t]}}const br=/* @__PURE__ */ new Map,xr=e=>{let t=br.get(e);if(!t)throw Error(`The data thread has no "${e}" cloud.`);return t},Sr=e=>decodeURIComponent(new URL(e).pathname.split(`/`).pop());async function Cr(e){let t=Sr(e),n;try{n=await fetch(e)}catch{throw Error(`${t} did not load: the network request failed (${e}).`)}if(!n.ok)throw Error(`${t} did not load: HTTP ${n.status}${n.statusText?` `+n.statusText:``} (${e}).`);try{return await n.arrayBuffer()}catch{throw Error(`${t} did not load: the download stopped partway (${e}).`)}}async function wr(e,t){try{return await t()}catch(t){throw Error(`${Sr(e)} could not be read: ${t.message}`)}}const Tr=/* @__PURE__ */ new Map;function Er(e,t={}){let n=Le(e),r=e.pos.slice(),i=e.part.slice();return{result:{count:e.count,gpu:n,pos:r,parts:i,...t},transfer:[n.buffer,r.buffer,i.buffer]}}const Dr={async sog({key:e,url:t,upright:n}){let r=performance.now(),i=await Cr(t),a=performance.now(),{set:o,meta:s}=await wr(t,()=>Ge(i)),c=performance.now();n&&yr(o,we([1,0,0],Math.PI/2));let l=Re(o),u=ze(o,1);return o.transform=u,br.set(e,o),Er(o,{key:e,meta:s,bytes:i.byteLength,transform:u,rawRadius:l.radius,ms:{fetch:a-r,decode:c-a}})},async chest({key:e,count:t,seed:n,wood:r}){let i=performance.now(),{set:a,parts:o,recipeBytes:s}=gr({count:t,seed:n,wood:r}),c=performance.now()-i;a.transform=ze(a,1);for(let e of o)e.pivot=e.pivot.map((e,t)=>(e-a.transform.center[t])*a.transform.scale);return br.set(e,a),Er(a,{key:e,parts:o,ms:c,recipeBytes:s})},async walnut({key:e,url:t,budget:n}){let r=await Cr(t),{set:i,info:a}=await wr(t,()=>_r(new Uint8Array(r),n));i.transform=ze(i,1);let o=1/0;for(let e=0;e<i.count;e++)o=Math.min(o,i.pos[e*3+2]);return br.set(e,i),Er(i,{key:e,info:a,bytes:r.byteLength,mmPerUnit:1/i.transform.scale,zmin:o})},async rename({from:e,to:t}){return br.set(t,xr(e)),br.delete(e),Tr.delete(t),{result:!0}},async raw({key:e,set:t}){return br.set(e,t),{result:{key:e,count:t.count}}},async tree({key:e}){let t=xr(e),n=performance.now(),r=Ke(t);return Tr.set(e,r),{result:{levels:r.levels,leaves:qe(r),ms:performance.now()-n}}},async level({key:e,level:t}){let n=Tr.get(e);if(!n)throw Error(`The data thread has no tree for "${e}".`);let{from:r,to:i}=Ze(n,xr(e),t),a=Le(r),o=Le(i),s=r.pos.slice(),c=i.pos.slice();return{result:{count:i.count,from:a,to:o,posFrom:s,posTo:c},transfer:[a.buffer,o.buffer,s.buffer,c.buffer]}},async pair({from:e,to:t}){let{a:n,b:r}=tt(xr(e),xr(t)),i=Le(n),a=Le(r),o=n.pos.slice(),s=r.pos.slice(),c=r.part.slice();return{result:{count:r.count,from:i,to:a,posFrom:o,posTo:s,parts:c},transfer:[i.buffer,a.buffer,o.buffer,s.buffer,c.buffer]}},async pick({key:e,view:t,focal:n,w:r,h:i,shift:a,x:o,y:s}){return{result:nt(xr(e),t,n,r,i,a,o,s)}}};self.onmessage=async e=>{let{id:t,op:n,args:r}=e.data;try{let e=await Dr[n](r);self.postMessage({id:t,ok:!0,result:e.result},e.transfer||[])}catch(e){self.postMessage({id:t,ok:!1,error:e?.message||String(e),stack:e?.stack||``})}};export{o as t};