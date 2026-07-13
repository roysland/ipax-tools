// Derived from IPAX 2 r.20260517 by Santiago Bustelo (https://bustelo.com.ar) — license pending
export function calculatePenalties(txt, bg, isDarkContext) {
    let totalPenalty = 0;
    const warnings = [];
    let chromoP = 0, sconeP = 0, simP = 0;

    if (txt.c > 0.12 && bg.c > 0.12) {
        let hueDelta = Math.abs(txt.h - bg.h);
        if (hueDelta > 180) hueDelta = 360 - hueDelta;
        if (hueDelta > 30) {
            const hueActivation = Math.min(1, (hueDelta - 30) / 60);
            chromoP = Math.min(2.0, (txt.c * bg.c) * 25 * hueActivation);
        }
    }

    const blueHueActivation = Math.max(0, 1 - (Math.abs(txt.h - 260) / 30));
    if (blueHueActivation > 0 && txt.c > 0.12 && txt.l < 0.6) {
        sconeP = Math.min(1.0, txt.c * 3.0) * blueHueActivation;
    }

    let hueDeltaSC = Math.abs(txt.h - bg.h);
    if (hueDeltaSC > 180) hueDeltaSC = 360 - hueDeltaSC;
    const bgStrength = Math.min(1, Math.max(0, (bg.c - 0.08) / 0.06));
    const txtSusceptibility = Math.min(1, Math.max(0, 1 - (txt.c / 0.06)));
    const opponentActivation = Math.exp(-Math.pow(hueDeltaSC - 120, 2) / (2 * Math.pow(50, 2)));
    simP = Math.min(1.0, 1.0 * bgStrength * txtSusceptibility * opponentActivation);

    let rawChroma = chromoP + sconeP + simP;
    if (rawChroma > 2.0) {
        const scale = 2.0 / rawChroma;
        chromoP *= scale; sconeP *= scale; simP *= scale;
    }

    if (chromoP > 0.15) warnings.push({ slug: 'chromostereopsis', val: parseFloat(chromoP.toFixed(2)) });
    if (sconeP > 0.15) warnings.push({ slug: 's_cone', val: parseFloat(sconeP.toFixed(2)) });
    if (simP > 0.15) warnings.push({ slug: 'sim_contrast', val: parseFloat(simP.toFixed(2)) });

    totalPenalty += (chromoP + sconeP + simP);

    if (isDarkContext) {
        const bgActivation = Math.max(0, Math.min(1, (0.25 - bg.l) / 0.25));
        const txtActivation = Math.max(0, Math.min(1, (txt.l - 0.75) / 0.25));
        const halationActivation = bgActivation * txtActivation;

        if (halationActivation > 0) {
            const deltaL = txt.l - bg.l;
            let halationPenalty = 0.8 * Math.pow(deltaL, 2.5) * halationActivation;
            if (halationPenalty > 0.15) {
                totalPenalty += halationPenalty;
                warnings.push({ slug: 'halation', val: parseFloat(halationPenalty.toFixed(2)) });
            }
        }
        if (bg.l < 0.04) {
            const mydriasisPenalty = 0.4 * (1 - (bg.l / 0.04));
            if (mydriasisPenalty > 0.1) {
                totalPenalty += mydriasisPenalty;
                warnings.push({ slug: 'mydriasis', val: parseFloat(mydriasisPenalty.toFixed(2)) });
            }
        }
    } else {
        if (bg.l > 0.96) {
            const glarePenalty = Math.min(1.0, 1.0 * ((bg.l - 0.96) / 0.04));
            if (glarePenalty > 0.1) {
                totalPenalty += parseFloat(glarePenalty.toFixed(2));
                warnings.push({ slug: 'glare', val: parseFloat(glarePenalty.toFixed(2)) });
            }
        }
    }
    return { totalPenalty, warnings };
}

export function calculateRewards(txt, bg, isDarkContext, biologicalScore, totalPenalty) {
    const bonuses = [];
    let totalReward = 0;

    const smoothstep = (min, max, value) => {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    };

    const biologicalActivation = smoothstep(2.0, 3.5, biologicalScore);
    const penaltyActivation = Math.max(0, 1 - (totalPenalty / 0.8));
    const rewardGating = biologicalActivation * penaltyActivation;

    if (rewardGating === 0) return { totalReward: 0, bonuses };

    const isPositivePolarity = !isDarkContext;

    if (isPositivePolarity && bg.l <= 0.95) {
        const midpoint = 0.915, width = 0.027;
        const paperToneReward = 0.2 * Math.exp(-Math.pow(bg.l - midpoint, 2) / (2 * Math.pow(width, 2)));
        if (paperToneReward > 0.02) {
            totalReward += paperToneReward;
            bonuses.push({ slug: 'paper_tone', val: paperToneReward });
        }
    }

    if (bg.c < 0.03) {
        const adaptationReward = 0.2 * Math.max(0, 1 - (bg.c / 0.03));
        if (adaptationReward > 0.02) {
            totalReward += adaptationReward;
            bonuses.push({ slug: 'chromatic_relief', val: adaptationReward });
        }
    }

    if (txt.c < 0.02 && bg.c > 0.03 && bg.c < 0.12) {
        const txtNeutrality = Math.max(0, 1 - (txt.c / 0.02));
        const bgIntentionality = Math.exp(-Math.pow(bg.c - 0.07, 2) / (2 * Math.pow(0.04, 2)));
        const swissReward = 0.15 * txtNeutrality * bgIntentionality;
        if (swissReward > 0.02) {
            totalReward += swissReward;
            bonuses.push({ slug: 'achromatic_tint_contrast', val: swissReward });
        }
    }

    totalReward *= rewardGating;
    return { totalReward: parseFloat(Math.min(0.5, totalReward).toFixed(2)), bonuses };
}
