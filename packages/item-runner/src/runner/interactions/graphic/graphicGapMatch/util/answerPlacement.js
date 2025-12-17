// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { sortByBoundingBox } from '../../util/focusorder.js';
import { calculateScalingFactor, ensureMinSize } from '../../util/scaling.js';

/**
 * @typedef Answer
 * @property {String} key - choice.key
 * @property {String} gapKey - gap.key
 * @property {Number} concatenatedKey - single string to identify answer
 * @property {Number} data - choice.data (image url)
 * @property {Number} x
 * @property {Number} y
 * @property {Number} width
 * @property {Number} height
 * @property {Object} gap - reference to original gap object
 * @property {Object} choice - reference to original choice object
 * @property {Number} tabOrder - use it to sort in keyboard navigation order
 */
/**
 * @typedef Rect
 * @property {Number} x
 * @property {Number} y
 * @property {Number} width
 * @property {Number} height
 */
/**
 * Get answers with dummy coordinates & dummy size:
 * Because of how image loading registration works (see Choice.svelte), we need answers to be drawn on interaction mount
 * But we won't know their coordinates and sizes until gaps are rendered, so for starters just render them anywhere
 * @param {Object[]} gaps
 * @param {Object[]} choices
 * @param {Object[]} matches
 * @returns {Answer[]} answers
 */
export function getInitialAnswers(gaps, choices, matches) {
    return gaps.reduce((initialAnswers, gap, gapIndex) => {
        const gapChoices = getGapChoicesInOrderOfAddition(gap, choices, matches);
        const gapAnswers = gapChoices.map(choice => {
            const answer = getAnswerObject(choice, gap, gapIndex, { x: 0, y: 0, width: 10, height: 10 });
            return answer;
        });
        return initialAnswers.concat(gapAnswers);
    }, []);
}

/**
 * Get answers, with their coordinates and sizes, sorted by overlay order
 * @param {Object[]} gaps
 * @param {Object[]} choices
 * @param {Object[]} matches
 * @param {Number} choiceWidth
 * @param {Number} choiceHeight
 * @param {Number} answerMinSize
 * @param {Boolean} isRTL
 * @param {Number} outerBorderSize
 * @param {Number} choiceBorderSize
 * @param {Boolean} allowChoiceResize
 * @returns {Answer[]} answers
 */
export function getPlacedAnswers(
    gaps,
    choices,
    matches,
    choiceWidth,
    choiceHeight,
    answerMinSize,
    isRTL,
    outerBorderSize = 0,
    choiceBorderSize = 0,
    allowChoiceResize
) {
    const answersUnordered = [];
    gaps.forEach((gap, gapIndex) => {
        const gapChoices = getGapChoicesInOrderOfAddition(gap, choices, matches); //this should be in order of adding, so last choice is always the most visible
        if (gapChoices.length > 0) {
            addGapAnswers(
                answersUnordered,
                gap,
                gapIndex,
                gapChoices,
                choiceWidth,
                choiceHeight,
                answerMinSize,
                outerBorderSize,
                choiceBorderSize,
                allowChoiceResize
            );
        }
    });

    const leftUnderRight = !isRTL; //layout direction is reversed because remove button is on the right corner, and it should be kept visible as long as possible
    const boxesForSorting = answersUnordered.map((answer, index) => ({
        key: index,
        bbox: { x: answer.x, y: answer.y, x2: answer.x + answer.width, y2: answer.y + answer.height }
    }));
    const indexesOrderedForLayout = sortByBoundingBox(boxesForSorting, leftUnderRight);
    const indexesOrderedForKeyboard = sortByBoundingBox(boxesForSorting, isRTL); //but keyboard nav direction shouldn't be reversed

    return indexesOrderedForLayout.map(i => {
        const answer = answersUnordered[i];
        answer.tabOrder = indexesOrderedForKeyboard.indexOf(i);
        return answer;
    });
}

/**
 * Add answers for specified gap
 * @param {Answer[]} answers - array to which new answers will be appended
 * @param {Object} gap
 * @param {Number} gapIndex - index of gap among all gaps
 * @param {Number} gapChoices - choices that belong to this gap, in order of addition
 * @param {Number} choiceWidth
 * @param {Number} choiceHeight
 * @param {Number} answerMinSize
 * @param {Number} outerBorderSize
 * @param {Number} choiceBorderSize
 * @param {Boolean} allowChoiceResize
 */
function addGapAnswers(answers, gap, gapIndex, gapChoices, choiceWidth, choiceHeight, answerMinSize, outerBorderSize, choiceBorderSize, allowChoiceResize) {
    const matchMax = gap.matchMax;
    const choicesLength = gapChoices.length;
    const boundingRect = getBoundingRect(gap);

    if (choicesLength === 1) {
        if (matchMax === 1) {
            //1 centered
            const { width, height } = getAnswerSize({
                part: boundingRect,
                choiceWidth,
                choiceHeight,
                answerMinSize,
                outerBorderSize,
                choiceBorderSize,
                allowChoiceResize
            });
            const x = getAnchoredX(boundingRect.x, boundingRect.width, width, 'center');
            const y = getAnchoredY(boundingRect.y, boundingRect.height, height, 'center');
            answers.push(getAnswerObject(gapChoices[0], gap, gapIndex, { x, y, width, height }));
        } else {
            //1/2 filled: top or bottom or left or right
            const { horizontal, right, top } = splitRectInTwo(boundingRect, choiceWidth, choiceHeight);
            const first = horizontal ? right : top;
            const { width, height } = getAnswerSize({
                part: first,
                choiceWidth,
                choiceHeight,
                answerMinSize
            });
            const x = getAnchoredX(first.x, first.width, width, first.anchorX);
            const y = getAnchoredY(first.y, first.height, height, first.anchorY);
            answers.push(getAnswerObject(gapChoices[0], gap, gapIndex, { x, y, width, height }));
        }
    } else if (choicesLength === 2) {
        if (matchMax === 2) {
            //2/2 filled: top & bottom or left & right
            const { horizontal, right, top, left, bottom } = splitRectInTwo(boundingRect, choiceWidth, choiceHeight);
            const first = horizontal ? right : top;
            const { width, height } = getAnswerSize({
                part: first,
                choiceWidth,
                choiceHeight,
                answerMinSize
            });
            let x = getAnchoredX(first.x, first.width, width, first.anchorX);
            let y = getAnchoredY(first.y, first.height, height, first.anchorY);
            answers.push(getAnswerObject(gapChoices[0], gap, gapIndex, { x, y, width, height }));

            const second = horizontal ? left : bottom;
            x = getAnchoredX(second.x, second.width, width, second.anchorX);
            y = getAnchoredY(second.y, second.height, height, second.anchorY);
            answers.push(getAnswerObject(gapChoices[1], gap, gapIndex, { x, y, width, height }));
        } else {
            //2/4 filled: topLeft and/or bottomLeft and/or bottomRight and/or topRight
            const { horizontal, topLeft, topRight, bottomRight } = splitRectInFour(
                boundingRect,
                choiceWidth,
                choiceHeight
            );
            const first = topRight;
            const { width, height } = getAnswerSize({
                part: first,
                choiceWidth,
                choiceHeight,
                answerMinSize
            });
            let x = getAnchoredX(first.x, first.width, width, first.anchorX);
            let y = getAnchoredY(first.y, first.height, height, first.anchorY);
            answers.push(getAnswerObject(gapChoices[0], gap, gapIndex, { x, y, width, height }));

            const second = horizontal ? topLeft : bottomRight;
            x = getAnchoredX(second.x, second.width, width, second.anchorX);
            y = getAnchoredY(second.y, second.height, height, second.anchorY);
            answers.push(getAnswerObject(gapChoices[1], gap, gapIndex, { x, y, width, height }));
        }
    } else if (choicesLength === 3) {
        //3/4 filled
        const { horizontal, topLeft, topRight, bottomLeft, bottomRight } = splitRectInFour(
            boundingRect,
            choiceWidth,
            choiceHeight
        );
        const { width, height } = getAnswerSize({
            part: bottomRight,
            choiceWidth,
            choiceHeight,
            answerMinSize
        });
        let x = getAnchoredX(topRight.x, topRight.width, width, topRight.anchorX);
        let y = getAnchoredY(topRight.y, topRight.height, height, topRight.anchorY);
        answers.push(getAnswerObject(gapChoices[0], gap, gapIndex, { x, y, width, height }));

        const second = horizontal ? topLeft : bottomRight;
        x = getAnchoredX(second.x, second.width, width, second.anchorX);
        y = getAnchoredY(second.y, second.height, height, second.anchorY);
        answers.push(getAnswerObject(gapChoices[1], gap, gapIndex, { x, y, width, height }));

        x = getAnchoredX(bottomLeft.x, bottomLeft.width, width, bottomLeft.anchorX);
        y = getAnchoredY(bottomLeft.y, bottomLeft.height, height, bottomLeft.anchorY);
        answers.push(getAnswerObject(gapChoices[2], gap, gapIndex, { x, y, width, height }));
    } else if (choicesLength === 4 && matchMax === 4) {
        //4/4 filled
        const { horizontal, topLeft, topRight, bottomLeft, bottomRight } = splitRectInFour(
            boundingRect,
            choiceWidth,
            choiceHeight
        );
        const { width, height } = getAnswerSize({
            part: bottomRight,
            choiceWidth,
            choiceHeight,
            answerMinSize
        });
        let x = getAnchoredX(topRight.x, topRight.width, width, topRight.anchorX);
        let y = getAnchoredY(topRight.y, topRight.height, height, topRight.anchorY);
        answers.push(getAnswerObject(gapChoices[0], gap, gapIndex, { x, y, width, height }));

        const second = horizontal ? topLeft : bottomRight;
        x = getAnchoredX(second.x, second.width, width, second.anchorX);
        y = getAnchoredY(second.y, second.height, height, second.anchorY);
        answers.push(getAnswerObject(gapChoices[1], gap, gapIndex, { x, y, width, height }));

        x = getAnchoredX(bottomLeft.x, bottomLeft.width, width, bottomLeft.anchorX);
        y = getAnchoredY(bottomLeft.y, bottomLeft.height, height, bottomLeft.anchorY);
        answers.push(getAnswerObject(gapChoices[2], gap, gapIndex, { x, y, width, height }));

        const fourth = horizontal ? bottomRight : topLeft;
        x = getAnchoredX(fourth.x, fourth.width, width, fourth.anchorX);
        y = getAnchoredY(fourth.y, fourth.height, height, fourth.anchorY);
        answers.push(getAnswerObject(gapChoices[3], gap, gapIndex, { x, y, width, height }));
    } else {
        //1/4 filled, then one row or one column stacked
        const { horizontal, bottomLeft, right, top } = splitRectInStacked(boundingRect, choiceWidth, choiceHeight);
        const { width, height } = getAnswerSize({
            part: bottomLeft,
            choiceWidth,
            choiceHeight,
            answerMinSize
        });
        let x = getAnchoredX(bottomLeft.x, bottomLeft.width, width, bottomLeft.anchorX);
        let y = getAnchoredY(bottomLeft.y, bottomLeft.height, height, bottomLeft.anchorY);
        answers.push(
            getAnswerObject(gapChoices[gapChoices.length - 1], gap, gapIndex, {
                x,
                y,
                width,
                height
            })
        );

        if (horizontal) {
            x = getAnchoredX(top.x, top.width / 2, width, 'right');
            y = getAnchoredY(top.y, top.height, height, top.anchorY);
            let xOffset = width / Math.max(gapChoices.length - 2, 0);
            for (let i = 0; i < gapChoices.length - 1; i++) {
                const iReversed = gapChoices.length - 2 - i;
                answers.push(
                    getAnswerObject(gapChoices[i], gap, gapIndex, {
                        x: x + xOffset * iReversed,
                        y,
                        width,
                        height
                    })
                );
            }
        } else {
            x = getAnchoredX(right.x, right.width, width, right.anchorX);
            y = getAnchoredY(right.y, right.height / 2, height, 'bottom');
            let yOffset = height / Math.max(gapChoices.length - 2, 0);
            for (let i = 0; i < gapChoices.length - 1; i++) {
                answers.push(
                    getAnswerObject(gapChoices[i], gap, gapIndex, {
                        x,
                        y: y + yOffset * i,
                        width,
                        height
                    })
                );
            }
        }
    }
}

/**
 * Get choices that belong to specified gap, in order of addition
 * @param {Object} gap
 * @param {Object[]} choices
 * @param {Object[]} matches
 * @returns {Object[]} choices
 */
function getGapChoicesInOrderOfAddition(gap, choices, matches) {
    return matches
        .filter(([, gapKey]) => gapKey === gap.key)
        .map(([choiceKey]) => choices.find(c => c.key === choiceKey));
}

/**
 * Get answer object derived from choice, gap and placement data.
 * 'tabOrder' will be filled later
 * @param {Object} choice
 * @param {Object} gap
 * @param {Number} gapIndex - index of gap among all gaps
 * @param {Rect} placementRect - coordinates and size
 * @returns {Answer}
 */
function getAnswerObject(choice, gap, gapIndex, { x, y, width, height }) {
    return {
        key: choice.key,
        gapKey: gap.key,
        concatenatedKey: `${gapIndex}_${choice.key}`, //rely in the fact that order of gaps never changes; otherwise can generateElementId once and insert it in between
        data: choice.data,
        x,
        y,
        width,
        height,
        gap,
        choice
    };
}

/**
 * Get bounding rectangle of gap.
 * Bounds are calculated in a way that ensures the least probability of answers going outside gap bounds.
 * So it can be smaller that hitbox/getBoundingClientRect, depending on gap shape,
 * And center of gap shape will also be a center of this rect.
 * @param {Object} gap
 * @returns {Rect} boundingRect
 */
function getBoundingRect(gap) {
    const bbox = gap.svg.bbox(); //x,y,x2,y2,width,height
    const shape = gap.shape;
    switch (shape) {
        case 'circle': {
            //inscribed square
            const radius = bbox.width / 2;
            const inscribedSquareWidth = radius * 1.4142; //r * sqrt(2)
            return {
                x: bbox.x + radius - inscribedSquareWidth / 2,
                y: bbox.y + radius - inscribedSquareWidth / 2,
                width: inscribedSquareWidth,
                height: inscribedSquareWidth
            };
        }
        case 'ellipse': {
            //inscribed rect
            const radiusA = bbox.width / 2;
            const radiusB = bbox.height / 2;
            const inscribedX = radiusA * 0.7071; //radiusA * sqrt(2) / 2
            const inscribedY = radiusB * 0.7071; //radiusB * sqrt(2) / 2
            return {
                x: bbox.x + radiusA - inscribedX,
                y: bbox.y + radiusB - inscribedY,
                width: inscribedX * 2,
                height: inscribedY * 2
            };
        }
        case 'poly': {
            //from smallest of 4 rects in which bbox is split by cx/cy
            const cx = gap.cx;
            const cy = gap.cy;
            const topLeft = { x: bbox.x, y: bbox.y, width: cx - bbox.x, height: cy - bbox.y };
            const topRight = { x: cx, y: bbox.y, width: bbox.x2 - cx, height: cy - bbox.y };
            const bottomLeft = { x: bbox.x, y: cy, width: cx - bbox.x, height: bbox.y2 - cy };
            const bottomRight = { x: cx, y: cy, width: bbox.x2 - cx, height: bbox.y2 - cy };
            const smallest = [topLeft, topRight, bottomLeft, bottomRight].sort(
                (a, b) => a.width * a.height - b.width * b.height
            )[0];
            return {
                x: topLeft.x + topLeft.width - smallest.width,
                y: topLeft.y + topLeft.height - smallest.height,
                width: smallest.width * 2,
                height: smallest.height * 2
            };
        }
        default: {
            //rect: rect itself
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height
            };
        }
    }
}

/**
 * @typedef SplitInFourResult
 * @property {Boolean} horizontal - prefer 'more horizontal' placement of choices, if not all 4 parts will be filled
 * @property {Rect} topLeft
 * @property {Rect} topRight
 * @property {Rect} bottomLeft
 * @property {Rect} bottomRight
 */
/**
 * Split gap's bounding rect in 4 parts
 * @param {Rect} boundingRect
 * @param {Number} choiceWidth
 * @param {Number} choiceHeight
 * @returns {SplitInFourResult}
 */
function splitRectInFour(boundingRect, choiceWidth, choiceHeight) {
    const horizontal = getRoundedAspectRatio(choiceWidth, choiceHeight) > 1; //almost meaningless unless we fill whole big gap, and not keep to 4 same-sized parts near center
    const topLeft = {
        x: boundingRect.x,
        y: boundingRect.y,
        width: boundingRect.width / 2,
        height: boundingRect.height / 2,
        anchorX: 'right',
        anchorY: 'bottom'
    };
    const topRight = {
        x: boundingRect.x + topLeft.width,
        y: boundingRect.y,
        width: topLeft.width,
        height: topLeft.height,
        anchorX: 'left',
        anchorY: 'bottom'
    };
    const bottomLeft = {
        x: boundingRect.x,
        y: boundingRect.y + topLeft.height,
        width: topLeft.width,
        height: topLeft.height,
        anchorX: 'right',
        anchorY: 'top'
    };
    const bottomRight = {
        x: boundingRect.x + topLeft.width,
        y: boundingRect.y + topLeft.height,
        width: topLeft.width,
        height: topLeft.height,
        anchorX: 'left',
        anchorY: 'top'
    };
    return { horizontal, topLeft, topRight, bottomLeft, bottomRight };
}

/**
 * @typedef SplitInTwoResult
 * @property {Boolean} horizontal - place choices in row; otherwise in column
 * @property {Rect} [left] - if horizontal
 * @property {Rect} [right] - if horizontal
 * @property {Rect} [top] - if vertical
 * @property {Rect} [bottom] - if vertical
 */
/**
 * Split gap's bounding rect in 2 parts - either vertically or horizontally,
 * depending on best fit
 * @param {Rect} boundingRect
 * @param {Number} choiceWidth
 * @param {Number} choiceHeight
 * @returns {SplitInTwoResult}
 */
function splitRectInTwo(boundingRect, choiceWidth, choiceHeight) {
    const verticalSplitFactor = getRectFitFactor(
        boundingRect.width,
        boundingRect.height,
        choiceWidth,
        choiceHeight * 2
    );
    const horizontalSplitFactor = getRectFitFactor(
        boundingRect.width,
        boundingRect.height,
        choiceWidth * 2,
        choiceHeight
    );
    const horizontal = horizontalSplitFactor > verticalSplitFactor;

    if (horizontal) {
        const left = {
            x: boundingRect.x,
            y: boundingRect.y,
            width: boundingRect.width / 2,
            height: boundingRect.height,
            anchorX: 'right',
            anchorY: 'center'
        };
        const right = {
            x: boundingRect.x + left.width,
            y: boundingRect.y,
            width: boundingRect.width / 2,
            height: boundingRect.height,
            anchorX: 'left',
            anchorY: 'center'
        };
        return { horizontal, right, left };
    } else {
        const top = {
            x: boundingRect.x,
            y: boundingRect.y,
            width: boundingRect.width,
            height: boundingRect.height / 2,
            anchorX: 'center',
            anchorY: 'bottom'
        };
        const bottom = {
            x: boundingRect.x,
            y: boundingRect.y + top.height,
            width: boundingRect.width,
            height: boundingRect.height / 2,
            anchorX: 'center',
            anchorY: 'top'
        };
        return { horizontal, top, bottom };
    }
}

/**
 * @typedef SplitInStackedResult
 * @property {Boolean} horizontal - prefer 'more horizontal' placement of choices, if not all 4 parts will be filled
 * @property {Rect} bottomLeft - it will contain latest answer, without stacking
 * @property {Rect} [top] - if horizontal - row which will be stacked
 * @property {Rect} [right] - if vertical - column which will be stacked
 */
/**
 * Split gap's bounding rect in 2 parts - either vertically or horizontally,
 * depending on best fit
 * @param {Rect} boundingRect
 * @param {Number} choiceWidth
 * @param {Number} choiceHeight
 * @returns {SplitInStackedResult}
 */
function splitRectInStacked(boundingRect, choiceWidth, choiceHeight) {
    //the goal of making it depend on choice aspect ratio is so that each stacked answers will get a bit more 'square' space
    const horizontal = getRoundedAspectRatio(choiceWidth, choiceHeight) > 1;
    if (horizontal) {
        const top = {
            x: boundingRect.x,
            y: boundingRect.y,
            width: boundingRect.width,
            height: boundingRect.height / 2,
            anchorY: 'bottom'
        };
        const bottomLeft = {
            x: boundingRect.x,
            y: boundingRect.y + boundingRect.height / 2,
            width: boundingRect.width / 2,
            height: boundingRect.height / 2,
            anchorX: 'right',
            anchorY: 'top'
        };
        return { horizontal, bottomLeft, top };
    } else {
        const right = {
            x: boundingRect.x + boundingRect.width / 2,
            y: boundingRect.y,
            width: boundingRect.width / 2,
            height: boundingRect.height,
            anchorX: 'left'
        };
        const bottomLeft = {
            x: boundingRect.x,
            y: boundingRect.y + boundingRect.height / 2,
            width: boundingRect.width / 2,
            height: boundingRect.height / 2,
            anchorX: 'right',
            anchorY: 'top'
        };
        return { horizontal, bottomLeft, right };
    }
}

/**
 * Fit one rect (item) inside another (container) and calculate how well it fits.
 * Return this 'how well it fits' as a numeric value
 * @param {Number} containerWidth
 * @param {Number} containerHeight
 * @param {Number} itemWidth
 * @param {Number} itemHeight
 * @returns {Number} fitFactor - the biggest of return values means the best fit
 */
function getRectFitFactor(containerWidth, containerHeight, itemWidth, itemHeight) {
    const containerRatio = getRoundedAspectRatio(containerWidth, containerHeight);
    const itemRatio = getRoundedAspectRatio(itemWidth, itemHeight);
    let fitWidth;
    let fitHeight;
    if (itemRatio > containerRatio) {
        fitWidth = containerWidth;
        fitHeight = fitWidth / itemRatio;
    } else {
        fitHeight = containerHeight;
        fitWidth = fitHeight * itemRatio;
    }
    const fitArea = Math.floor(fitWidth * fitHeight); //try not to change orientation because of some fractions
    return fitArea;
}

/**
 * Get size of answer placed to certain rect (part):
 * Scale to fit, while restricting to minimum size
 * @param {Object} options - An object containing the following properties:
 *   - {Object} part - { width: Number, height: Number }
 *   - {Number} choiceWidth
 *   - {Number} choiceHeight
 *   - {Number} answerMinSize
 *   - {Number} [outerBorderSize]
 *   - {Number} [choiceBorderSize]
 *   - {Boolean} allowChoiceResize
 * @returns {Object} size - { width: Number, height: Number }
 */
function getAnswerSize(options) {
    const { answerMinSize, allowChoiceResize, choiceBorderSize = 0 } = options;
    // outerBorderSize: because gap (part) includes thick-white-border in its size, but choice not, their sizes and aspect ratios don't correlate well
    // this is more noticeable in case of hidden gaps (.qti-unselected-hidden)
    // to smoothen the effect, make answer's thick-white-border go outside bounds of gap (part)
    const { choiceWidth, choiceHeight, partWidth, partHeight } = getDimensions(options);
    const fitScalingFactor = calculateScalingFactor(
        choiceWidth,
        choiceHeight,
        partWidth,
        partHeight,
        null
    );
    const scaledChoiceWidth = choiceWidth * fitScalingFactor;
    const scaledChoiceHeight = choiceHeight * fitScalingFactor;
    // we need to apply the scaling factor to the pure scalable area without the borders and add it back after calculation if allowChoiceResize is true
    const width = allowChoiceResize ? scaledChoiceWidth + choiceBorderSize * 2 : scaledChoiceWidth;
    const height = allowChoiceResize ? scaledChoiceHeight + choiceBorderSize * 2 : scaledChoiceHeight;
    const answerSize = ensureMinSize(width, height, answerMinSize);
    return answerSize;
}

/**
 * Get dimensions of the choice which goint to be placed to certain rect (part):
 * @param {Object} options - An object containing the following properties:
 *   - {Object} part - { width: Number, height: Number }
 *   - {Number} choiceWidth
 *   - {Number} choiceHeight
 *   - {Number} [outerBorderSize]
 *   - {Number} [choiceBorderSize]
 *   - {Boolean} allowChoiceResize
 * @returns {Object} size - { width: Number, height: Number }
 */
function getDimensions(options) {
    const {
        part,
        choiceWidth,
        choiceHeight,
        outerBorderSize = 0,
        choiceBorderSize = 0,
        allowChoiceResize
    } = options;
    if (allowChoiceResize) {
        // to make scaling factor more accurate we need to subtract choice border size and calculate only scalable area
        return {
            choiceWidth: choiceWidth - choiceBorderSize * 2,
            choiceHeight: choiceHeight - choiceBorderSize * 2,
            partWidth: part.width - 2 * outerBorderSize, // we need to decrease the dimensions of the gap to fill in the choice with the newely created border,
            partHeight: part.height - 2 * outerBorderSize
        };
    }
    return {
        choiceWidth,
        choiceHeight,
        partWidth: part.width + outerBorderSize,
        partHeight: part.height + outerBorderSize
    };
}

/**
 * Align 'x' coord of answer with 'x' coord of rect (part) to which it is placed
 * @param {Number} partX
 * @param {Number} partWidth
 * @param {Number} answerWidth
 * @param {String} anchor - 'top'/'bottom'/'left'/'right'/'center'
 * @returns {Number} x
 */
function getAnchoredX(partX, partWidth, answerWidth, anchor) {
    switch (anchor) {
        case 'left': {
            return partX;
        }
        case 'right': {
            return partX + partWidth - answerWidth;
        }
        default: {
            //center
            return partX + partWidth / 2 - answerWidth / 2;
        }
    }
}

/**
 * Align 'y' coord of answer with 'y' coord of rect (part) to which it is placed
 * @param {Number} partY
 * @param {Number} partHeight
 * @param {Number} answerHeight
 * @param {String} anchor - 'top'/'bottom'/'left'/'right'/'center'
 * @returns {Number} y
 */
function getAnchoredY(partY, partHeight, answerHeight, anchor) {
    switch (anchor) {
        case 'top': {
            return partY;
        }
        case 'bottom': {
            return partY + partHeight - answerHeight;
        }
        default: {
            //center
            return partY + partHeight / 2 - answerHeight / 2;
        }
    }
}

/**
 * Get aspect ratio:
 * for 'square' shapes (like circle), layout can jump between horizontal and vertical because of some fraction digits in width or height,
 * so let's make it a bit more definite
 * @param {Number} width
 * @param {Number} height
 * @returns {Number} aspectRatio
 */
function getRoundedAspectRatio(width, height) {
    return Math.floor(width) / Math.floor(height);
}
