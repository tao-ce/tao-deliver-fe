// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Tests the functionality of the exported helper methods in sharedVocabulary.js
 */
import {
    areas,
    areaStrings,
    getAreasOrder,
    getOrientation,
    getPositioning,
    horizontalPositions,
    isHorizontalPosition,
    isRevertedPosition,
    isVerticalPosition,
    orderedAreas,
    orientations,
    orientationStrings,
    positions,
    positionStrings,
    revertedAreas,
    revertedPositions,
    verticalPositions
} from '../sharedVocabulary.js';

describe('sharedVocabulary API', () => {
    it('has expected API', () => {
        expect(typeof getOrientation).toEqual('function');
        expect(typeof getPositioning).toEqual('function');
        expect(typeof isVerticalPosition).toEqual('function');
        expect(typeof isHorizontalPosition).toEqual('function');
        expect(typeof isRevertedPosition).toEqual('function');
        expect(typeof getAreasOrder).toEqual('function');
        expect(typeof orientations).toEqual('object');
        expect(typeof positions).toEqual('object');
        expect(typeof areas).toEqual('object');
    });
});

describe('attributes: orientations', () => {
    it('is an enumeration of orientations', () => {
        expect(orientations.horizontal).toEqual('horizontal');
        expect(orientations.vertical).toEqual('vertical');
    });
});

describe('attributes: orientationStrings', () => {
    it('is a list of orientations', () => {
        expect(orientationStrings).toEqual(['horizontal', 'vertical']);
    });
});

describe('attributes: positions', () => {
    it('is an enumeration of positions', () => {
        expect(positions.top).toEqual('top');
        expect(positions.left).toEqual('left');
        expect(positions.bottom).toEqual('bottom');
        expect(positions.right).toEqual('right');
    });
});

describe('attributes: positionStrings', () => {
    it('is a list of positions', () => {
        expect(positionStrings).toEqual(['top', 'left', 'bottom', 'right']);
    });
});

describe('attributes: areas', () => {
    it('is an enumeration of areas', () => {
        expect(areas.choices).toEqual('choices');
        expect(areas.answers).toEqual('answers');
    });
});

describe('attributes: areaStrings', () => {
    it('is a list of positions', () => {
        expect(areaStrings).toEqual(['choices', 'answers']);
    });
});

describe('attributes: verticalPositions', () => {
    it('is a list of positions', () => {
        expect(verticalPositions).toEqual(['top', 'bottom']);
    });
});

describe('attributes: horizontalPositions', () => {
    it('is a list of positions', () => {
        expect(horizontalPositions).toEqual(['left', 'right']);
    });
});

describe('attributes: revertedPositions', () => {
    it('is a list of positions', () => {
        expect(revertedPositions).toEqual(['right', 'bottom']);
    });
});

describe('attributes: orderedAreas', () => {
    it('is a list of areas', () => {
        expect(orderedAreas).toEqual(['choices', 'answers']);
    });
});

describe('attributes: revertedAreas', () => {
    it('is a list of areas', () => {
        expect(revertedAreas).toEqual(['answers', 'choices']);
    });
});

describe('attributes: getOrientation', () => {
    it('returns with the default orientation if classes are empty', () => {
        expect(getOrientation('')).toEqual('vertical');
    });

    it('returns with the default orientation when specified', () => {
        expect(getOrientation('', 'horizontal')).toEqual('horizontal');
    });

    it('returns with the defined orientation', () => {
        expect(getOrientation('qti-orientation-vertical', 'horizontal')).toEqual('vertical');
        expect(getOrientation('qti-orientation-horizontal')).toEqual('horizontal');
        expect(getOrientation('qti-orientation-inline')).toEqual('vertical');
    });

    it('returns with the defined orientation among others', () => {
        expect(getOrientation('qti-interaction qti-choices-top qti-orientation-vertical')).toEqual('vertical');
        expect(getOrientation('qti-interaction qti-choices-top qti-orientation-horizontal')).toEqual('horizontal');
    });

    it('prefers horizontal over vertical when both are given', () => {
        expect(getOrientation('qti-orientation-vertical qti-orientation-horizontal')).toEqual('horizontal');
    });
});

describe('attributes: getPositioning', () => {
    it('returns with the default position if classes are empty', () => {
        expect(getPositioning('')).toEqual('left');
    });

    it('returns with the default position when specified', () => {
        expect(getPositioning('', 'top')).toEqual('top');
    });

    it('returns with the defined position', () => {
        expect(getPositioning('qti-choices-right', 'top')).toEqual('right');
        expect(getPositioning('qti-choices-bottom')).toEqual('bottom');
    });

    it('returns with the defined position among others', () => {
        expect(getPositioning('qti-choices qti-choices-top qti-direction-bottom')).toEqual('top');
        expect(getPositioning('qti-choices qti-choices-left qti-direction-right')).toEqual('left');
    });

    it('returns with the default position if a wrong class is set', () => {
        expect(getPositioning('qti-choices-straight')).toEqual('left');
        expect(getPositioning('qti-choices-straight', 'right')).toEqual('right');
    });

    it('prefers top over bottom when both are given', () => {
        expect(getPositioning('qti-choices-top qti-choices-bottom')).toEqual('top');
    });

    it('prefers left over right when both are given', () => {
        expect(getPositioning('qti-choices-left qti-choices-right')).toEqual('left');
    });

    it('prefers top over left when both are given', () => {
        expect(getPositioning('qti-choices-left qti-choices-top')).toEqual('top');
    });

    it('prefers bottom over right when both are given', () => {
        expect(getPositioning('qti-choices-right qti-choices-bottom')).toEqual('bottom');
    });
});

describe('attributes: isVerticalPosition', () => {
    it('returns true for vertical positions', () => {
        expect(isVerticalPosition('top')).toBeTruthy();
        expect(isVerticalPosition('bottom')).toBeTruthy();
    });
    it('returns false for horizontal positions', () => {
        expect(isVerticalPosition('left')).toBeFalsy();
        expect(isVerticalPosition('right')).toBeFalsy();
    });
});

describe('attributes: isHorizontalPosition', () => {
    it('returns false for vertical positions', () => {
        expect(isHorizontalPosition('top')).toBeFalsy();
        expect(isHorizontalPosition('bottom')).toBeFalsy();
    });
    it('returns true for horizontal positions', () => {
        expect(isHorizontalPosition('left')).toBeTruthy();
        expect(isHorizontalPosition('right')).toBeTruthy();
    });
});

describe('attributes: isRevertedPosition', () => {
    it('returns false for classical positions', () => {
        expect(isRevertedPosition('top')).toBeFalsy();
        expect(isRevertedPosition('left')).toBeFalsy();
    });
    it('returns true for reverted positions', () => {
        expect(isRevertedPosition('right')).toBeTruthy();
        expect(isRevertedPosition('bottom')).toBeTruthy();
    });
});

describe('attributes: getAreasOrder', () => {
    it('returns ordered positions', () => {
        expect(getAreasOrder('top')).toEqual(orderedAreas);
        expect(getAreasOrder('left')).toEqual(orderedAreas);
    });
    it('returns reverted positions', () => {
        expect(getAreasOrder('right')).toEqual(revertedAreas);
        expect(getAreasOrder('bottom')).toEqual(revertedAreas);
    });
});
