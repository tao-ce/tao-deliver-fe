// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { modelHelperFactory } from '../model.js';

const itemRef = 'item-1';
const getSampleComments = () => [
    {
        itemRef,
        responseId: 'resp-1',
        colorKey: 'c1',
        commentValue: 'hello here',
        highlighterModel: { foo1: 'bar1' }
    },
    {
        itemRef,
        responseId: 'resp-1',
        colorKey: 'c2',
        commentValue: 'hello there',
        highlighterModel: { foo11: 'bar11', foo2: 'bar2' }
    },
    {
        itemRef,
        responseId: 'resp-2',
        colorKey: 'c3',
        commentValue: 'bye here',
        highlighterModel: { foo3: 'bar3' }
    }
];
const getAllSampleCommentsModel = () => ({
    responses: {
        'resp-1': {
            comments: { c1: 'hello here', c2: 'hello there' },
            highlights: { foo11: 'bar11', foo2: 'bar2' }
        },
        'resp-2': {
            comments: { c3: 'bye here' },
            highlights: { foo3: 'bar3' }
        }
    }
});
const getItemData = model => ({
    extraData: {
        scoring: {
            comments: {
                inline: { ...model }
            }
        }
    }
});

describe('modelHelperFactory', () => {
    it('exposes API', () => {
        const f = modelHelperFactory();
        expect(f).toBeTypeOf('object');
        expect(f.addComment).toBeTypeOf('function');
        expect(f.updateComment).toBeTypeOf('function');
        expect(f.deleteComment).toBeTypeOf('function');
        expect(f.getCommentValue).toBeTypeOf('function');
        expect(f.getHighlights).toBeTypeOf('function');
        expect(f.persistChanges).toBeTypeOf('function');
        expect(f.setLocalCopyFromItemData).toBeTypeOf('function');
    });

    it('addComment', () => {
        const sampleComments = getSampleComments();
        const f = modelHelperFactory();
        f.setLocalCopyFromItemData({ itemRef, itemData: {} });

        //without persisting
        let model = f.addComment(sampleComments[0]);
        model = f.addComment(sampleComments[1]);
        model = f.addComment(sampleComments[2]);
        expect(model).toEqual({
            responses: {
                'resp-2': {
                    comments: { c3: 'bye here' },
                    highlights: { foo3: 'bar3' }
                }
            }
        });

        //with persisting
        model = f.addComment(sampleComments[0]);
        f.persistChanges({ itemRef, model });
        model = f.addComment(sampleComments[1]);
        f.persistChanges({ itemRef, model });
        model = f.addComment(sampleComments[2]);
        expect(model).toEqual({
            responses: {
                'resp-1': {
                    comments: { c1: 'hello here', c2: 'hello there' },
                    highlights: { foo11: 'bar11', foo2: 'bar2' }
                },
                'resp-2': {
                    comments: { c3: 'bye here' },
                    highlights: { foo3: 'bar3' }
                }
            }
        });
    });

    it('updateComment', () => {
        const sampleComments = getSampleComments();
        const f = modelHelperFactory();
        f.setLocalCopyFromItemData({ itemRef, itemData: getItemData(getAllSampleCommentsModel()) });

        let model = f.updateComment({
            ...sampleComments[1],
            commentValue: 'this is updated',
            highlighterModel: { upfoo: 'upbar' }
        });
        //only text is can be updated, not highlights
        expect(model).toEqual({
            responses: {
                'resp-1': {
                    comments: { c1: 'hello here', c2: 'this is updated' },
                    highlights: { foo11: 'bar11', foo2: 'bar2' }
                },
                'resp-2': {
                    comments: { c3: 'bye here' },
                    highlights: { foo3: 'bar3' }
                }
            }
        });
        model = f.updateComment({
            ...sampleComments[0],
            commentValue: 'that was updated',
            highlighterModel: { upfoo2: 'upbar2' }
        });
        //previous was not persisted
        expect(model).toEqual({
            responses: {
                'resp-1': {
                    comments: { c1: 'that was updated', c2: 'hello there' },
                    highlights: { foo11: 'bar11', foo2: 'bar2' }
                },
                'resp-2': {
                    comments: { c3: 'bye here' },
                    highlights: { foo3: 'bar3' }
                }
            }
        });
    });

    it('deleteComment', () => {
        const sampleComments = getSampleComments();
        const f = modelHelperFactory();
        f.setLocalCopyFromItemData({ itemRef, itemData: getItemData(getAllSampleCommentsModel()) });

        let model = f.deleteComment({
            ...sampleComments[1],
            highlighterModel: { delfoo: 'delbar' }
        });
        //only text is can be updated, not highlights
        expect(model).toEqual({
            responses: {
                'resp-1': {
                    comments: { c1: 'hello here' },
                    highlights: { delfoo: 'delbar' }
                },
                'resp-2': {
                    comments: { c3: 'bye here' },
                    highlights: { foo3: 'bar3' }
                }
            }
        });
        model = f.deleteComment({
            ...sampleComments[2],
            highlighterModel: { delfoo2: 'delbar2' }
        });
        //previous deletion was not persisted
        expect(model).toEqual({
            responses: {
                'resp-1': {
                    comments: { c1: 'hello here', c2: 'hello there' },
                    highlights: { foo11: 'bar11', foo2: 'bar2' }
                }
            }
        });
        //now with persist
        model = f.deleteComment({
            ...sampleComments[1],
            highlighterModel: { delfoo: 'delbar' }
        });
        f.persistChanges({ itemRef, model });
        model = f.deleteComment({
            ...sampleComments[2],
            highlighterModel: { delfoo2: 'delbar2' }
        });
        f.persistChanges({ itemRef, model });
        expect(model).toEqual({
            responses: {
                'resp-1': {
                    comments: { c1: 'hello here' },
                    highlights: { delfoo: 'delbar' }
                }
            }
        });
        //delete last one
        model = f.deleteComment({
            ...sampleComments[0],
            highlighterModel: { delfoo3: 'delbar3' }
        });
        expect(model).toEqual({});
    });

    it('getCommentValue & getHighlights', () => {
        const f = modelHelperFactory();
        f.setLocalCopyFromItemData({ itemRef, itemData: getItemData(getAllSampleCommentsModel()) });

        expect(f.getCommentValue({ itemRef, responseId: 'resp-1', colorKey: 'c2' })).toBe('hello there');
        expect(f.getCommentValue({ itemRef, responseId: 'resp-1', colorKey: 'c22' })).toBe(void 0);

        expect(f.getHighlights({ itemRef, responseId: 'resp-1' })).toEqual({ foo11: 'bar11', foo2: 'bar2' });
        expect(f.getHighlights({ itemRef, responseId: 'resp-11' })).toBe(null);

        //empty
        const h2 = modelHelperFactory();
        h2.setLocalCopyFromItemData({ itemRef, itemData: {} });
        expect(h2.getCommentValue({ itemRef, responseId: 'resp-1', colorKey: 'c2' })).toBe(null);
        expect(h2.getHighlights({ itemRef, responseId: 'resp-1', colorKey: 'c2' })).toBe(null);
    });

    it('setLocalCopyFromItemData', () => {
        const f = modelHelperFactory();

        //one item
        f.setLocalCopyFromItemData({
            itemRef,
            itemData: getItemData({
                responses: {
                    'resp-2': {
                        comments: { c3: 'bye here' },
                        highlights: { foo3: 'bar3' }
                    }
                }
            })
        });
        expect(f.getCommentValue({ itemRef, responseId: 'resp-2', colorKey: 'c3' })).toBe('bye here');

        //another item
        f.setLocalCopyFromItemData({
            itemRef: 'item-2',
            itemData: getItemData({
                responses: {
                    'resp-1': {
                        comments: { c1: 'hello here', c2: 'hello there' },
                        highlights: { foo11: 'bar11', foo2: 'bar2' }
                    }
                }
            })
        });
        expect(f.getCommentValue({ itemRef: 'item-2', responseId: 'resp-1', colorKey: 'c1' })).toBe('hello here');

        //set again for first item - will keep local copy
        f.setLocalCopyFromItemData({
            itemRef,
            itemData: getItemData({
                responses: {
                    'resp-2': {
                        comments: { c4: 'welcome!' },
                        highlights: { foo4: 'bar4' }
                    }
                }
            })
        });
        expect(f.getCommentValue({ itemRef, responseId: 'resp-2', colorKey: 'c3' })).toBe('bye here');
    });
});
