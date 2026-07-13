// Golden snapshot suite — run on every vendor update (see /vendor at the repo
// root) to catch behavior changes that aren't called out in the changelog.
// A failing case here means the ported diff changed something beyond what
// was described — stop and re-read the vendor diff before updating the
// expected value.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getIPAXscore } from '../index.js';

const CASES = [
    {
        name: 'AA text, jitter penalty pulls below WCAG floor',
        args: ['#767676', '#ffffff', null, 400, 'text'],
        expect: { score: 1, string: '1(2)', wcagScore: 2 }
    },
    {
        name: 'max contrast black on white',
        args: ['#000000', '#ffffff', null, 400, 'text'],
        expect: { score: 4, string: '4', wcagScore: 3 }
    },
    {
        name: 'graphical mode, mid contrast',
        args: ['#333333', '#f0f0f0', null, 400, 'graphical'],
        expect: { score: 4.2, string: '4', wcagScore: 3 }
    },
    {
        name: 'fails WCAG entirely',
        args: ['#ff0000', '#00ff00', null, 400, 'text'],
        expect: { score: 0, string: 'X', wcagScore: 0 }
    }
];

for (const { name, args, expect } of CASES) {
    test(name, () => {
        const result = getIPAXscore(...args);
        assert.equal(result.score, expect.score);
        assert.equal(result.string, expect.string);
        assert.equal(result.wcag.score, expect.wcagScore);
    });
}

test('reward clamp: score can never round into the next WCAG tier', () => {
    // Regression guard for the 2026-07-13 fix — ergonomic rewards must stay
    // within [complianceLevel, complianceLevel + 0.9] below tier 3.
    const result = getIPAXscore('#767676', '#ffffff');
    const complianceLevel = Math.min(result.wcag.score, result.apca.score);
    if (complianceLevel < 3) {
        assert.ok(result.score <= complianceLevel + 0.9 + 1e-9);
    }
});
