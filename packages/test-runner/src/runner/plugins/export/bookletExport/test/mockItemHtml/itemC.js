// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export default `
<img src="http://xxx.yy/mysrc.jpg">
<div>
    <style>
        .bg1 {
            background: url("http://xxx.yy/mybackground1.jpg");
        }
        .bg2 {
            background: url('http://xxx.yy/mybackground2.jpg'), linear-gradient(to bottom, red, green),url("http://xxx.yy/mybackground3.jpg");
        }
    </style>
    <span class="bg1">
        <span class="bg2">
            Background-1
            <img src="http://xxx.yy/othersrc.png">
        </span>
        <p>Background-2</p>
    </span>
    <p>Background-3</p>
</div>
<div>
    <svg><image href="http://xxx.yy/mysvg.jpg"></image></svg>
    <p>Svg-1</p>
</div>
<img src="data:image/png;base64,abcd">
<img>

<figure class="wrap-left">
    <img src="http://xxx.yy/wrap-left_mock-getComputedStyle-size.png">
</figure>
<figure class="wrap-right">
    <img src="http://xxx.yy/wrap-right.png">
</figure>
<figure>
    <img src="http://xxx.yy/mock-getComputedStyle-size.png">
</figure>
`;
