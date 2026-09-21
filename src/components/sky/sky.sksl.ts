/** §Annexe A — dégradé, soleil, horizon, nuages, étoiles, lueur d'écran, grain. */
export const SKY_SKSL = `
uniform vec2  u_res;
uniform float u_time;
uniform vec3  u_zenith;
uniform vec3  u_horizon;
uniform vec3  u_sun;
uniform vec3  u_glow;
uniform float u_sunrise;
uniform float u_horizonY;
uniform float u_glowAmt;
uniform float u_energy;
uniform vec2  u_tilt;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return v;
}

vec4 main(vec2 xy) {
  vec2 uv = xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 tilt = u_tilt * 0.015;

  float h = clamp(uv.y / max(u_horizonY, 0.001), 0.0, 1.0);
  vec3 col = mix(u_zenith, u_horizon, pow(h, 1.6));

  vec2 sunPos = vec2(0.5 + tilt.x, u_horizonY + 0.10 - u_sunrise * 0.30 + tilt.y);
  float dist = length((uv - sunPos) * vec2(aspect, 1.0));
  float halo = exp(-dist * dist * 6.0) * u_sunrise;
  float disc = (1.0 - smoothstep(0.06, 0.075, dist)) * u_sunrise;
  col += u_sun * (halo * 0.9 + disc * 0.6);

  float below = smoothstep(u_horizonY - 0.002, u_horizonY + 0.002, uv.y);
  vec3 ground = u_zenith * 0.55 + u_sun * 0.08 * u_sunrise;
  col = mix(col, ground, below * 0.85);

  float px = abs(uv.y - u_horizonY) * u_res.y;
  float line = exp(-px * 0.9) + exp(-px * 0.08) * 0.2;
  col += u_sun * line * (0.25 + 0.75 * u_sunrise);

  vec2 cp = vec2(uv.x * aspect * 2.2 + u_time * 0.012, uv.y * 3.0) + tilt * 4.0;
  float clouds = smoothstep(0.55, 0.85, fbm(cp));
  col = mix(col, col + u_sun * 0.10 + 0.03, clouds * (1.0 - below) * 0.35);

  vec2 cell = floor(xy / 6.0);
  vec2 local = fract(xy / 6.0) - 0.5;
  float star = step(0.985, hash12(cell)) * (1.0 - smoothstep(0.0, 0.18, length(local)));
  float twinkle = 0.6 + 0.4 * sin(u_time * 2.0 + hash12(cell + 7.0) * 6.2831);
  col += star * twinkle * (1.0 - h) * (1.0 - u_sunrise) * 0.8;

  float flicker = 1.0 + (hash12(vec2(floor(u_time * 14.0), 3.0)) - 0.5) * 0.35 * u_energy;
  float k = (1.0 - uv.y) * 2.2;
  col += u_glow * exp(-k * k) * u_glowAmt * flicker * 0.8;

  vec2 q = uv - 0.5;
  col *= 1.0 - dot(q, q) * 0.55;

  float g = hash12(xy + floor(u_time * 12.0) * 17.0) - 0.5;
  col += g * mix(0.018, 0.06, u_energy);

  return vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
