// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { reRankHeadings } from '../heading.js';

describe('ReRank', () => {
    it('rerank from h1', () => {
        const container = document.createElement('div');
        container.innerHTML = '<h1>1</h1><h2>2</h2><h3>3</h3><h4>4</h4><h5>5</h5><h6>6</h6>';
        reRankHeadings(container);
        expect(container).toMatchSnapshot();
    });

    it('rerank from h2', () => {
        const container = document.createElement('div');
        container.innerHTML = '<h2>2</h2><h3>3</h3><h4>4</h4><h5>5</h5><h6>6</h6>';
        reRankHeadings(container);
        expect(container).toMatchSnapshot();
    });

    it('does not rerank from h3', () => {
        const container = document.createElement('div');
        container.innerHTML = '<h3>3</h3><h4>4</h4><h5>5</h5><h6>6</h6>';
        reRankHeadings(container);
        expect(container).toMatchSnapshot();
    });

    it('rerank from h3 if configured', () => {
        const container = document.createElement('div');
        container.innerHTML = '<h3>3</h3><h4>4</h4><h5>5</h5><h6>6</h6>';
        reRankHeadings(container, 3);
        expect(container).toMatchSnapshot();
    });

    it('does not rerank from h3 if configured', () => {
        const container = document.createElement('div');
        container.innerHTML = '<h4>4</h4><h5>5</h5><h6>6</h6>';
        reRankHeadings(container, 3);
        expect(container).toMatchSnapshot();
    });

    it('rerank with missing level', () => {
        const container = document.createElement('div');
        container.innerHTML = '<h1>1</h1><h4>4</h4><h5>5</h5><h6>6</h6>';
        reRankHeadings(container);
        expect(container).toMatchSnapshot();
    });

    it('rerank with missing intermediary level', () => {
        const container = document.createElement('div');
        container.innerHTML = '<h2>2</h2><h3>3</h3><h5>5</h5><h6>6</h6>';
        reRankHeadings(container);
        expect(container).toMatchSnapshot();
    });
});
