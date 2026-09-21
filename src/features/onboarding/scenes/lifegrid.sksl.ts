/** §Annexe B — 960 carreaux dessines par un seul shader, pas 960 composants. */
export const LIFE_GRID_SKSL = `
uniform vec2  u_origin;
uniform float u_cell;
uniform float u_cols;
uniform float u_rows;
uniform float u_total;
uniform float u_lived;
uniform float u_lost;
uniform float u_reveal;
uniform float u_fill;
uniform float u_reclaim;
uniform float u_time;
uniform vec3  u_cLived;
uniform vec3  u_cFuture;
uniform vec3  u_cLost;
uniform vec3  u_cReclaimed;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec4 main(vec2 xy) {
  vec2 p = xy - u_origin;
  vec2 cell = floor(p / u_cell);
  if (p.x < 0.0 || p.y < 0.0 || cell.x >= u_cols || cell.y >= u_rows) return vec4(0.0);
  float idx = cell.y * u_cols + cell.x;
  if (idx >= u_total) return vec4(0.0);
  vec2 local = p - (cell + 0.5) * u_cell;

  float diag = (cell.x + cell.y) / (u_cols + u_rows);
  float a = clamp((u_reveal * 1.35 - diag) / 0.35, 0.0, 1.0);
  float grow = a + sin(a * 3.14159) * 0.12;
  float halfSize = u_cell * 0.39 * grow;

  vec3 col = u_cFuture;
  float alpha = 0.16;
  vec2 box = vec2(halfSize);
  float glowAmt = 0.0;

  if (idx < u_lived) {
    col = u_cLived;
    alpha = 0.42;
  } else if (idx < u_lived + u_lost) {
    float k = (idx - u_lived) / max(u_lost, 1.0);
    float f = clamp((u_fill * 1.25 - k) / 0.25, 0.0, 1.0);
    float pulse = 0.85 + 0.15 * sin(u_time * 3.0 + idx * 0.37);
    float sweep = (cell.x / u_cols) * 0.6 + k * 0.4;
    float r = clamp((u_reclaim * 1.3 - sweep) / 0.3, 0.0, 1.0);
    float flip = abs(cos(r * 3.14159));
    vec3 lit = mix(u_cLost * pulse, u_cReclaimed, step(0.5, r));
    col = mix(u_cFuture, lit, f);
    alpha = mix(0.16, 1.0, f);
    box = vec2(max(halfSize * flip, 0.5), halfSize);
    glowAmt = f;
  }

  float radius = min(halfSize * 0.32, box.x);
  float d = sdRoundBox(local, box, radius);
  float shape = 1.0 - smoothstep(-0.6, 0.6, d);
  float glow = exp(-max(d, 0.0) / (u_cell * 0.07)) * 0.35 * glowAmt;
  float outA = clamp(shape * alpha + glow * (1.0 - shape), 0.0, 1.0);
  return vec4(col * outA, outA);
}
`;
