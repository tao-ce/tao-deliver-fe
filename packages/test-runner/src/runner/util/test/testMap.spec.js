// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../../testsStateStore.js');

import {
    deepGetItemProperty,
    updateAttempt,
    itemPathForPosition,
    getItemProperty,
    updateItemProperty,
    updateStats,
    buildStats,
    calculateTotalScore,
    getItemByIdentifier,
    isItemWaitingForExternalScore,
    getAllItems
} from '../testMap.js';
import _ from 'lodash';
import inaccurateStatsTestMap from './testMapMocks/inaccurateStats.json';

describe('deepGetItemProperty', () => {
    it('is a function', () => {
        expect(typeof deepGetItemProperty).toBe('function');
    });

    it('returns correct value if property exists on item', () => {
        const property = 'foo';
        const currentItem = { foo: true };
        const result = deepGetItemProperty(property, currentItem);
        expect(result).toBe(true);
    });

    it('returns correct value if property exists on section', () => {
        const property = 'foo';
        const currentItem = {};
        const testSection = { foo: true };
        const result = deepGetItemProperty(property, currentItem, testSection);
        expect(result).toBe(true);
    });

    it('returns correct value if property exists on part', () => {
        const property = 'foo';
        const currentItem = {};
        const testSection = {};
        const testPart = { foo: true };
        const result = deepGetItemProperty(property, currentItem, testSection, testPart);
        expect(result).toBe(true);
    });

    it('returns correct value if property default is defined as true', () => {
        const property = 'foo';
        const currentItem = {};
        const testSection = {};
        const testPart = {};
        const options = { default: true };
        const result = deepGetItemProperty(property, currentItem, testSection, testPart, options);
        expect(result).toBe(true);
    });

    it('returns correct value if property default is defined as false', () => {
        const property = 'foo';
        const currentItem = {};
        const testSection = {};
        const testPart = {};
        const options = { default: false };
        const result = deepGetItemProperty(property, currentItem, testSection, testPart, options);
        expect(result).toBe(false);
    });

    it('returns highest priority value if property exists at multiple levels', () => {
        const property = 'foo';
        const currentItem = { foo: false };
        const testSection = { foo: true };
        const testPart = { foo: true };
        const result = deepGetItemProperty(property, currentItem, testSection, testPart);
        expect(result).toBe(false);
    });

    it('returns false if no property found', () => {
        const property = 'foo';
        const currentItem = {};
        const testSection = {};
        const testPart = {};
        const options = {};
        const result = deepGetItemProperty(property, currentItem, testSection, testPart, options);
        expect(result).toBe(false);
    });

    it('returns false if nothing to search in', () => {
        const property = 'foo';
        const result = deepGetItemProperty(property);
        expect(result).toBe(false);
    });

    it('throws error if no parameters', () => {
        expect(() => deepGetItemProperty()).toThrow(TypeError);
    });
});

describe('updateAttempt', () => {
    it('is a function', () => {
        expect(typeof updateAttempt).toBe('function');
    });

    const testMap = Object.freeze({
        stats: {
            answered: 0
        },
        parts: {
            p1: {
                sections: {
                    s1: {
                        items: {
                            'item-1': {}
                        },
                        stats: {
                            answered: 0
                        }
                    }
                },
                stats: {
                    answered: 0
                }
            }
        }
    });
    const section = {
        id: 's1'
    };
    const testPart = {
        id: 'p1'
    };

    it('updates all testMap stats if answered true', () => {
        const item = {
            id: 'item-1',
            answered: true
        };
        const result = updateAttempt(Object.assign({}, testMap), testPart, section, item);
        expect(result).toMatchSnapshot();
    });

    it('does not update testMap stats if answered was already true', () => {
        const item = {
            id: 'item-1',
            answered: true
        };
        const testMapNoUpdate = {
            stats: {
                answered: 0
            },
            parts: {
                p1: {
                    sections: {
                        s1: {
                            items: {
                                'item-1': { answered: true }
                            },
                            stats: {
                                answered: 1
                            }
                        }
                    },
                    stats: {
                        answered: 1
                    }
                }
            }
        };
        const result = updateAttempt(testMapNoUpdate, testPart, section, item);
        expect(result).toMatchSnapshot();
    });

    it('updates all testMap stats if answered false', () => {
        const item = {
            id: 'item-1',
            answered: false
        };
        const testMapUpdate = {
            stats: {
                answered: 0
            },
            parts: {
                p1: {
                    sections: {
                        s1: {
                            items: {
                                'item-1': { answered: true }
                            },
                            stats: {
                                answered: 1
                            }
                        }
                    },
                    stats: {
                        answered: 1
                    }
                }
            }
        };
        const result = updateAttempt(testMapUpdate, testPart, section, item);
        expect(result).toMatchSnapshot();
    });

    it('does not update testMap stats if answered was already false', () => {
        const item = {
            id: 'item-1',
            answered: false
        };
        const result = updateAttempt(Object.assign({}, testMap), testPart, section, item);
        expect(result).toMatchSnapshot();
    });

    it('updates nothing if item values missing', () => {
        const item = {};
        const result = updateAttempt(Object.assign({}, testMap), testPart, section, item);
        expect(result).toStrictEqual(testMap);
    });
});

describe('itemPathForPosition', () => {
    const testMap = {
        parts: {
            part1: {
                sections: {
                    section1: {
                        items: {
                            item1: { position: 0 },
                            item2: { position: 1 }
                        }
                    }
                }
            },
            part2: {
                sections: {
                    section2: {
                        items: {
                            item3: { position: 2 }
                        }
                    },
                    section3: {
                        items: {
                            item4: { position: 3 }
                        }
                    }
                }
            }
        }
    };

    it('throws if no testMap', () => {
        expect(() => {
            itemPathForPosition(null);
        }).toThrow();
    });

    it('returns itemId, sectionId, testPartId for this position', () => {
        expect(itemPathForPosition(testMap, 0)).toStrictEqual({
            itemId: 'item1',
            sectionId: 'section1',
            testPartId: 'part1'
        });
        expect(itemPathForPosition(testMap, 1)).toStrictEqual({
            itemId: 'item2',
            sectionId: 'section1',
            testPartId: 'part1'
        });
        expect(itemPathForPosition(testMap, 2)).toStrictEqual({
            itemId: 'item3',
            sectionId: 'section2',
            testPartId: 'part2'
        });
        expect(itemPathForPosition(testMap, 3)).toStrictEqual({
            itemId: 'item4',
            sectionId: 'section3',
            testPartId: 'part2'
        });
    });

    it('returns empty object if position not found', () => {
        expect(itemPathForPosition(testMap, 5)).toStrictEqual({});
    });
});

describe('getItemProperty', () => {
    test.each([
        ['foo', 'foo', 'foo', 'foo', null],
        ['testPartId', 'foo', 'foo', 'foo', null],
        ['testPartId', 'sectionId', 'foo', 'foo', null],
        ['testPartId', 'sectionId', 'itemId', 'foo', void 0],
        ['testPartId', 'sectionId', 'itemId', 'someProperty', 2]
    ])('it should get property correctly', (testPartId, sectionId, itemId, property, expected) => {
        const testMap = {
            parts: {
                testPartId: {
                    sections: {
                        sectionId: {
                            items: {
                                itemId: {
                                    someProperty: 2
                                }
                            }
                        }
                    }
                }
            }
        };
        expect(getItemProperty(testMap, testPartId, sectionId, itemId, property)).toBe(expected);
    });

    it('should throw error if property is not a string', () => {
        expect(() => getItemProperty()).toThrowError('A property key of string type is mandatory');
    });
});

describe('updateItemProperty', () => {
    const getTestMap = () => ({
        parts: {
            part1: {
                id: 'part1',
                sections: {
                    section1: {
                        id: 'section1',
                        items: {
                            item1: {
                                id: 'item1',
                                someProp: 'oldVal'
                            },
                            item2: {
                                id: 'item2',
                                someProp: 'oldVal',
                                otherProp: 'oldVal'
                            }
                        }
                    }
                }
            }
        }
    });

    it('throws if no property', () => {
        expect(() => {
            updateItemProperty(getTestMap(), 'part1', 'section1', 'item1', '', 'newVal');
        }).toThrow();
    });

    it('does not throw if no testMap or testPartId or sectionId or itemId', () => {
        expect(() => {
            updateItemProperty(null, 'part1', 'section1', 'item1', 'someProp', 'newVal');
        }).not.toThrow();
        expect(() => {
            updateItemProperty(getTestMap(), 'x', 'section1', 'item1', 'someProp', 'newVal');
        }).not.toThrow();
        expect(() => {
            updateItemProperty(getTestMap(), 'part1', 'x', 'item1', 'someProp', 'newVal');
        }).not.toThrow();
        expect(() => {
            updateItemProperty(getTestMap(), 'part1', 'section1', 'x', 'someProp', 'newVal');
        }).not.toThrow();
    });

    it('sets new property of item, and returns mutated testMap', () => {
        const testMap = getTestMap();
        const updated = updateItemProperty(testMap, 'part1', 'section1', 'item2', 'aNewProp', 'aNewVal');
        expect(updated === testMap).toBe(true);
        expect(testMap).toStrictEqual({
            parts: {
                part1: {
                    id: 'part1',
                    sections: {
                        section1: {
                            id: 'section1',
                            items: {
                                item1: {
                                    id: 'item1',
                                    someProp: 'oldVal'
                                },
                                item2: {
                                    id: 'item2',
                                    someProp: 'oldVal',
                                    otherProp: 'oldVal',
                                    aNewProp: 'aNewVal'
                                }
                            }
                        }
                    }
                }
            }
        });
    });

    it('updates property of item, and returns mutated testMap', () => {
        const testMap = getTestMap();
        const updated = updateItemProperty(testMap, 'part1', 'section1', 'item2', 'someProp', 'newVal');
        expect(updated === testMap).toBe(true);
        expect(testMap).toStrictEqual({
            parts: {
                part1: {
                    id: 'part1',
                    sections: {
                        section1: {
                            id: 'section1',
                            items: {
                                item1: {
                                    id: 'item1',
                                    someProp: 'oldVal'
                                },
                                item2: {
                                    id: 'item2',
                                    someProp: 'newVal',
                                    otherProp: 'oldVal'
                                }
                            }
                        }
                    }
                }
            }
        });
    });
});

describe('updateStats', () => {
    const getTestMap = () => ({
        parts: {
            part1: {
                id: 'part1',
                sections: {
                    section1: {
                        id: 'section1',
                        items: {},
                        stats: {
                            someStats: 1
                        }
                    }
                },
                stats: {
                    someStats: 1
                }
            }
        },
        stats: {
            someStats: 1
        }
    });

    it('throws if no property', () => {
        expect(() => {
            updateStats(getTestMap(), 'part1', 'section1', '', true);
        }).toThrow();
    });

    it('does not throw if no testMap or testPartId or sectionId', () => {
        expect(() => {
            updateStats(null, 'part1', 'section1', 'someStats', true);
        }).not.toThrow();
        expect(() => {
            updateStats(getTestMap(), 'x', 'section1', 'someStats', true);
        }).not.toThrow();
        expect(() => {
            updateStats(getTestMap(), 'part1', 'x', 'someStats', true);
        }).not.toThrow();
    });

    it('updates stats, and returns mutated testMap', () => {
        const testMap = getTestMap();
        const updated = updateStats(testMap, 'part1', 'section1', 'someStats', true);
        expect(updated === testMap).toBe(true);
        expect(testMap).toStrictEqual({
            parts: {
                part1: {
                    id: 'part1',
                    sections: {
                        section1: {
                            id: 'section1',
                            items: {},
                            stats: {
                                someStats: 2
                            }
                        }
                    },
                    stats: {
                        someStats: 2
                    }
                }
            },
            stats: {
                someStats: 2
            }
        });

        updateStats(testMap, 'part1', 'section1', 'someStats', false);
        updateStats(testMap, 'part1', 'section1', 'someStats', false);
        expect(testMap).toStrictEqual({
            parts: {
                part1: {
                    id: 'part1',
                    sections: {
                        section1: {
                            id: 'section1',
                            items: {},
                            stats: {
                                someStats: 0
                            }
                        }
                    },
                    stats: {
                        someStats: 0
                    }
                }
            },
            stats: {
                someStats: 0
            }
        });
    });
});

describe('buildStats', () => {
    test.each([
        [null],
        [{}],
        [{ parts: {} }],
        [{ parts: { part1: { sections: { section1: { items: { item1: {} } } } } } }]
    ])('it does not throw if no testMap', testMap => {
        expect(() => {
            buildStats(testMap);
        }).not.toThrow();
    });

    it('updates stats, and returns mutated testMap', () => {
        const testMap = _.cloneDeep(inaccurateStatsTestMap);
        const updated = buildStats(testMap);
        expect(updated === testMap).toBe(true);
        expect(testMap).toMatchSnapshot();
    });
});

describe('getItemByIdentifier', () => {
    it('returns with item', () => {
        const id = 'item1';
        const item = { id };
        const testMap = {
            parts: {
                part1: {
                    sections: {
                        section1: {
                            items: {
                                [id]: item
                            }
                        }
                    }
                }
            }
        };

        expect(getItemByIdentifier(testMap, id)).toBe(item);
    });

    it('returs with null and do not fail if testMap is empty', () => {
        expect(getItemByIdentifier({}, 'foo')).toBe(null);
    });

    it('returs with null and do not fail if itemIdentifier is not defined', () => {
        expect(getItemByIdentifier({})).toBe(null);
    });

    it('returs with null if item is not in testMap', () => {
        const testMap = {
            parts: {
                part1: {
                    sections: {
                        section1: {
                            items: {
                                item1: {}
                            }
                        }
                    }
                }
            }
        };
        expect(getItemByIdentifier(testMap, 'foo')).toBe(null);
    });
});

describe('calculateTotalScore', () => {
    // other items have score: 3, maxScore: 4
    test.each([
        [0, 0, { totalScore: 3, totalMaxScore: 4 }],
        [1, 2, { totalScore: 4, totalMaxScore: 6 }],
        [void 0, void 0, { totalScore: 3, totalMaxScore: 4 }],
        [null, null, { totalScore: 3, totalMaxScore: 4 }],
        [1, null, { totalScore: 3, totalMaxScore: 4 }],
        [1.5, 2.5, { totalScore: 4.5, totalMaxScore: 6.5 }]
    ])('calculates total score correctly (score: %s, maxScore: %s)', (score, maxScore, totalScore) => {
        const testMap = {
            parts: {
                part1: {
                    sections: {
                        section1: {
                            items: {
                                item1: {
                                    score,
                                    maxScore
                                },
                                item2: {
                                    score: 2,
                                    maxScore: 2
                                }
                            }
                        }
                    }
                },
                part2: {
                    sections: {
                        section2: {
                            items: {
                                item3: {
                                    score: 1,
                                    maxScore: 2
                                }
                            }
                        }
                    }
                }
            }
        };

        expect(calculateTotalScore(testMap)).toMatchObject(totalScore);
    });

    // other items have score: 0.7, maxScore: 1.0
    test.each([
        [0, 1.5, { totalScore: 0.7, totalMaxScore: 2.5 }],
        [0.2, 1.0, { totalScore: 0.9, totalMaxScore: 2 }],
        [0.3, 1.0, { totalScore: 1, totalMaxScore: 2 }]
    ])(
        'calculates total score from floats, applying rounding (score: %s, maxScore: %s)',
        (score, maxScore, totalScore) => {
            const testMap = {
                parts: {
                    part1: {
                        sections: {
                            section1: {
                                items: {
                                    item1: {
                                        score,
                                        maxScore
                                    },
                                    item2: {
                                        score: 0.7,
                                        maxScore: 1.0
                                    }
                                }
                            }
                        }
                    }
                }
            };

            expect(calculateTotalScore(testMap)).toMatchObject(totalScore);
        }
    );
});

describe('isItemWaitingForExternalScore', () => {
    it('returns true when item meets condition', () => {
        expect(isItemWaitingForExternalScore({ externalScored: true, score: null, maxScore: 5 })).toBe(true);
    });

    it('returns false otheriwse', () => {
        expect(isItemWaitingForExternalScore({ externalScored: true, score: 5, maxScore: 5 })).toBe(false);
        expect(isItemWaitingForExternalScore({ externalScored: true, score: 0, maxScore: 5 })).toBe(false);
        expect(isItemWaitingForExternalScore({ externalScored: true, score: null, maxScore: 0 })).toBe(false);
        expect(isItemWaitingForExternalScore({ externalScored: true, score: null, maxScore: null })).toBe(false);
        expect(isItemWaitingForExternalScore({ externalScored: true })).toBe(false);
        expect(isItemWaitingForExternalScore({ externalScored: false, score: 5, maxScore: 5 })).toBe(false);
        expect(isItemWaitingForExternalScore({ score: 0, maxScore: 5 })).toBe(false);
        expect(isItemWaitingForExternalScore({})).toBe(false);
    });
});

describe('getAllItems', () => {
    it('returns empty array if testMap is empty', () => {
        expect(getAllItems({})).toEqual([]);
    });

    it('gets all items from a complex testMap', () => {
        const testMap = {
            parts: {
                part1: {
                    sections: {
                        section1: {
                            items: {
                                item1: { position: 0 },
                                item2: { position: 1 }
                            }
                        }
                    }
                },
                part2: {
                    sections: {
                        section2: {
                            items: {
                                item3: { position: 2 }
                            }
                        },
                        section3: {
                            items: {
                                item4: { position: 3 }
                            }
                        }
                    }
                }
            }
        };
        expect(getAllItems(testMap)).toEqual([{ position: 0 }, { position: 1 }, { position: 2 }, { position: 3 }]);
    });
});
