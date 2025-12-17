// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export default `
Non-content elements
<style>.main {color: red;} :root{--main-color: red}</style>
<link rel="stylesheet" href="main.css">
<script>alert('hello');</script>

Svg not supported
<svg viewBox="0 0 16 16"><path d="M7.7-.13l2 8z"></path></svg>

Media elements
<audio><source src="./hello.mp3" type="audio/mpeg"></audio>
<video><source src="./hello.mp4" type="video/mp4"></video>
<div class="grid-row">
    <div class="col-12">
        <div class="qti-interaction qti-blockInteraction qti-mediaInteraction pause svelte-fu7sdo" data-qti-class="mediaInteraction">
            <div class="qti-prompt ui-heading-l cf svelte-108wmin">
                <p>Media interaction</p>
                <p></p>
            </div>
            <div class="player svelte-1qext2t" aria-labelledby="tao-feedback-26k8d2ki">Media player</div>
            <p></p>
        </div>
    </div>
</div>

Attributes
<a href="#there">Bookmark-link</a>
<a href="#">Hashtag-link</a>
<a href="blob:http://localhost:8020/7112c716-af6d-478d-9799-de5e2a731b25">Blob-link</a>
<a href="http://localhost:8020/7112c716-af6d-478d-9799-de5e2a731b25">Http-link</a>
<a href="">Empty-attr-link</a>
<a>No-attr-link</a>
<div id="mydiv" class="myclass thatclass" tabindex="0">Attributes div</div>
<p aria-role="applicaion" data-hello="hello" onclick="alert('hello')">Attributes p</p>

Hidden content
<div class="grid-row">
    <style>.hideme{display:none}</style>
    <div class="col-12">
        <div class="qti-interaction qti-someInteraction">
            Some QTI interaction
            <p class="hideme">Hidden paragraph 1</p>
            <p style="display: none;">Hidden paragraph 2</p>
            <p class="vidually-hidden">Visually-hidden paragraph</p>
            <p aria-hidden="true">Aria-hidden paragraph</p>
        </div>
        <div>
            Static block
            <p class="hideme">Hidden paragraph 1</p>
            <p style="display: none;">Hidden paragraph 2</p>
            <p class="vidually-hidden">Visually-hidden paragraph</p>
            <p aria-hidden="true">Aria-hidden paragraph</p>
        </div>
        <div class="qti-interaction qti-customInteraction">
            Some PCI
            <p class="hideme">Hidden paragraph 1</p>
            <p style="display: none;">Hidden paragraph 2</p>
            <p class="vidually-hidden">Visually-hidden paragraph</p>
            <p aria-hidden="true">Aria-hidden paragraph</p>
        </div>
    </div>
</div>
 `;