// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { breakpoints } from '@oat-sa-private/ui-identity';
import { calculateScalingFactor, getUsableHeight } from '../../util/scaling.js';

/**
 * Helper object that is responsible for calculating interaction layout.
 * Sizes need to be calculated in proper order, as they depend on each other:
 * 0 - constraints: container max height -> is horizontal -> bay (choice list) max size
 * 1 - choice size
 * 2 - bay (choice list) size
 * 3 - image size
 * @param {Object[]} choices - passed in constructor, because we do NOT want to react to its change: we don't want to recalculate when some answer is removed
 * @param {Object} designConstants - a set of numeric constants
 * @param {Number} designConstants.choiceGap - gap between choices in choice-area
 * @param {Number} designConstants.choiceScrollPadding - padding on 'scrollbar' side of choice-area, so user has anchor for touch-scroll
 * @param {Number} designConstants.choiceAreaPadding - padding on 3 other sides of choice-area, so selected/targeted/focused choices don't go outside container
 * @param {Number} designConstants.choiceAreaBottomMargin - margin on bottom of answer area, only for vertical layout; it's used in css too
 * @param {Number} designConstants.choiceAreaMaxPortion - how much of container's size can choice-area take at most (e.g. 1/3)
 * @param {Number} designConstants.choiceMaxSizeMobile - for choice in choice-area, max size on smaller side, on small screens
 * @param {Number} designConstants.choiceMaxSizeDesktop - for choice in choice-area, max size on smaller side, on big screens
 * @param {Number} designConstants.choiceMinSize - for choice in choice-area, min size on smaller side
 * @param {Number} designConstants.choiceBorderSize - shared with Choice.svelte
 * @returns {Object}
 */
export default function sizingHelperFactory(
    choices,
    {
        choiceGap,
        choiceScrollPadding,
        choiceAreaPadding,
        choiceAreaBottomMargin,
        choiceAreaMaxPortion,
        choiceMaxSizeMobile,
        choiceMaxSizeDesktop,
        choiceMinSize,
        choiceBorderSize
    }
) {
    /**
     * Get sizes of bay (choice list)
     * @param {Number} choicesCount
     * @param {Object} options
     * @param {Boolean} options.isHorizontal
     * @param {Number} options.choiceWidth
     * @param {Number} options.choiceHeight
     * @param {Number} options.bayMaxWidth
     * @param {Number} options.bayMaxHeight
     * @param {Number} options.containerWidth
     * @returns {Object} baySize - {bayColumns: Number, bayWidth: Number, bayHeight: Number, bayScrollHeight: Number}
     */
    function getBaySize(
        choicesCount,
        { isHorizontal, choiceWidth, choiceHeight, bayMaxWidth, bayMaxHeight, containerWidth }
    ) {
        const totalHorizontalPadding = choiceScrollPadding + choiceAreaPadding;
        const totalVerticalPadding = 2 * choiceAreaPadding;
        const columnsMaxWidth = bayMaxWidth - totalHorizontalPadding;
        const rowsMaxHeight = bayMaxHeight - totalVerticalPadding;

        const maxColumns = Math.floor((columnsMaxWidth + choiceGap) / (choiceWidth + choiceGap)); //how many columns can fit? [N*choiceWidth + (N-1)*choiceGap <= columnsMaxWidth]
        const maxRows = Math.floor((rowsMaxHeight + choiceGap) / (choiceHeight + choiceGap)); //how many rows can fit?
        const desiredColumns = isHorizontal ? Math.ceil(choicesCount / Math.max(maxRows, 1)) : choicesCount; //how many columns we need?
        const bayColumns = Math.max(Math.min(maxColumns, desiredColumns), 1);
        const bayRows = Math.ceil(choicesCount / bayColumns);

        const bayWidth = Math.floor(
            isHorizontal
                ? bayColumns * choiceWidth + (bayColumns - 1) * choiceGap + totalHorizontalPadding
                : containerWidth
        );
        const bayScrollHeight = Math.floor(bayRows * choiceHeight + (bayRows - 1) * choiceGap + totalVerticalPadding);
        const bayHeight = Math.floor(isHorizontal ? bayMaxHeight : Math.min(bayMaxHeight, bayScrollHeight));
        return { bayColumns, bayWidth, bayHeight, bayScrollHeight };
    }

    return {
        /**
         * Get max height that can be used by interaction
         * @param {Number} windowHeight
         * @returns {Number} containreMaxHeight
         */
        getContainerMaxHeight(windowHeight) {
            return getUsableHeight(windowHeight);
        },
        /**
         * Get orientation of choices relative to image: horizontal is choices on left, vertical is choices on top
         * @param {Boolean} [isHorizontalFromClasses] - orientation set by item author, if any
         * @param {Object} options
         * @param {Number} options.containerMaxHeight
         * @param {Number} options.containerWidth
         * @returns {Boolean} isHorizontal
         */
        getIsHorizontal(isHorizontalFromClasses, { containerMaxHeight, containerWidth }) {
            const isContainerHorizontal = containerMaxHeight < containerWidth;
            if (isContainerHorizontal) {
                return isHorizontalFromClasses === null ? true : isHorizontalFromClasses;
            }
            return false; //force vertical for portrait orientation
        },
        /**
         * Get max width/height that can be used by bay (choice list)
         * @param {Object} options
         * @param {Boolean} options.isHorizontal
         * @param {Number} options.containerMaxHeight
         * @param {Number} options.containerWidth
         * @returns {Object} bayMaxSize - {bayMaxWidth: Number, bayMaxHeight: Number}
         */
        getBayMaxSize({ isHorizontal, containerWidth, containerMaxHeight }) {
            const bayMaxWidth = isHorizontal ? containerWidth * choiceAreaMaxPortion : containerWidth;
            const bayMaxHeight = isHorizontal
                ? containerMaxHeight
                : (containerMaxHeight - choiceAreaBottomMargin) * choiceAreaMaxPortion;
            return { bayMaxWidth, bayMaxHeight };
        },
        /**
         * Get width/height of choice in choice area. All choices will have the same size.
         * @param {Object} options
         * @param {Boolean} options.isHorizontal
         * @param {Number} options.containerWidth
         * @param {Number} options.bayMaxWidth
         * @param {Number} options.bayMaxHeight
         * @returns {Object} choiceSize - {choiceWidth: Number, choiceHeight: Number}
         */
        getChoiceSize({ isHorizontal, containerWidth, bayMaxWidth, bayMaxHeight }) {
            if (!choices.length) {
                return { choiceWidth: 0, choiceHeight: 0 };
            }

            let choiceWidth;
            let choiceHeight;
            const choiceMaxSizeOnSmallerSide =
                (containerWidth < breakpoints.width.huge ? choiceMaxSizeMobile : choiceMaxSizeDesktop) -
                2 * choiceBorderSize; //this and other constraints include border size, but image size (from 'choices') doesn't
            const choiceAspectRatios = choices.map(choice => {
                const ratio = choice.width && choice.height ? choice.width / choice.height : 1;
                return ratio;
            });
            //avgAspectRatio should probably be 'Geometric mean' instead of 'Arithmetic mean' (with arithmetic, horizontal choices overpower vertical ones)
            const avgAspectRatio =
                choiceAspectRatios.reduce((sum, ratio) => sum + ratio, 0) / choiceAspectRatios.length;
            const maxImageWidth = Math.max(...choices.map(choice => choice.width || choiceMaxSizeOnSmallerSide));
            const maxImageHeight = Math.max(...choices.map(choice => choice.height || choiceMaxSizeOnSmallerSide));
            let maxImageSizeOnSmallerSide;
            if (avgAspectRatio > 1) {
                maxImageSizeOnSmallerSide = Math.max(maxImageHeight, maxImageWidth / avgAspectRatio);
            } else {
                maxImageSizeOnSmallerSide = Math.max(maxImageWidth, maxImageHeight * avgAspectRatio);
            }
            const sizeOnSmallerSide = Math.max(
                choiceMinSize - 2 * choiceBorderSize,
                Math.min(maxImageSizeOnSmallerSide, choiceMaxSizeOnSmallerSide)
            );

            if (isHorizontal) {
                const maxWidth = bayMaxWidth - choiceScrollPadding - choiceAreaPadding - 2 * choiceBorderSize;
                const minWidth = avgAspectRatio > 1 ? sizeOnSmallerSide * avgAspectRatio : sizeOnSmallerSide;
                choiceWidth = Math.min(minWidth, maxWidth);
                choiceHeight = choiceWidth / avgAspectRatio;
            } else {
                //bay can have vertical scroll, so we can allow choice not to fit if bay has extremely small height
                const maxHeight = Math.max(bayMaxHeight - choiceAreaPadding * 2, choiceMinSize) - 2 * choiceBorderSize;
                const minHeight = avgAspectRatio < 1 ? sizeOnSmallerSide / avgAspectRatio : sizeOnSmallerSide;
                choiceHeight = Math.min(minHeight, maxHeight);
                choiceWidth = choiceHeight * avgAspectRatio;
            }
            choiceWidth = choiceWidth + 2 * choiceBorderSize;
            choiceHeight = choiceHeight + 2 * choiceBorderSize;
            return { choiceWidth, choiceHeight };
        },
        /**
         * Get width/height of bay (choice list) scroll container, and number of columns in it
         * @param {Object} sizes
         * @param {Boolean} sizes.isHorizontal
         * @param {Number} sizes.choiceWidth
         * @param {Number} sizes.choiceHeight
         * @param {Number} sizes.bayMaxWidth
         * @param {Number} sizes.bayMaxHeight
         * @param {Number} sizes.containerWidth
         * @returns {Object} baySize - {bayColumns: Number, bayWidth: Number, bayHeight: Number}
         */
        getBayContainerSize(sizes) {
            const { bayColumns, bayWidth, bayHeight } = getBaySize(choices.length, sizes);
            return { bayColumns, bayWidth, bayHeight };
        },
        /**
         * Get scroll height of content of bay (choice list)
         * @param {Object[]} freeChoices - choices that are still in choice-area
         * @param {Object} sizes
         * @param {Boolean} sizes.isHorizontal
         * @param {Number} sizes.choiceWidth
         * @param {Number} sizes.choiceHeight
         * @param {Number} sizes.bayMaxWidth
         * @param {Number} sizes.bayMaxHeight
         * @param {Number} sizes.containerWidth
         * @returns {Number} bayScrollHeight
         */
        getBayScrollHeight(freeChoices, sizes) {
            const { bayScrollHeight } = getBaySize(freeChoices.length, sizes);
            return bayScrollHeight;
        },
        /**
         * Get scalingFactor/width/height of background image
         * @param {Object} imgObject - background image of interaction
         * @param {Object} options
         * @param {Boolean} options.isHorizontal
         * @param {Number} options.containerWidth
         * @param {Number} options.containerMaxHeight
         * @param {Number} options.bayWidth
         * @param {Number} options.bayHeight
         * @returns {Object} imageSize - {imgScalingFactor: Number, imgWidth: Number, imgHeight: Number}
         */
        getImageSize(imgObject, { isHorizontal, bayWidth, bayHeight, containerWidth, containerMaxHeight }) {
            let imageContainerWidth;
            let imageContainerHeight;
            if (isHorizontal) {
                imageContainerWidth = containerWidth - bayWidth;
                imageContainerHeight = containerMaxHeight;
            } else {
                imageContainerHeight = containerMaxHeight - bayHeight;
                imageContainerWidth = containerWidth;
            }
            const imgScalingFactor = calculateScalingFactor(
                imgObject.width,
                imgObject.height,
                imageContainerWidth,
                imageContainerHeight
            );
            const imgWidth = imgScalingFactor * imgObject.width;
            const imgHeight = imgScalingFactor * imgObject.height;
            return { imgScalingFactor, imgWidth, imgHeight };
        },
        /**
         * Get x coordinate of choice in choice-area
         * @param {Number} i - index of choice among all free choices
         * @param {Number} bayColumns
         * @param {Number} choiceWidth
         * @returns {Number} x
         */
        getChoiceX(i, bayColumns, choiceWidth) {
            return choiceAreaPadding + (i % bayColumns) * (choiceWidth + choiceGap);
        },
        /**
         * Get y coordinate of choice in choice-area
         * @param {Number} i - index of choice among all free choices
         * @param {Number} bayColumns
         * @param {Number} choiceHeight
         * @returns {Number} y
         */
        getChoiceY(i, bayColumns, choiceHeight) {
            return choiceAreaPadding + Math.floor(i / bayColumns) * (choiceHeight + choiceGap);
        }
    };
}
