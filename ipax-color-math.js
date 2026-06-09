export function hexToOklch(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!res) return null;
    const r = parseInt(res[1], 16) / 255, g = parseInt(res[2], 16) / 255, b = parseInt(res[3], 16) / 255;
    const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const rl = lin(r), gl = lin(g), bl = lin(b);
    const l = 0.41222*rl + 0.53633*gl + 0.05145*bl;
    const m = 0.2119 *rl + 0.6807 *gl + 0.1074 *bl;
    const s = 0.0883 *rl + 0.28172*gl + 0.62998*bl;
    const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
    const L  =  0.21045*l_ + 0.79362*m_ - 0.00407*s_;
    const a  =  1.97799*l_ - 2.42859*m_ + 0.45059*s_;
    const b_ =  0.0259 *l_ + 0.78277*m_ - 0.80868*s_;
    let H = Math.atan2(b_, a) * (180 / Math.PI);
    if (H < 0) H += 360;
    return { l: L, c: Math.sqrt(a*a + b_*b_), h: H, hex: hex.toUpperCase() };
}

export function getY(L, C, H) {
    const hRad = H * Math.PI / 180;
    const a = C * Math.cos(hRad), b_ = C * Math.sin(hRad);
    const l_ = L + 0.39633*a + 0.2158 *b_;
    const m_ = L - 0.10556*a - 0.06385*b_;
    const s_ = L - 0.08948*a - 1.29149*b_;
    const R_lin = Math.max(0, Math.min(1,  4.0767*(l_**3) - 3.3077*(m_**3) + 0.2309*(s_**3)));
    const G_lin = Math.max(0, Math.min(1, -1.2684*(l_**3) + 2.6097*(m_**3) - 0.3413*(s_**3)));
    const B_lin = Math.max(0, Math.min(1, -0.0041*(l_**3) - 0.7034*(m_**3) + 1.7076*(s_**3)));
    return 0.2126*R_lin + 0.7152*G_lin + 0.0722*B_lin;
}

export function calculateWcagContrast(txtY, bgY) {
    const L1 = Math.max(txtY, bgY);
    const L2 = Math.min(txtY, bgY);
    return (L1 + 0.05) / (L2 + 0.05);
}
