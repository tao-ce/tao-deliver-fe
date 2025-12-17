// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getInitialAnswers, getPlacedAnswers } from '../answerPlacement.js';

describe('getInitialAnswers', () => {
    const gaps = [
        { key: 'a', shape: 'rect' },
        { key: 'b', shape: 'circle' },
        { key: 'c', shape: 'poly' }
    ];
    const choices = [
        { key: 'A', data: 'aa.jpg', width: 40, height: 20 },
        { key: 'B', data: 'bb.jpg', width: 15, height: 30 },
        { key: 'C', data: 'cc.jpg', width: 80, height: 8 },
        { key: 'D', data: 'dd.jpg', width: 8, height: 80 }
    ];

    it('returns answers with dummy size & coords', () => {
        let answers = getInitialAnswers(gaps, choices, [
            ['B', 'a'],
            ['A', 'b']
        ]);
        expect(answers).toEqual([
            {
                key: 'B',
                gapKey: 'a',
                concatenatedKey: '0_B',
                data: 'bb.jpg',
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                gap: gaps[0],
                choice: choices[1]
            },
            {
                key: 'A',
                gapKey: 'b',
                concatenatedKey: '1_A',
                data: 'aa.jpg',
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                gap: gaps[1],
                choice: choices[0]
            }
        ]);
    });

    it('returns empty array if no choices/gaps/matches', () => {
        let answers = getInitialAnswers(gaps, choices, []);
        expect(answers).toEqual([]);

        answers = getInitialAnswers(gaps, [], []);
        expect(answers).toEqual([]);

        answers = getInitialAnswers([], choices, []);
        expect(answers).toEqual([]);
    });
});

describe('getPlacedAnswers', () => {
    const simpleChoices = [
        { key: 'A', data: 'aa.jpg', width: 40, height: 20 },
        { key: 'B', data: 'bb.jpg', width: 15, height: 30 },
        { key: 'C', data: 'cc.jpg', width: 80, height: 8 },
        { key: 'D', data: 'dd.jpg', width: 8, height: 80 }
    ];

    function roundTo3Digits(number) {
        return Math.round((number + Number.EPSILON) * 1000) / 1000;
    }
    function expectAnswer(answers, { key, gapKey, x, y, width, height }) {
        const answer = answers.find(a => a.key === key && a.gapKey === gapKey);
        expect(answer).toBeTruthy();
        expect(roundTo3Digits(answer.x)).toEqual(x);
        expect(roundTo3Digits(answer.y)).toEqual(y);
        expect(roundTo3Digits(answer.width)).toEqual(width);
        expect(roundTo3Digits(answer.height)).toEqual(height);
    }

    describe('basic behavior', () => {
        const simpleGaps = [
            {
                key: 'a',
                shape: 'rect',
                matchMax: 1,
                svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
            },
            {
                key: 'b',
                shape: 'rect',
                matchMax: 1,
                svg: { bbox: () => ({ x: 10, y: 0, width: 100, height: 100, x2: 110, y2: 100 }) }
            },
            {
                key: 'c',
                shape: 'rect',
                matchMax: 1,
                svg: { bbox: () => ({ x: 0, y: 10, width: 100, height: 100, x2: 100, y2: 110 }) }
            },
            {
                key: 'd',
                shape: 'rect',
                matchMax: 1,
                svg: { bbox: () => ({ x: 10, y: 10, width: 100, height: 100, x2: 110, y2: 110 }) }
            }
        ];

        it('returns answer objects for all matches', () => {
            const matches = [
                ['A', 'b'],
                ['B', 'a']
            ];
            let answers = getPlacedAnswers(simpleGaps, simpleChoices, matches, 100, 100, 10, false);
            expect(answers).toEqual([
                {
                    key: 'A',
                    gapKey: 'b',
                    concatenatedKey: '1_A',
                    data: 'aa.jpg',
                    x: 10,
                    y: 0,
                    width: 100,
                    height: 100,
                    gap: simpleGaps[1],
                    choice: simpleChoices[0],
                    tabOrder: 1
                },
                {
                    key: 'B',
                    gapKey: 'a',
                    concatenatedKey: '0_B',
                    data: 'bb.jpg',
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 100,
                    gap: simpleGaps[0],
                    choice: simpleChoices[1],
                    tabOrder: 0
                }
            ]);
        });

        it('returns empty array if no choices/gaps/matches', () => {
            let answers = getPlacedAnswers(simpleGaps, simpleChoices, [], 10, 10, 10, false);
            expect(answers).toEqual([]);

            answers = getPlacedAnswers(simpleGaps, [], [], 10, 10, 10, false);
            expect(answers).toEqual([]);

            answers = getPlacedAnswers([], simpleChoices, [], 10, 10, 10, false);
            expect(answers).toEqual([]);
        });

        it('returns answers sorted by top-to-bottom, right-to-left, if isRTL=false', () => {
            const matches = [
                ['A', 'a'],
                ['B', 'b'],
                ['C', 'c'],
                ['D', 'd']
            ];
            const answers = getPlacedAnswers(simpleGaps, simpleChoices, matches, 100, 100, 10, false);
            expect(answers[0]).toEqual(expect.objectContaining({ key: 'B', gapKey: 'b', x: 10, y: 0, tabOrder: 1 }));
            expect(answers[1]).toEqual(expect.objectContaining({ key: 'A', gapKey: 'a', x: 0, y: 0, tabOrder: 0 }));
            expect(answers[2]).toEqual(expect.objectContaining({ key: 'D', gapKey: 'd', x: 10, y: 10, tabOrder: 3 }));
            expect(answers[3]).toEqual(expect.objectContaining({ key: 'C', gapKey: 'c', x: 0, y: 10, tabOrder: 2 }));
        });

        it('returns answers sorted by top-to-bottom, left-to-right, if isRTL=true', () => {
            const matches = [
                ['D', 'd'],
                ['C', 'c'],
                ['B', 'b'],
                ['A', 'a']
            ];
            const answers = getPlacedAnswers(simpleGaps, simpleChoices, matches, 100, 100, 10, true);
            expect(answers[0]).toEqual(expect.objectContaining({ key: 'A', gapKey: 'a', x: 0, y: 0, tabOrder: 1 }));
            expect(answers[1]).toEqual(expect.objectContaining({ key: 'B', gapKey: 'b', x: 10, y: 0, tabOrder: 0 }));
            expect(answers[2]).toEqual(expect.objectContaining({ key: 'C', gapKey: 'c', x: 0, y: 10, tabOrder: 3 }));
            expect(answers[3]).toEqual(expect.objectContaining({ key: 'D', gapKey: 'd', x: 10, y: 10, tabOrder: 2 }));
        });
    });

    describe('fits to gap bounds', () => {
        it('for rect shape, fits to rect', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 1000, 1000, 10, false);
            expect(answers[0]).toEqual(
                expect.objectContaining({ key: 'A', gapKey: 'a', x: 0, y: 0, width: 100, height: 100 })
            );

            const gaps2 = [
                {
                    key: 'b',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50, x2: 100, y2: 100 }) }
                }
            ];
            const matches2 = [['B', 'b']];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches2, 1000, 500, 10, false);
            expect(answers2[0]).toEqual(
                expect.objectContaining({ key: 'B', gapKey: 'b', x: 0, y: 0, width: 100, height: 50 })
            );

            const gaps3 = [
                {
                    key: 'c',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100, x2: 50, y2: 100 }) }
                }
            ];
            const matches3 = [['C', 'c']];
            const answers3 = getPlacedAnswers(gaps3, simpleChoices, matches3, 500, 1000, 10, false);
            expect(answers3[0]).toEqual(
                expect.objectContaining({ key: 'C', gapKey: 'c', x: 0, y: 0, width: 50, height: 100 })
            );
        });

        it('for circle shape, fits to inscribed rect', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'circle',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 1000, 1000, 10, false);
            expect(answers[0].key).toEqual('A');
            expect(answers[0].gapKey).toEqual('a');
            expect(Math.floor(answers[0].x)).toEqual(14);
            expect(Math.floor(answers[0].y)).toEqual(14);
            expect(Math.floor(answers[0].width)).toEqual(70);
            expect(Math.floor(answers[0].height)).toEqual(70);
        });

        it('for ellipse shape, fits to inscribed rect', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'ellipse',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50, x2: 100, y2: 50 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 1000, 500, 10, false);
            expect(answers[0].key).toEqual('A');
            expect(answers[0].gapKey).toEqual('a');
            expect(Math.floor(answers[0].x)).toEqual(14);
            expect(Math.floor(answers[0].y)).toEqual(7);
            expect(Math.floor(answers[0].width)).toEqual(70);
            expect(Math.floor(answers[0].height)).toEqual(35);

            const gaps2 = [
                {
                    key: 'b',
                    shape: 'ellipse',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches2 = [['B', 'b']];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches2, 500, 1000, 10, false);
            expect(answers2[0].key).toEqual('B');
            expect(answers2[0].gapKey).toEqual('b');
            expect(Math.floor(answers2[0].x)).toEqual(7);
            expect(Math.floor(answers2[0].y)).toEqual(14);
            expect(Math.floor(answers2[0].width)).toEqual(35);
            expect(Math.floor(answers2[0].height)).toEqual(70);
        });

        it('for poly shape, fits to smallest rect based on poly center', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'poly',
                    matchMax: 1,
                    cx: 10,
                    cy: 20,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50, x2: 100, y2: 50 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 500, 1000, 10, false);
            expect(answers[0]).toEqual(
                expect.objectContaining({
                    key: 'A',
                    gapKey: 'a',
                    x: 0,
                    y: 0,
                    width: 10 * 2,
                    height: 20 * 2
                })
            );

            const gaps2 = [
                {
                    key: 'b',
                    shape: 'poly',
                    matchMax: 1,
                    cx: 30,
                    cy: 90,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100, x2: 50, y2: 100 }) }
                }
            ];
            const matches2 = [['B', 'b']];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches2, 1000, 500, 10, false);
            expect(answers2[0]).toEqual(
                expect.objectContaining({
                    key: 'B',
                    gapKey: 'b',
                    x: 30 - 20,
                    y: 90 - 10,
                    width: 20 * 2,
                    height: 10 * 2
                })
            );
        });

        it('scales up to fit gap, if choice is smaller than gap', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 8, 8, 1, false);
            expect(Math.floor(answers[0].width)).toEqual(100);
            expect(Math.floor(answers[0].height)).toEqual(100);

            const gaps2 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches2 = [['A', 'a']];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches2, 200, 8, 1, false);
            expect(Math.floor(answers2[0].width)).toEqual(100);
            expect(Math.floor(answers2[0].height)).toEqual(4);

            const gaps3 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches3 = [['A', 'a']];
            const answers3 = getPlacedAnswers(gaps3, simpleChoices, matches3, 8, 200, 1, false);
            expect(Math.floor(answers3[0].width)).toEqual(4);
            expect(Math.floor(answers3[0].height)).toEqual(100);
        });

        it('scales down to fit gap, if choice is bigger than gap', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 8, height: 8, x2: 100, y2: 100 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 100, 100, 1, false);
            expect(Math.floor(answers[0].width)).toEqual(8);
            expect(Math.floor(answers[0].height)).toEqual(8);

            const gaps2 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 8, height: 8, x2: 100, y2: 100 }) }
                }
            ];
            const matches2 = [['A', 'a']];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches2, 200, 50, 1, false);
            expect(Math.floor(answers2[0].width)).toEqual(8);
            expect(Math.floor(answers2[0].height)).toEqual(2);

            const gaps3 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 8, height: 8, x2: 100, y2: 100 }) }
                }
            ];
            const matches3 = [['A', 'a']];
            const answers3 = getPlacedAnswers(gaps3, simpleChoices, matches3, 50, 200, 1, false);
            expect(Math.floor(answers3[0].width)).toEqual(2);
            expect(Math.floor(answers3[0].height)).toEqual(8);
        });

        it('respects min answer size, if choice width > gap width', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 125, 50, 1, false);
            expect(Math.floor(answers[0].width)).toEqual(100);
            expect(Math.floor(answers[0].height)).toEqual(40);

            const answers2 = getPlacedAnswers(gaps, simpleChoices, matches, 125, 50, 120, false);
            expect(Math.floor(answers2[0].width)).toEqual(300);
            expect(Math.floor(answers2[0].height)).toEqual(120);
        });

        it('respects min answer size, if choice height > gap height', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 50, 125, 1, false);
            expect(Math.floor(answers[0].width)).toEqual(40);
            expect(Math.floor(answers[0].height)).toEqual(100);

            const answers2 = getPlacedAnswers(gaps, simpleChoices, matches, 50, 125, 120, false);
            expect(Math.floor(answers2[0].width)).toEqual(120);
            expect(Math.floor(answers2[0].height)).toEqual(300);
        });

        it('respects min answer size, if choice height & width > gap height & width', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 120, 200, 1, false);
            expect(Math.floor(answers[0].width)).toEqual(60);
            expect(Math.floor(answers[0].height)).toEqual(100);

            const answers2 = getPlacedAnswers(gaps, simpleChoices, matches, 125, 140, 150, false);
            expect(Math.floor(answers2[0].width)).toEqual(150);
            expect(Math.floor(answers2[0].height)).toEqual(168);

            const answers3 = getPlacedAnswers(gaps, simpleChoices, matches, 200, 120, 1, false);
            expect(Math.floor(answers3[0].width)).toEqual(100);
            expect(Math.floor(answers3[0].height)).toEqual(60);

            const answers4 = getPlacedAnswers(gaps, simpleChoices, matches, 140, 125, 150, false);
            expect(Math.round(answers4[0].width)).toEqual(168);
            expect(Math.floor(answers4[0].height)).toEqual(150);
        });

        it('increases answer size by outerBorderSize, if allowChoiceResize is false', () => {
            const allowChoiceResize = false;
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 100, 100, 1, false, 6, allowChoiceResize);
            expect(Math.floor(answers[0].width)).toEqual(106);
            expect(Math.floor(answers[0].height)).toEqual(106);

            const answers2 = getPlacedAnswers(gaps, simpleChoices, matches, 100, 100, 1, false, 10, allowChoiceResize);
            expect(Math.floor(answers2[0].width)).toEqual(110);
            expect(Math.floor(answers2[0].height)).toEqual(110);
        });

        it('decreases answer size by outerBorderSize, if allowChoiceResize is true', () => {
            const allowChoiceResize = true;
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 100, x2: 100, y2: 100 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 100, 100, 1, false, 6, 2, allowChoiceResize);
            expect(Math.floor(answers[0].width)).toEqual(92);
            expect(Math.floor(answers[0].height)).toEqual(92);

            const answers2 = getPlacedAnswers(gaps, simpleChoices, matches, 100, 100, 1, false, 10, 2, allowChoiceResize);
            expect(Math.floor(answers2[0].width)).toEqual(84);
            expect(Math.floor(answers2[0].height)).toEqual(84);
        });
    });

    describe('places 1 answer on gap', () => {
        it('if matchMax=1, centered in the gap', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 1,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 50, 100, 10, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 37.5, y: 0, width: 25, height: 50 });

            const answers2 = getPlacedAnswers(gaps, simpleChoices, matches, 10, 2.5, 1, false);
            expectAnswer(answers2, { key: 'A', gapKey: 'a', x: 0, y: 12.5, width: 100, height: 25 });
        });

        it('if matchMax>1 and choice is more horizontal than gap, takes top part', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 110, 50, 10, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 22.5, y: 0, width: 55, height: 25 });

            const gaps2 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100 }) }
                }
            ];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches, 50, 90, 10, false);
            expectAnswer(answers2, { key: 'A', gapKey: 'a', x: 11.111, y: 0, width: 27.778, height: 50 });
        });

        it('if matchMax>1 and choice is more vertical than gap, takes right part', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50 }) }
                }
            ];
            const matches = [['A', 'a']];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 90, 50, 10, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 50, y: 11.111, width: 50, height: 27.778 });

            const gaps2 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100 }) }
                }
            ];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches, 50, 110, 10, false);
            expectAnswer(answers2, { key: 'A', gapKey: 'a', x: 25, y: 22.5, width: 25, height: 55 });
        });
    });

    describe('places 2 answers on gap', () => {
        it('if matchMax=2 and choice is more horizontal than gap, takes top then bottom', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 2,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a']
            ];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 110, 50, 10, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 22.5, y: 0, width: 55, height: 25 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 22.5, y: 25, width: 55, height: 25 });

            const gaps2 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 2,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100 }) }
                }
            ];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches, 50, 90, 10, false);
            expectAnswer(answers2, { key: 'A', gapKey: 'a', x: 11.111, y: 0, width: 27.778, height: 50 });
            expectAnswer(answers2, { key: 'B', gapKey: 'a', x: 11.111, y: 50, width: 27.778, height: 50 });
        });

        it('if matchMax=2 and choice is more vertical than gap, takes right then left', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 2,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a']
            ];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 90, 50, 10, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 50, y: 11.111, width: 50, height: 27.778 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 0, y: 11.111, width: 50, height: 27.778 });

            const gaps2 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 2,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100 }) }
                }
            ];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches, 50, 110, 10, false);
            expectAnswer(answers2, { key: 'A', gapKey: 'a', x: 25, y: 22.5, width: 25, height: 55 });
            expectAnswer(answers2, { key: 'B', gapKey: 'a', x: 0, y: 22.5, width: 25, height: 55 });
        });

        it('if matchMax>2 and choice is horizontal, takes top-right then top-left', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a']
            ];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 200, 100, 1, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 50, y: 0, width: 50, height: 25 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 0, y: 0, width: 50, height: 25 });

            const gaps2 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100 }) }
                }
            ];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches, 10, 5, 1, false);
            expectAnswer(answers2, { key: 'A', gapKey: 'a', x: 25, y: 37.5, width: 25, height: 12.5 });
            expectAnswer(answers2, { key: 'B', gapKey: 'a', x: 0, y: 37.5, width: 25, height: 12.5 });
        });

        it('if matchMax>2 and choice is vertical, takes top-right then bottom-right', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a']
            ];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 100, 200, 1, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 25, y: 0, width: 25, height: 50 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 25, y: 50, width: 25, height: 50 });

            const gaps2 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50 }) }
                }
            ];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches, 5, 10, 1, false);
            expectAnswer(answers2, { key: 'A', gapKey: 'a', x: 50, y: 0, width: 12.5, height: 25 });
            expectAnswer(answers2, { key: 'B', gapKey: 'a', x: 50, y: 25, width: 12.5, height: 25 });
        });
    });

    describe('places 3 answers on gap', () => {
        it('if matchMax>=3 and choice is horizontal, takes top-right then top-left then bottom-left', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 3,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a'],
                ['C', 'a']
            ];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 200, 100, 1, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 50, y: 0, width: 50, height: 25 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 0, y: 0, width: 50, height: 25 });
            expectAnswer(answers, { key: 'C', gapKey: 'a', x: 0, y: 25, width: 50, height: 25 });

            const gaps2 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100 }) }
                }
            ];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches, 100, 50, 50, false);
            expectAnswer(answers2, { key: 'A', gapKey: 'a', x: 25, y: 0, width: 100, height: 50 });
            expectAnswer(answers2, { key: 'B', gapKey: 'a', x: -75, y: 0, width: 100, height: 50 });
            expectAnswer(answers2, { key: 'C', gapKey: 'a', x: -75, y: 50, width: 100, height: 50 });
        });

        it('if matchMax>=3 and choice is vertical, takes top-right then bottom-right then bottom-left', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 3,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 50, height: 100 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a'],
                ['C', 'a']
            ];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 100, 200, 1, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 25, y: 0, width: 25, height: 50 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 25, y: 50, width: 25, height: 50 });
            expectAnswer(answers, { key: 'C', gapKey: 'a', x: 0, y: 50, width: 25, height: 50 });

            const gaps2 = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 50 }) }
                }
            ];
            const answers2 = getPlacedAnswers(gaps2, simpleChoices, matches, 50, 100, 50, false);
            expectAnswer(answers2, { key: 'A', gapKey: 'a', x: 50, y: -75, width: 50, height: 100 });
            expectAnswer(answers2, { key: 'B', gapKey: 'a', x: 50, y: 25, width: 50, height: 100 });
            expectAnswer(answers2, { key: 'C', gapKey: 'a', x: 0, y: 25, width: 50, height: 100 });
        });
    });

    describe('places 4 answers on gap', () => {
        it('if matchMax=4 and choice is horizontal, takes top-right then top-left then bottom-left then bottom-right', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 4,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 200, height: 100 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a'],
                ['C', 'a'],
                ['D', 'a']
            ];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 50, 20, 1, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 100, y: 10, width: 100, height: 40 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 0, y: 10, width: 100, height: 40 });
            expectAnswer(answers, { key: 'C', gapKey: 'a', x: 0, y: 50, width: 100, height: 40 });
            expectAnswer(answers, { key: 'D', gapKey: 'a', x: 100, y: 50, width: 100, height: 40 });
        });

        it('if matchMax=4 and choice is vertical, takes top-right then bottom-right then bottom-left then top-left', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 4,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 20, height: 10 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a'],
                ['C', 'a'],
                ['D', 'a']
            ];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 20, 50, 20, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 10, y: -45, width: 20, height: 50 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 10, y: 5, width: 20, height: 50 });
            expectAnswer(answers, { key: 'C', gapKey: 'a', x: -10, y: 5, width: 20, height: 50 });
            expectAnswer(answers, { key: 'D', gapKey: 'a', x: -10, y: -45, width: 20, height: 50 });
        });

        it('if matchMax>4 and choice is horizontal, stacks top row then takes bottom-left', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 20, height: 10 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a'],
                ['C', 'a'],
                ['D', 'a']
            ];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 50, 20, 20, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 10, y: -15, width: 50, height: 20 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: -15, y: -15, width: 50, height: 20 });
            expectAnswer(answers, { key: 'C', gapKey: 'a', x: -40, y: -15, width: 50, height: 20 });
            expectAnswer(answers, { key: 'D', gapKey: 'a', x: -40, y: 5, width: 50, height: 20 });
        });

        it('if matchMax>4 and choice is vertical, stacks right column then takes bottom-left', () => {
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 200, height: 100 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a'],
                ['C', 'a'],
                ['D', 'a']
            ];
            const answers = getPlacedAnswers(gaps, simpleChoices, matches, 20, 25, 1, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 100, y: 0, width: 40, height: 50 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 100, y: 25, width: 40, height: 50 });
            expectAnswer(answers, { key: 'C', gapKey: 'a', x: 100, y: 50, width: 40, height: 50 });
            expectAnswer(answers, { key: 'D', gapKey: 'a', x: 60, y: 50, width: 40, height: 50 });
        });
    });

    describe('places 5 or more answers on gap', () => {
        it('if choice is horizontal, stacks top row then takes bottom-left', () => {
            const fiveChoices = simpleChoices.concat([{ key: 'E', data: 'ee.jpg' }]);
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 100, height: 200 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a'],
                ['C', 'a'],
                ['D', 'a'],
                ['E', 'a']
            ];
            const answers = getPlacedAnswers(gaps, fiveChoices, matches, 50, 20, 20, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 50, y: 80, width: 50, height: 20 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 33.333, y: 80, width: 50, height: 20 });
            expectAnswer(answers, { key: 'C', gapKey: 'a', x: 16.667, y: 80, width: 50, height: 20 });
            expectAnswer(answers, { key: 'D', gapKey: 'a', x: 0, y: 80, width: 50, height: 20 });
            expectAnswer(answers, { key: 'E', gapKey: 'a', x: 0, y: 100, width: 50, height: 20 });
        });

        it('if choice is vertical, stacks right column then takes bottom-left', () => {
            const fiveChoices = simpleChoices.concat([{ key: 'E', data: 'ee.jpg' }]);
            const gaps = [
                {
                    key: 'a',
                    shape: 'rect',
                    matchMax: 0,
                    svg: { bbox: () => ({ x: 0, y: 0, width: 10, height: 20 }) }
                }
            ];
            const matches = [
                ['A', 'a'],
                ['B', 'a'],
                ['C', 'a'],
                ['D', 'a'],
                ['E', 'a']
            ];
            const answers = getPlacedAnswers(gaps, fiveChoices, matches, 20, 30, 20, false);
            expectAnswer(answers, { key: 'A', gapKey: 'a', x: 5, y: -20, width: 20, height: 30 });
            expectAnswer(answers, { key: 'B', gapKey: 'a', x: 5, y: -10, width: 20, height: 30 });
            expectAnswer(answers, { key: 'C', gapKey: 'a', x: 5, y: 0, width: 20, height: 30 });
            expectAnswer(answers, { key: 'D', gapKey: 'a', x: 5, y: 10, width: 20, height: 30 });
            expectAnswer(answers, { key: 'E', gapKey: 'a', x: -15, y: 10, width: 20, height: 30 });
        });
    });
});
